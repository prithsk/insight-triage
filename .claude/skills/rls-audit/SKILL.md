---
name: rls-audit
version: 1.0.0
description: Audit the cumulative Supabase RLS policy state for holes. Run before any migration ships. (Kroix)
triggers:
  - audit rls
  - check the policies
  - is this table protected
  - review this migration
  - before I push migrations
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
---

# RLS audit

Kroix stores PHI: chest X-rays, triage scores, lab results, clinician sign-offs.
Row-level security behind an approval gate is the only thing between an open signup
and patient imaging. Signup is open to anyone.

Two P0 holes were found here in a single review, both invisible in the diff that
introduced them, both of which would have applied cleanly and reported success.

Run this before any migration reaches the database. Run it when adding a column to a
table that already has policies. Run it when anything touches `supabase/functions/`.

---

## The one rule that generates most of the others

**Audit the cumulative state, never the diff.** A migration that adds a correct
policy can be a no-op because of something written six months earlier in a different
file. Read every file in `supabase/migrations/` in timestamp order and track, per
table, which policies are live right now.

```bash
ls supabase/migrations/*.sql | sort
grep -c "CREATE POLICY" supabase/migrations/*.sql
```

Build the picture before judging any single change.

---

## Failure modes, each one observed in this repo

### 1. Permissive policies OR together

Postgres combines permissive policies with OR. A strict policy sitting beside an open
one grants the union, not the intersection. Adding `USING (is_approved_user())` next
to `USING (true)` changes nothing at all.

**Found here:** `embeddings` and `medical_literature` carried
`"Service role can manage" FOR ALL USING (true)`. A new approved-user SELECT policy
was added beside it and accomplished exactly nothing.

Check every table for a surviving `USING (true)`:

```bash
grep -B8 "USING (true)" supabase/migrations/*.sql | grep -E "CREATE POLICY|ON (public|storage)\.|USING \(true\)"
```

For each hit, confirm a later migration drops it by name. `DROP POLICY IF EXISTS`
matches on the exact policy name — a renamed policy is a different policy.

### 2. A policy with no `TO` clause applies to every role

`FOR ALL USING (true)` with no `TO` covers `anon` and `authenticated`, not just the
role the name implies. Policy names are comments; they enforce nothing.

```bash
grep -A4 "CREATE POLICY" supabase/migrations/*.sql | grep -L "TO authenticated\|TO service_role"
```

### 3. `service_role` never needs a policy

Supabase's `service_role` has `BYPASSRLS`. A "service role can manage" policy grants
it nothing it lacks, while granting everyone else everything. It is a hole wearing
the costume of documentation. Drop it.

### 4. `UPDATE` with `USING` but no `WITH CHECK`

For UPDATE, if `WITH CHECK` is omitted Postgres reuses `USING` as the row check. The
only invariant enforced by `USING (auth.uid() = user_id)` is that `user_id` stays put.
Every other column is writable.

**Found here, and it was the worst thing in the codebase:** `profiles` carried that
policy from January. July added `approved` and `role` to the same table and made
`is_approved_user()` the sole predicate behind every PHI policy. One `PATCH` request
self-granted admin and unlocked all patient data.

### 5. Privilege columns need a trigger, not a predicate

Any column that feeds an authorization function is a privilege column. Policy
predicates cannot reliably express "this column may not change" without subquerying
the same table under RLS. Use a `BEFORE UPDATE` trigger comparing `OLD` and `NEW`.

A trigger holds regardless of which policy permitted the write, so a future
permissive policy cannot silently reopen the hole. See
`20260728130000_prevent_profile_privilege_escalation.sql`.

### 6. Adding a column to a table with existing policies

This is the trap that produced failure mode 4. The migration adding the column looks
harmless in isolation. Ask every time: **does an existing policy now let a user write
this new column?**

### 7. RLS enabled without policies vs policies without RLS

- RLS on, no policy: denies all. Safe, possibly broken.
- Policies written, RLS never enabled: **wide open**, and the policies read as
  reassuring.

```bash
grep -rn "ENABLE ROW LEVEL SECURITY" supabase/migrations/*.sql
```

Cross-check that list against every table that has a `CREATE POLICY`.

### 8. `SECURITY DEFINER` functions

Must set `search_path` explicitly, or a caller-controlled path can redirect the
lookup. Kroix's helpers do this correctly (`SET search_path = public`) — keep it that
way.

### 9. Storage buckets are a separate surface

`storage.objects` policies are easy to forget because they live outside the table
list. Verify buckets are `public = false` and that every bucket has policies matching
the table gate.

### 10. Edge functions bypass all of it

Anything constructing a client with `SUPABASE_SERVICE_ROLE_KEY` operates with RLS
off. Confirm `requireApprovedUser` runs **before** the client is built, and that
caller input is validated before it reaches an RLS-bypassing connection.

---

## Procedure

1. **Inventory.** Every table with RLS enabled; every policy live on it after all
   migrations replay in order.
2. **Walk the ten failure modes above** against that inventory.
3. **Trace the auth predicate.** Follow `is_approved_user()` / `is_admin_user()` to
   the column they read, then ask who can write that column. This is what caught the
   escalation.
4. **Check the edge functions** for the service-role pattern.
5. **Report per table**: protected, or the specific hole with the exact request that
   exploits it.

## Verification

A fix is not verified because the SQL is correct. Confirm the deny actually happens:

```
# as a normal signed-in, unapproved account
PATCH /rest/v1/profiles?user_id=eq.<self>   {"approved": true}
→ expect 42501
GET   /rest/v1/embeddings
→ expect empty
```

Migrations here are written idempotent (`DROP POLICY IF EXISTS`,
`CREATE OR REPLACE FUNCTION`), so re-running is safe.

## Reporting

Say what an attacker can do and how, not that a policy "may be permissive." Quote the
policy. Name the request. If the answer is "nothing," say that plainly too — a clean
audit is a real result.

Never claim a hole is closed without having read the cumulative state that closes it.

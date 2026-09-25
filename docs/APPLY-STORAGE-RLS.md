# Paste prompt: scope the storage.objects policies to `authenticated`

Paste everything between the `=====` markers into Lovable as a single message.

**This is defense in depth, not an emergency.** Nothing below closes a live hole,
and the wording inside the paste block says so explicitly — do not let it get
escalated into an incident. Read "Why this is not urgent" before sending it, so
you can answer if Lovable asks.

The migration already exists in this repo as
`supabase/migrations/20260925120000_scope_storage_object_policies.sql`. It has
**not** been applied to the live database: the Supabase CLI on this machine is
authenticated to an account that cannot see project `bzwpksyghofjtyjfiqzf`.
Lovable manages that project and can run the SQL.

## Why this is not urgent

All seven live policies on `storage.objects` — three for the `dicom-files`
bucket, four for `documents` — were created with no `TO` clause. In Postgres a
policy with no `TO` clause applies to **every** role, `anon` included. That is the
same shape as the `embeddings` "Service role can manage" hole fixed in July, and
it is worth fixing for the same reason. But it is not the same severity, and the
difference is worth stating plainly rather than glossing:

Every one of the seven predicates ends in `public.is_approved_user()` or
`public.is_admin_user()`, and both helpers are

```sql
SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() ...)
```

For `anon` there is no JWT, so `auth.uid()` is NULL, `user_id = NULL` evaluates to
NULL for every row, `EXISTS` returns false, and the policy denies. The missing
`TO` clause changes *which roles get asked the question*, not the answer they
receive. An anonymous visitor cannot read a DICOM image today.

So why do it at all: `storage.objects` holds the actual chest X-rays, the most
sensitive data in the system, and the role scope is the only thing that would
still stand between `anon` and those images if a predicate were ever loosened.
The `profiles` privilege-escalation P0 in this project was built out of two
individually reasonable changes that only became a hole in combination. This is
the second line of defense that surface does not currently have.

The change is `TO authenticated` and nothing else. No predicate is widened.

---

=====

I need you to apply one pending SQL migration to my Supabase database.

**Please read this first: this is not an emergency and there is no live
vulnerability.** I do not want this escalated or "hotfixed". It is a hardening
change, and I am going to explain the reasoning so you can check it rather than
take my word for it.

## Background

My app is a radiology triage tool. It stores PHI, and the most sensitive thing in
it is the chest X-ray images themselves, which live in Supabase Storage in two
private buckets: `dicom-files` and `documents`.

Access to those buckets is controlled by seven row-level-security policies on
`storage.objects`. All seven were written without a `TO` clause. In Postgres, a
policy with no `TO` clause applies to every role, including the anonymous role
`anon`. Every other RLS policy in my schema says `TO authenticated`; these seven
were missed twice, in two earlier migrations that rewrote them.

## Why this is NOT currently exploitable

I want to be precise about this, because "RLS policy applies to anon" reads like
an emergency and this is not one.

Each of the seven predicates has the form:

```sql
bucket_id = '<bucket>' AND public.is_approved_user()
```

(or `public.is_admin_user()` for the two delete policies). Both helper functions
are defined as:

```sql
SELECT EXISTS (
  SELECT 1 FROM public.profiles
  WHERE user_id = auth.uid() AND approved = true
);
```

An anonymous request carries no JWT, so `auth.uid()` returns NULL. `user_id =
NULL` evaluates to NULL for every row rather than true, `EXISTS` returns false,
and the policy denies. The missing `TO` clause widens which roles are *evaluated*
against the policy; it does not change the result for `anon`.

Please do not tell me this is a live PHI breach. It is not, and if your own
analysis disagrees with the reasoning above, show me exactly where it breaks
rather than just asserting it.

## Why I want it fixed anyway

`storage.objects` is the one PHI surface where the policy predicate is the *only*
line of defense. If someone later relaxes one of those predicates — the way a
harmless-looking `profiles` policy in this project combined with a later column
addition to produce a real privilege-escalation bug — the role scope is what
would still hold. Right now there is nothing behind the predicate. After this
there is.

## What I need you to do

Run the SQL block below exactly as written.

Please do not rewrite, reformat, simplify, or "improve" it. Each `USING` and
`WITH CHECK` expression is copied character-for-character from the migration that
currently defines these policies. **The only difference is the addition of
`TO authenticated`.** If you find yourself changing a predicate, stop — that is
not this change.

Three things in particular not to do:

1. **Do not add a `service_role` policy.** `service_role` has `BYPASSRLS` and
   already reaches these objects; such a policy grants it nothing, and without a
   `TO` clause it would open the table to everyone. That exact mistake is what
   the July migration in this project had to undo.
2. **Do not disable RLS on `storage.objects`** to make anything work.
3. **Do not widen any predicate.** If uploads or reads break after this, the
   cause is the `authenticated` scope being correct and something calling as the
   wrong role — tell me, do not loosen the policy.

```sql
-- ── STORAGE: dicom-files ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Approved users can upload DICOM files" ON storage.objects;
CREATE POLICY "Approved users can upload DICOM files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'dicom-files' AND public.is_approved_user());

DROP POLICY IF EXISTS "Approved users can view DICOM files" ON storage.objects;
CREATE POLICY "Approved users can view DICOM files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'dicom-files' AND public.is_approved_user());

DROP POLICY IF EXISTS "Admins can delete DICOM files" ON storage.objects;
CREATE POLICY "Admins can delete DICOM files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'dicom-files' AND public.is_admin_user());

-- ── STORAGE: documents ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Approved users can view document files" ON storage.objects;
CREATE POLICY "Approved users can view document files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND public.is_approved_user());

DROP POLICY IF EXISTS "Approved users can upload document files" ON storage.objects;
CREATE POLICY "Approved users can upload document files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND public.is_approved_user());

DROP POLICY IF EXISTS "Approved users can update document files" ON storage.objects;
CREATE POLICY "Approved users can update document files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND public.is_approved_user())
WITH CHECK (bucket_id = 'documents' AND public.is_approved_user());

DROP POLICY IF EXISTS "Admins can delete document files" ON storage.objects;
CREATE POLICY "Admins can delete document files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND public.is_admin_user());
```

## Verification — please run all four and paste me the full output

### 1. All seven policies, with their roles

```sql
SELECT policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
```

Expected: exactly these seven rows, and every one with `roles` = `{authenticated}`.

| policyname                               | roles             | cmd    |
| ---------------------------------------- | ----------------- | ------ |
| `Admins can delete DICOM files`          | `{authenticated}` | DELETE |
| `Admins can delete document files`       | `{authenticated}` | DELETE |
| `Approved users can update document files` | `{authenticated}` | UPDATE |
| `Approved users can upload DICOM files`  | `{authenticated}` | INSERT |
| `Approved users can upload document files` | `{authenticated}` | INSERT |
| `Approved users can view DICOM files`    | `{authenticated}` | SELECT |
| `Approved users can view document files` | `{authenticated}` | SELECT |

### 2. The offender query — this is the one that matters

```sql
SELECT policyname, roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND 'public' = ANY(roles);
```

**Expected: zero rows.** `{public}` is what `pg_policies` shows for a policy with
no `TO` clause. Any row here means that policy did not get scoped.

### 3. The predicates are unchanged

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;
```

Expected: every `qual` and `with_check` is still
`((bucket_id = '<bucket>'::text) AND is_approved_user())` or the `is_admin_user()`
equivalent, with `<bucket>` being `dicom-files` or `documents`. Postgres will have
normalised the formatting and added `::text` casts — that is fine. What must not
appear is a different function, a missing `AND`, a `true`, or a changed bucket
name.

### 4. RLS is still on

```sql
SELECT relrowsecurity, relforcerowsecurity
FROM pg_class
WHERE oid = 'storage.objects'::regclass;
```

Expected: `relrowsecurity` is `true`.

## Stop conditions — report back instead of proceeding

- **If any policy in query 2 still shows `{public}`, stop and tell me which
  ones.** Do not re-run, do not try a variant, do not work around it. A partially
  applied change here is worse than no change, because the repo and the test suite
  will both say it is done.
- **If query 1 returns fewer or more than seven rows**, stop and paste what it
  returned. An eighth policy means something created one outside this migration.
- **If any `DROP POLICY` or `CREATE POLICY` errors with a permissions or
  ownership message** on the `storage` schema, stop and tell me the exact error.
  Do not try to change ownership or grant yourself rights on `storage.objects`.
- **If a predicate in query 3 does not match**, stop. That means the SQL was
  altered somewhere between me and the database.
- **If image upload or the worklist breaks afterwards**, tell me and leave it
  broken. Do not widen a policy or disable RLS to restore it.

Please apply the migration now and paste the output of all four verification
queries.

=====

---

## After Lovable reports back

1. **Read query 2's output yourself.** Zero rows is the whole point of this
   exercise. "It ran successfully" is not the same fact — both prior P0s in this
   project looked applied.

2. **Check the predicates in query 3 against the migration file.** The only
   permitted difference from
   `supabase/migrations/20260925120000_scope_storage_object_policies.sql` is
   Postgres's own normalisation (`::text` casts, added parentheses, the
   `public.` prefix dropped). A different function name or a missing conjunct is
   a real difference.

3. **Confirm the app still works as an approved user.** Upload a study and open
   it in the Reviewer. `authenticated` is the role the client uses, so nothing
   should change — but the point of verifying is that "should" is not "did".

4. **Confirm anon still gets nothing.** Signed out, with only the anon key:

   ```
   GET /storage/v1/object/list/dicom-files
   ```

   Expect an empty list or a permission error, never file rows. This should have
   been true before the change as well — that is the claim this whole document
   rests on, and it is worth confirming once rather than assuming.

5. **`npm test`.** `supabase/rls.test.ts` now includes `storage.objects` in
   `PHI_TABLES`, so the TO-clause rule covers all seven. Removing
   `TO authenticated` from any of them fails the suite (mutation-tested
   2026-09-25).

Nothing in this document describes an exploitable condition, and the same SQL
ships in the committed migration, so unlike `docs/APPLY-SECURITY-FIX.md` this
file is not gitignored.

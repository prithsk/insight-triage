# Paste prompt: scope the profiles policies and add the missing WITH CHECK

Paste everything between the `=====` markers into Lovable as a single message.

**This is defence in depth, not an emergency.** A migration touching
`public.profiles` in this repo reads like an incident, because the project's one
real P0 lived there. This is not that. Read "Why this is not urgent" before
sending so you can answer if Lovable asks.

Companion to `docs/APPLY-STORAGE-RLS.md` — same class of fix, different table.
Either order is fine; they do not interact.

The migration exists in the repo as
`supabase/migrations/20260925130000_scope_profile_policies.sql` and has **not**
been applied. Lovable manages `bzwpksyghofjtyjfiqzf` and can run it.

## Why this is not urgent

Four live policies on `public.profiles` were created with no `TO` clause, so they
apply to every role including `anon`:

| Policy | Cmd | Predicate |
|---|---|---|
| Users can view their own profile | SELECT | `auth.uid() = user_id` |
| Users can insert their own profile | INSERT | `auth.uid() = user_id` |
| Admins can view all profiles | SELECT | `public.is_admin_user()` |
| Admins can update any profile | UPDATE | `public.is_admin_user()` |

None can be satisfied without a JWT. `auth.uid()` is NULL for `anon`, so
`auth.uid() = user_id` evaluates to NULL rather than true for every row, and
`is_admin_user()` runs `SELECT EXISTS (SELECT 1 FROM public.profiles WHERE
user_id = auth.uid() AND approved = true)`, false for the same reason. A row with
a NULL `user_id` would not help: `NULL = NULL` is NULL.

It is worth fixing because `profiles` is the table the P0 came from, and that P0
was assembled from two individually-reasonable changes — a January policy that
was fine alone, and a July column that was fine alone. An unscoped policy is one
predicate edit away from being the first half of the next pair.

## The one substantive change

`"Admins can update any profile"` is an UPDATE policy with `USING` and no
`WITH CHECK`. Postgres reuses `USING` as the row check in that case, so the only
invariant enforced is that the caller is still an admin — every column stays
writable. Today the `profiles_prevent_privilege_escalation` trigger backstops
this, and it remains the real enforcement. Adding `WITH CHECK` puts the intent in
the policy rather than only in the trigger.

---

=====

Please apply one pending SQL migration to my Supabase database. It is a
defence-in-depth hardening of the `public.profiles` row-level security policies.
**It does not close an open hole** — I have verified that none of the affected
policies can be satisfied by an unauthenticated caller today. Please do not treat
it as an incident.

## What is being changed and why

Four policies on `public.profiles` were created without a `TO` clause. In
Postgres, a policy with no `TO` clause applies to every role, including `anon`.
All four are nonetheless unsatisfiable without a JWT, because each depends on
`auth.uid()`, which is NULL for `anon`:

- `auth.uid() = user_id` evaluates to NULL, not true, for every row
- `public.is_admin_user()` is
  `SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND approved = true)`,
  which is false for the same reason

So this adds a second line of defence rather than closing a breach. It matters
because `profiles` gates every PHI policy in the schema through
`is_approved_user()` / `is_admin_user()`.

One policy also gains a `WITH CHECK`: `"Admins can update any profile"` is an
UPDATE policy with `USING` and no `WITH CHECK`, and Postgres reuses `USING` as
the row check in that case. The `profiles_prevent_privilege_escalation` trigger
already backstops this and stays exactly as it is; the `WITH CHECK` makes the
policy state its own intent.

## Please run this exactly as written

Do not rewrite, simplify, or reformat it. Every predicate below is copied
verbatim from the existing policies; the only additions are `TO authenticated`
and the one `WITH CHECK`.

```sql
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin_user());

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());
```

## After running it, please verify and report back

```sql
SELECT policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
```

Expected, for all five policies on the table (the four above plus
`"Users can update their own profile"`, which already carried `TO authenticated`):

- `roles` reads `{authenticated}` — **no policy should still read `{public}`**
- `"Admins can update any profile"` now has a non-null `with_check`
- no policy has a `qual` of `true`

Please also confirm the trigger is still present and was not disturbed:

```sql
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass AND NOT tgisinternal;
```

Expected: `profiles_prevent_privilege_escalation` and
`update_profiles_updated_at`.

## Stop conditions

- If any policy still shows `roles = {public}` after running, stop and tell me.
- If `profiles_prevent_privilege_escalation` is missing afterwards, stop and tell
  me immediately — that trigger is the real protection and nothing here should
  touch it.
- If profile editing or admin approval breaks in the app, tell me rather than
  reverting the trigger. The policies are meant to be recreated by this same
  block.
- Do not add a `service_role` policy to this or any table. `service_role` has
  `BYPASSRLS` and already reaches everything; such a policy grants it nothing
  and, without a `TO` clause, opens the table to everyone else.
- Do not disable RLS on any table to make something work.

=====

---

## After Lovable reports back

1. **Check the roles column yourself.** All five policies should read
   `{authenticated}`.
2. **Confirm the trigger survived** — it is the actual enforcement against
   privilege escalation, and the policies are only defence in depth around it.
3. **Re-run the escalation test** from a normal signed-in, unapproved account:
   `PATCH /rest/v1/profiles?user_id=eq.<self>` with `{"approved": true}` should
   still fail with `42501`.
4. **Run `npm test`.** `supabase/rls.test.ts` asserts these invariants statically
   and will fail if the migration file is later reverted. Note what that does and
   does not mean: a passing suite is evidence about the migration files in this
   repo, not about the live database.

## Not gitignored, deliberately

`docs/APPLY-SECURITY-FIX.md` and `docs/LOVABLE-PASTE.txt` are ignored because
they contain a working exploit for a hole that was live at the time. This file
describes no exploitable condition — its content is the reasoning for why `anon`
is already denied — and the identical SQL ships in the committed migration
regardless. Ignoring it would conceal nothing and lose the record of what was
pasted. Same choice as `docs/APPLY-STORAGE-RLS.md`.

-- Scope the four remaining public.profiles policies to `authenticated`,
-- and give the admin UPDATE policy the WITH CHECK it never had.
--
-- THIS IS DEFENCE IN DEPTH, NOT AN OPEN HOLE. Read that first, because a
-- migration touching `profiles` in this repo reads like an emergency and this
-- one is not.
--
-- Four policies survive with no TO clause, so they apply to every role
-- including `anon`:
--
--     "Users can view their own profile"    SELECT  USING (auth.uid() = user_id)
--     "Users can insert their own profile"  INSERT  WITH CHECK (auth.uid() = user_id)
--     "Admins can view all profiles"        SELECT  USING (public.is_admin_user())
--     "Admins can update any profile"       UPDATE  USING (public.is_admin_user())
--
-- None of them can be satisfied by `anon`. With no JWT, `auth.uid()` is NULL;
-- `auth.uid() = user_id` is NULL rather than true for every row, and
-- `is_admin_user()` runs `SELECT EXISTS (SELECT 1 FROM public.profiles WHERE
-- user_id = auth.uid() AND approved = true)`, which is false for the same
-- reason. A NULL user_id row would not help either, because NULL = NULL is
-- NULL. Verified against the function definitions in 20260718205751, and no
-- migration in this repo redefines anything in the `auth` schema.
--
-- WHY FIX IT ANYWAY. `profiles` is the table this project's P0 came from, and
-- that P0 was built out of two individually-reasonable changes: a January
-- policy that was fine on its own, and a July column that was fine on its own.
-- An unscoped policy is one future predicate edit away from being the first
-- half of the next pair. CLAUDE.md's rule — a policy with no TO clause applies
-- to every role — earns a second line of defence here more than anywhere.
--
-- THE ONE SUBSTANTIVE CHANGE: "Admins can update any profile" is an UPDATE
-- policy with USING and no WITH CHECK. Postgres reuses USING as the row check
-- in that case, so the only invariant enforced is that the caller remains an
-- admin — every column stays writable, including `approved` and `role`. Today
-- that is backstopped by the `profiles_prevent_privilege_escalation` trigger
-- (20260728130000), which fires regardless of which policy permitted the write
-- and is the real enforcement. The trigger stays; this adds the WITH CHECK the
-- policy should always have carried, so the intent is visible in the policy
-- rather than only in the trigger. See rls.test.ts, which deliberately exempts
-- this policy today — that exemption can go once this ships.
--
-- Predicates are otherwise preserved exactly. No predicate is widened. No
-- service_role policy is added: service_role has BYPASSRLS and such a policy
-- would grant it nothing while, without a TO clause, opening the table to
-- everyone.

-- ── Owner-scoped policies ────────────────────────────────────────────────
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

-- ── Admin policies ───────────────────────────────────────────────────────
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

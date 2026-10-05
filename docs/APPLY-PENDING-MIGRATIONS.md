# Paste prompt: apply the three pending migrations

Paste everything between the `=====` markers into Lovable as **one message**.

These three files are in the repo but **not applied to the live database**:

| Migration | What it does | Urgency |
|---|---|---|
| `20260925120000_scope_storage_object_policies.sql` | Scopes the 7 image-bucket policies to logged-in users | Defence in depth — not an open hole |
| `20260925130000_scope_profile_policies.sql` | Scopes 4 profile policies; adds the missing `WITH CHECK` | Defence in depth — not an open hole |
| `20261004120000_studies_reviewed_at.sql` | Adds `studies.reviewed_at`, set by the database when a study is read | Needed for real Analytics read times |

Why the first two are not emergencies is written up in `docs/APPLY-STORAGE-RLS.md` and
`docs/APPLY-PROFILES-RLS.md`. The third was behaviour-tested in real Postgres before
being committed: a client cannot forge or overwrite the read time, and archiving keeps it.

All three are idempotent (`DROP … IF EXISTS`, `CREATE OR REPLACE`, `ADD COLUMN IF NOT
EXISTS`), so running them twice, or after a partial earlier run, is safe.

---

=====

Please apply three SQL migrations to my Supabase database, **in this order, exactly as
written**. Do not rewrite, simplify, merge or reformat them. Two of them tighten
row-level security policies; they do NOT close an open hole — every affected policy
already denies anonymous users because it depends on `auth.uid()`, which is NULL
without a login. The third adds one column and one trigger.

## Migration 1 of 3 — 20260925120000_scope_storage_object_policies.sql

```sql
-- Defense in depth on storage.objects. This is NOT an emergency, and nothing
-- below closes a live hole. Read the next three paragraphs before treating it
-- as one.
--
-- A cumulative audit of this directory found that all seven live policies on
-- storage.objects — the three for the `dicom-files` bucket and the four for
-- `documents` — were created without a TO clause, so they apply to every role
-- including `anon`. Every other PHI policy in the schema says TO authenticated;
-- these were missed when 20260718000000 rewrote them and again when
-- 20260718205751 recreated them.
--
-- It is not currently exploitable. Each predicate is
--   bucket_id = '<bucket>' AND public.is_approved_user()   (or is_admin_user())
-- and both helpers are
--   SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() ...)
-- For `anon` there is no JWT, so auth.uid() is NULL, `user_id = NULL` evaluates
-- to NULL for every row, EXISTS returns false, and the policy denies. The
-- missing TO clause widens *which roles are asked* the question, not the
-- answer they get.
--
-- The reason to fix it anyway: storage.objects holds the actual DICOM chest
-- X-rays, the most sensitive data in this system, and it is the one PHI surface
-- where the role scope is the only thing standing between a future predicate
-- change and `anon`. The profiles privilege-escalation P0
-- (20260728130000) was likewise built out of two individually reasonable
-- changes that only became a hole when combined. A policy that is safe solely
-- because of how a helper function happens to behave has one line of defense.
-- After this it has two.
--
-- This migration adds `TO authenticated` and changes nothing else. Every USING
-- and WITH CHECK expression below is copied verbatim from
-- 20260718205751_ccd93dba-1d27-4869-8112-9d93165b8b83.sql. No predicate is
-- widened, narrowed, or reformatted.
--
-- No service_role policy is added. service_role has BYPASSRLS and reaches these
-- objects regardless; such a policy would grant it nothing and, without a TO
-- clause, would reopen the table to everyone — the exact mistake documented in
-- 20260728120000 and in CLAUDE.md.
--
-- RLS on storage.objects is enabled and owned by Supabase; this migration does
-- not touch it.

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

## Migration 2 of 3 — 20260925130000_scope_profile_policies.sql

```sql
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
```

## Migration 3 of 3 — 20261004120000_studies_reviewed_at.sql

```sql
-- Record WHEN a study was read, once, on the database's clock.
--
-- Analytics measures read time against each band's read-time target — the one
-- number Kroix exists to move. Until now it used `updated_at` on a REVIEWED row
-- as the read time. That was a proxy and labelled as one: any later edit to the
-- row moved it, archiving a reviewed study changed it, and the client sent the
-- value itself (`useStudies` passes `updated_at: new Date()` from the browser).
--
-- `reviewed_at` is set here, by a trigger, and only here:
--   * on the first transition INTO 'REVIEWED' it becomes now();
--   * after that it never changes — re-reviewing, archiving, or any other
--     update leaves it as it was;
--   * a value supplied by the client is ignored on every insert and update, so
--     the read time cannot be backdated or forged from the browser.
--
-- Existing REVIEWED rows are NOT backfilled. Their true read time is not known,
-- and filling it from `updated_at` would put the proxy back under a new name.
-- Analytics counts them separately as "reviewed before read times were
-- recorded" and excludes them from target attainment.
--
-- No policy changes. The trigger runs as the caller, needs no privilege, and is
-- not SECURITY DEFINER. Existing RLS on `studies` already governs who may update.

ALTER TABLE public.studies
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

COMMENT ON COLUMN public.studies.reviewed_at IS
  'When the study was first marked REVIEWED. Set by trg_studies_reviewed_at on the database clock; never written by clients, never changed after it is set.';

CREATE OR REPLACE FUNCTION public.set_studies_reviewed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- A row born REVIEWED (imports, admin scripts) is read at insert time.
    NEW.reviewed_at := CASE WHEN NEW.status = 'REVIEWED' THEN now() ELSE NULL END;
    RETURN NEW;
  END IF;

  -- UPDATE: whatever the client sent, start from the stored value.
  NEW.reviewed_at := OLD.reviewed_at;

  IF NEW.status = 'REVIEWED'
     AND OLD.status IS DISTINCT FROM 'REVIEWED'
     AND OLD.reviewed_at IS NULL THEN
    NEW.reviewed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studies_reviewed_at ON public.studies;

CREATE TRIGGER trg_studies_reviewed_at
  BEFORE INSERT OR UPDATE ON public.studies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_studies_reviewed_at();

CREATE INDEX IF NOT EXISTS studies_reviewed_at_idx
  ON public.studies (reviewed_at)
  WHERE reviewed_at IS NOT NULL;
```

## After running all three, run these checks and paste me the results

**1. No storage or profile policy may still apply to every role:**

```sql
SELECT schemaname, tablename, policyname, roles
FROM pg_policies
WHERE (schemaname = 'storage' AND tablename = 'objects')
   OR (schemaname = 'public'  AND tablename = 'profiles')
ORDER BY schemaname, tablename, policyname;
```

Expected: every row's `roles` is `{authenticated}`. **None** should read `{public}`.

**2. The admin profile policy now has a WITH CHECK:**

```sql
SELECT policyname, with_check FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
  AND policyname = 'Admins can update any profile';
```

Expected: `with_check` is not null.

**3. The privilege-escalation trigger is untouched:**

```sql
SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass AND NOT tgisinternal;
```

Expected: includes `profiles_prevent_privilege_escalation`.

**4. The read-time column and trigger exist:**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'studies' AND column_name = 'reviewed_at';

SELECT tgname FROM pg_trigger
WHERE tgrelid = 'public.studies'::regclass AND NOT tgisinternal;
```

Expected: one row, `timestamp with time zone`; triggers include `trg_studies_reviewed_at`.

## Stop conditions

- If any policy still shows `{public}` in roles, stop and tell me.
- If `profiles_prevent_privilege_escalation` is missing, stop immediately — it is the real
  protection and nothing here should touch it.
- Do not add a `service_role` policy to any table. `service_role` already bypasses RLS.
- Do not disable RLS on any table to make something work.
- Do not backfill `reviewed_at` from `updated_at`. Leaving old rows NULL is deliberate.
- After migration 3, regenerate the TypeScript types so `studies.reviewed_at` appears in
  `src/integrations/supabase/types.ts`.

=====

---

## After Lovable reports back

1. Check every `roles` value reads `{authenticated}`.
2. Sign in, open a study in the Reviewer, submit feedback. Then in the SQL editor:
   `SELECT id, status, reviewed_at FROM public.studies WHERE status = 'REVIEWED' ORDER BY reviewed_at DESC NULLS LAST LIMIT 3;`
   The one you just reviewed should have a `reviewed_at` within the last minute.
3. Open Analytics. Studies reviewed **before** this migration show as "reviewed before
   read times were recorded"; anything reviewed after shows real read times.
4. Pull the regenerated `types.ts` and run `npm test`.

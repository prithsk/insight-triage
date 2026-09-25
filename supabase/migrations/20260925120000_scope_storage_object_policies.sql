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

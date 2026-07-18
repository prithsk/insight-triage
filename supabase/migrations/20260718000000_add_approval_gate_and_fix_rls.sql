-- Security fix: close open PHI access.
-- Previously every authenticated user (signup is open to anyone) could read,
-- write, and delete every patient's studies/triage/labs/feedback/documents.
-- This adds an admin-approval gate and scopes destructive actions to admins,
-- while keeping the worklist genuinely shared across the approved clinical team.

-- ── Profiles: approval + role ───────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'radiologist'
    CHECK (role IN ('admin', 'radiologist'));

-- Seed the founding admin so the app isn't locked out. Safe no-op if the
-- account doesn't exist yet (e.g. fresh environments) — will need re-running
-- or a manual UPDATE once the account is created.
UPDATE public.profiles
SET approved = true, role = 'admin'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'supercurry300@gmail.com');

-- Helper: is the current user an approved, active clinical-team member?
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND approved = true
  );
$$;

-- Helper: is the current user an approved admin?
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND approved = true AND role = 'admin'
  );
$$;

-- Admins can view/update all profiles (needed to approve new signups)
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin_user());

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
USING (public.is_admin_user());

-- ── STUDIES ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view studies" ON public.studies;
DROP POLICY IF EXISTS "Authenticated users can insert studies" ON public.studies;
DROP POLICY IF EXISTS "Authenticated users can update studies" ON public.studies;
DROP POLICY IF EXISTS "Authenticated users can delete studies" ON public.studies;

CREATE POLICY "Approved users can view studies"
ON public.studies FOR SELECT TO authenticated USING (public.is_approved_user());

CREATE POLICY "Approved users can insert studies"
ON public.studies FOR INSERT TO authenticated WITH CHECK (public.is_approved_user());

CREATE POLICY "Approved users can update studies"
ON public.studies FOR UPDATE TO authenticated USING (public.is_approved_user());

CREATE POLICY "Admins can delete studies"
ON public.studies FOR DELETE TO authenticated USING (public.is_admin_user());

-- ── TRIAGE_RESULTS ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view triage results" ON public.triage_results;
DROP POLICY IF EXISTS "Authenticated users can insert triage results" ON public.triage_results;
DROP POLICY IF EXISTS "Authenticated users can delete triage results" ON public.triage_results;

CREATE POLICY "Approved users can view triage results"
ON public.triage_results FOR SELECT TO authenticated USING (public.is_approved_user());

CREATE POLICY "Approved users can insert triage results"
ON public.triage_results FOR INSERT TO authenticated WITH CHECK (public.is_approved_user());

CREATE POLICY "Admins can delete triage results"
ON public.triage_results FOR DELETE TO authenticated USING (public.is_admin_user());

-- ── LAB_RESULTS ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Authenticated users can insert lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Authenticated users can delete lab results" ON public.lab_results;

CREATE POLICY "Approved users can view lab results"
ON public.lab_results FOR SELECT TO authenticated USING (public.is_approved_user());

CREATE POLICY "Approved users can insert lab results"
ON public.lab_results FOR INSERT TO authenticated WITH CHECK (public.is_approved_user());

CREATE POLICY "Admins can delete lab results"
ON public.lab_results FOR DELETE TO authenticated USING (public.is_admin_user());

-- ── FEEDBACK_EVENTS ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view feedback" ON public.feedback_events;
DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON public.feedback_events;
DROP POLICY IF EXISTS "Authenticated users can delete feedback" ON public.feedback_events;

CREATE POLICY "Approved users can view feedback"
ON public.feedback_events FOR SELECT TO authenticated USING (public.is_approved_user());

CREATE POLICY "Approved users can insert feedback"
ON public.feedback_events FOR INSERT TO authenticated WITH CHECK (public.is_approved_user());

CREATE POLICY "Admins can delete feedback"
ON public.feedback_events FOR DELETE TO authenticated USING (public.is_admin_user());

-- ── DOCUMENTS ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON public.documents;
DROP POLICY IF EXISTS "Documents are readable" ON public.documents;
DROP POLICY IF EXISTS "Documents are insertable" ON public.documents;
DROP POLICY IF EXISTS "Documents are updatable" ON public.documents;
DROP POLICY IF EXISTS "Documents are deletable" ON public.documents;

CREATE POLICY "Approved users can view documents"
ON public.documents FOR SELECT TO authenticated USING (public.is_approved_user());

CREATE POLICY "Approved users can insert documents"
ON public.documents FOR INSERT TO authenticated WITH CHECK (public.is_approved_user());

CREATE POLICY "Approved users can update documents"
ON public.documents FOR UPDATE TO authenticated USING (public.is_approved_user());

CREATE POLICY "Admins can delete documents"
ON public.documents FOR DELETE TO authenticated USING (public.is_admin_user());

-- ── STORAGE: dicom-files ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can upload DICOM files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view DICOM files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their DICOM files" ON storage.objects;

CREATE POLICY "Approved users can upload DICOM files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dicom-files' AND public.is_approved_user());

CREATE POLICY "Approved users can view DICOM files"
ON storage.objects FOR SELECT
USING (bucket_id = 'dicom-files' AND public.is_approved_user());

CREATE POLICY "Admins can delete DICOM files"
ON storage.objects FOR DELETE
USING (bucket_id = 'dicom-files' AND public.is_admin_user());

UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/dicom', 'image/png', 'image/jpeg', 'image/webp', 'application/octet-stream']
WHERE id = 'dicom-files';

-- ── STORAGE: documents ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "Documents files are readable" ON storage.objects;
DROP POLICY IF EXISTS "Documents files are insertable" ON storage.objects;
DROP POLICY IF EXISTS "Documents files are updatable" ON storage.objects;
DROP POLICY IF EXISTS "Documents files are deletable" ON storage.objects;

CREATE POLICY "Approved users can view document files"
ON storage.objects FOR SELECT
USING (bucket_id = 'documents' AND public.is_approved_user());

CREATE POLICY "Approved users can upload document files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documents' AND public.is_approved_user());

CREATE POLICY "Approved users can update document files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'documents' AND public.is_approved_user())
WITH CHECK (bucket_id = 'documents' AND public.is_approved_user());

CREATE POLICY "Admins can delete document files"
ON storage.objects FOR DELETE
USING (bucket_id = 'documents' AND public.is_admin_user());

UPDATE storage.buckets
SET file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
WHERE id = 'documents';

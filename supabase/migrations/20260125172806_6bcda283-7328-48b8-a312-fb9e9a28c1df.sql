-- Drop overly permissive policies and replace with authenticated-only access

-- DOCUMENTS TABLE
DROP POLICY IF EXISTS "Authenticated users can manage documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;
DROP POLICY IF EXISTS "Documents are deletable" ON public.documents;
DROP POLICY IF EXISTS "Documents are insertable" ON public.documents;
DROP POLICY IF EXISTS "Documents are readable" ON public.documents;
DROP POLICY IF EXISTS "Documents are updatable" ON public.documents;

CREATE POLICY "Authenticated users can view documents"
ON public.documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update documents"
ON public.documents FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete documents"
ON public.documents FOR DELETE
TO authenticated
USING (true);

-- FEEDBACK_EVENTS TABLE
DROP POLICY IF EXISTS "Authenticated users can delete feedback" ON public.feedback_events;
DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON public.feedback_events;
DROP POLICY IF EXISTS "Authenticated users can view feedback" ON public.feedback_events;

CREATE POLICY "Authenticated users can view feedback"
ON public.feedback_events FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert feedback"
ON public.feedback_events FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete feedback"
ON public.feedback_events FOR DELETE
TO authenticated
USING (true);

-- LAB_RESULTS TABLE
DROP POLICY IF EXISTS "Authenticated users can delete lab_results" ON public.lab_results;
DROP POLICY IF EXISTS "Authenticated users can insert lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Authenticated users can view lab results" ON public.lab_results;

CREATE POLICY "Authenticated users can view lab results"
ON public.lab_results FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert lab results"
ON public.lab_results FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete lab results"
ON public.lab_results FOR DELETE
TO authenticated
USING (true);

-- STUDIES TABLE
DROP POLICY IF EXISTS "Authenticated users can delete studies" ON public.studies;
DROP POLICY IF EXISTS "Authenticated users can insert studies" ON public.studies;
DROP POLICY IF EXISTS "Authenticated users can update studies" ON public.studies;
DROP POLICY IF EXISTS "Authenticated users can view studies" ON public.studies;

CREATE POLICY "Authenticated users can view studies"
ON public.studies FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert studies"
ON public.studies FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update studies"
ON public.studies FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete studies"
ON public.studies FOR DELETE
TO authenticated
USING (true);

-- TRIAGE_RESULTS TABLE
DROP POLICY IF EXISTS "Authenticated users can delete triage_results" ON public.triage_results;
DROP POLICY IF EXISTS "Authenticated users can insert triage results" ON public.triage_results;
DROP POLICY IF EXISTS "Authenticated users can view triage results" ON public.triage_results;

CREATE POLICY "Authenticated users can view triage results"
ON public.triage_results FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert triage results"
ON public.triage_results FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete triage results"
ON public.triage_results FOR DELETE
TO authenticated
USING (true);
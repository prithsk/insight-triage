DROP POLICY IF EXISTS "Authenticated users can view embeddings" ON public.embeddings;
DROP POLICY IF EXISTS "Service role can manage embeddings" ON public.embeddings;
DROP POLICY IF EXISTS "Approved users can view embeddings" ON public.embeddings;

CREATE POLICY "Approved users can view embeddings"
ON public.embeddings FOR SELECT TO authenticated USING (public.is_approved_user());

DROP POLICY IF EXISTS "Authenticated users can view medical literature" ON public.medical_literature;
DROP POLICY IF EXISTS "Service role can manage medical literature" ON public.medical_literature;
DROP POLICY IF EXISTS "Approved users can view medical literature" ON public.medical_literature;

CREATE POLICY "Approved users can view medical literature"
ON public.medical_literature FOR SELECT TO authenticated USING (public.is_approved_user());
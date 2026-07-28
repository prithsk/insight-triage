-- Security fix: embeddings and medical_literature were left on the pre-
-- approval-gate policy ("any authenticated user can SELECT"), missed when
-- 20260718000000_add_approval_gate_and_fix_rls.sql locked down every other
-- PHI table. embeddings.source_type includes 'study_finding' and
-- 'historical_decision' — patient-derived content, not just reference
-- material — so an unapproved signup could read it. Gate both to
-- is_approved_user(), matching studies/triage_results/lab_results/etc.

-- ── EMBEDDINGS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view embeddings" ON public.embeddings;

CREATE POLICY "Approved users can view embeddings"
ON public.embeddings FOR SELECT TO authenticated USING (public.is_approved_user());

-- "Service role can manage embeddings" (FOR ALL USING (true)) is left as-is:
-- the service role bypasses RLS via its key regardless of policy, so this
-- only documents intent and isn't a gap.

-- ── MEDICAL_LITERATURE ───────────────────────────────────────────────────
-- Reference content (ACR guidelines, etc.), not patient data, but gated for
-- consistency with the rest of the schema and because it's zero-cost to do so.
DROP POLICY IF EXISTS "Authenticated users can view medical literature" ON public.medical_literature;

CREATE POLICY "Approved users can view medical literature"
ON public.medical_literature FOR SELECT TO authenticated USING (public.is_approved_user());

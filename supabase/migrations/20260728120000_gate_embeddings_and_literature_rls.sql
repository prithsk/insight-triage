-- Security fix: embeddings and medical_literature were left on the pre-
-- approval-gate policy ("any authenticated user can SELECT"), missed when
-- 20260718000000_add_approval_gate_and_fix_rls.sql locked down every other
-- PHI table. embeddings.source_type includes 'study_finding' and
-- 'historical_decision' — patient-derived content, not just reference
-- material — so an unapproved signup could read it.
--
-- IMPORTANT: gating the SELECT policy alone is NOT sufficient here. The
-- original migration (20260111043442) also created:
--
--     CREATE POLICY "Service role can manage embeddings"
--     ON public.embeddings FOR ALL USING (true);
--
-- That policy has no TO clause, so it applies to EVERY role including
-- `authenticated` and `anon`. Postgres OR's permissive policies together,
-- so `FOR ALL USING (true)` grants SELECT to anyone and silently overrides
-- any stricter SELECT policy sitting beside it. The approval gate below is
-- dead code until those policies are dropped.
--
-- The service role does not need a policy at all: Supabase's service_role
-- has BYPASSRLS, so it reaches these tables regardless of RLS. Dropping the
-- policy removes the hole without removing any legitimate access.

-- ── EMBEDDINGS ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can view embeddings" ON public.embeddings;
DROP POLICY IF EXISTS "Service role can manage embeddings" ON public.embeddings;

CREATE POLICY "Approved users can view embeddings"
ON public.embeddings FOR SELECT TO authenticated USING (public.is_approved_user());

-- Writes stay service-role only (BYPASSRLS). No INSERT/UPDATE/DELETE policy
-- is created for `authenticated`, so client-side writes are denied by default.

-- ── MEDICAL_LITERATURE ───────────────────────────────────────────────────
-- Reference content (ACR guidelines, etc.), not patient data, but gated for
-- consistency with the rest of the schema and because it's zero-cost to do so.
DROP POLICY IF EXISTS "Authenticated users can view medical literature" ON public.medical_literature;
DROP POLICY IF EXISTS "Service role can manage medical literature" ON public.medical_literature;

CREATE POLICY "Approved users can view medical literature"
ON public.medical_literature FOR SELECT TO authenticated USING (public.is_approved_user());

-- CRITICAL security fix: self-service privilege escalation on public.profiles.
--
-- The original profiles policy (20260111034958) was:
--
--     CREATE POLICY "Users can update their own profile"
--     ON public.profiles FOR UPDATE
--     USING (auth.uid() = user_id);
--
-- It has no WITH CHECK and no column restriction, and was never dropped by any
-- later migration. In Postgres, an UPDATE policy with USING but no WITH CHECK
-- reuses the USING expression as the row check, so the only invariant enforced
-- is that user_id stays the same.
--
-- Migration 20260718000000 then added `approved` and `role` to that same table
-- and made public.is_approved_user() / public.is_admin_user() the sole predicate
-- behind every PHI policy (studies, triage_results, lab_results,
-- feedback_events, documents, embeddings, medical_literature) and both storage
-- buckets (dicom-files, documents).
--
-- Net effect: signup is open to anyone, and any newly signed-up user could
--     PATCH /rest/v1/profiles?user_id=eq.<self>  {"approved":true,"role":"admin"}
-- to self-approve and unlock all PHI. The approval gate was bypassable by the
-- very users it was meant to gate.
--
-- Fix has two layers:
--   1. A BEFORE UPDATE trigger that rejects changes to `approved` or `role`
--      unless the caller is service_role or an existing approved admin. This is
--      the real enforcement: it holds regardless of which policy permitted the
--      UPDATE, so a future permissive policy cannot silently reopen the hole.
--   2. A tightened policy carrying an explicit WITH CHECK, so intent is visible
--      in the policy itself rather than only in the trigger.
--
-- The INSERT path is already safe: handle_new_user() inserts only
-- (user_id, display_name) so `approved` takes its DEFAULT false, and a second
-- self-INSERT with approved=true violates the user_id UNIQUE constraint.

-- ── Layer 1: trigger guard ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Nothing privileged changed: allow (display_name, specialty, avatar, etc.)
  IF NEW.approved IS NOT DISTINCT FROM OLD.approved
     AND NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  -- Backend/service_role work (admin scripts, edge functions) is allowed.
  -- Triggers still fire for service_role even though it bypasses RLS.
  IF COALESCE(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Direct database access with no JWT: migrations, psql, the Supabase SQL
  -- editor. Anyone here already holds database credentials, so this grants no
  -- privilege they lack. Without it, re-running the founding-admin seed in
  -- 20260718000000 would fail.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Otherwise only an existing approved admin may grant approval or change role.
  IF public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'Permission denied: approved and role can only be changed by an admin'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_privilege_escalation ON public.profiles;

CREATE TRIGGER profiles_prevent_privilege_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ── Layer 2: make the policy state its own intent ────────────────────────
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

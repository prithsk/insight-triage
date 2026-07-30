-- Waitlist signups from the public landing page.
--
-- THREAT MODEL. This is the only table in the schema that anonymous visitors can
-- write to, so it gets the narrowest grant in the schema:
--
--   anon may INSERT. anon may not SELECT, UPDATE, or DELETE.
--
-- The asymmetry is the whole point. A signup list carries names, work emails, and
-- institutions — exactly the material a competitor or a scraper wants. An
-- `anon`-readable waitlist publishes your pipeline to anyone who finds the REST
-- endpoint, and the table would look correct in every screenshot of the app.
--
-- Invariants this migration relies on (see CLAUDE.md):
--   - Permissive policies are OR-ed. There must be no second, looser policy on
--     this table in any later migration.
--   - A policy with no TO clause applies to EVERY role including anon, so every
--     policy here names its role explicitly.
--   - service_role has BYPASSRLS. It gets no policy; one would be a hole, not
--     documentation.
--   - Reading the list is an authenticated admin operation, routed through
--     is_admin_user() rather than granted to authenticated broadly.

CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text NOT NULL,
  name         text,
  organisation text,
  role         text,
  note         text,
  source       text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness: a resubmission should not create a second row, and
-- Ada@x.com and ada@x.com are the same person.
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_email_key
  ON public.waitlist_signups (lower(email));

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Idempotent: re-running this migration must not leave a stale duplicate policy
-- beside the intended one, since duplicates are OR-ed.
DROP POLICY IF EXISTS "Anyone may join the waitlist"    ON public.waitlist_signups;
DROP POLICY IF EXISTS "Admins may read the waitlist"    ON public.waitlist_signups;
DROP POLICY IF EXISTS "Admins may manage the waitlist"  ON public.waitlist_signups;

-- INSERT only, for unauthenticated and authenticated visitors alike.
-- WITH CHECK constrains the row being written; there is no USING clause because
-- INSERT has no existing row to test.
CREATE POLICY "Anyone may join the waitlist"
  ON public.waitlist_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    -- Cheap server-side shape check so a malformed or oversized payload cannot be
    -- stored even if the client validation is bypassed.
    email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(email) <= 254
    AND (name         IS NULL OR length(name)         <= 200)
    AND (organisation IS NULL OR length(organisation) <= 200)
    AND (role         IS NULL OR length(role)         <= 200)
    AND (note         IS NULL OR length(note)         <= 2000)
    AND (source       IS NULL OR length(source)       <= 100)
  );

-- Reading the list is admin-only. Note this is a SELECT policy for authenticated
-- admins; anon is deliberately absent from the TO list and therefore cannot read.
CREATE POLICY "Admins may read the waitlist"
  ON public.waitlist_signups
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

-- Deletion (e.g. an unsubscribe request) is admin-only. No UPDATE policy exists:
-- nothing should rewrite a signup, and adding one later would need WITH CHECK as
-- well as USING or it would reuse USING as the row check.
CREATE POLICY "Admins may delete from the waitlist"
  ON public.waitlist_signups
  FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

-- Table-level grants are the second gate. RLS filters rows; grants decide whether
-- the role may attempt the verb at all. anon gets INSERT and nothing else.
REVOKE ALL ON public.waitlist_signups FROM anon, authenticated;
GRANT INSERT                     ON public.waitlist_signups TO anon;
GRANT INSERT, SELECT, DELETE     ON public.waitlist_signups TO authenticated;

COMMENT ON TABLE public.waitlist_signups IS
  'Public landing-page waitlist. anon may INSERT only; reads are admin-gated. Do not add a broader policy — permissive policies are OR-ed.';

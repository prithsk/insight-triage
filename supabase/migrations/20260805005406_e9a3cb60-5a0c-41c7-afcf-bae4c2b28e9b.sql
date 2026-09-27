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

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_email_key
  ON public.waitlist_signups (lower(email));

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone may join the waitlist"    ON public.waitlist_signups;
DROP POLICY IF EXISTS "Admins may read the waitlist"    ON public.waitlist_signups;
DROP POLICY IF EXISTS "Admins may manage the waitlist"  ON public.waitlist_signups;

CREATE POLICY "Anyone may join the waitlist"
  ON public.waitlist_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(email) <= 254
    AND (name         IS NULL OR length(name)         <= 200)
    AND (organisation IS NULL OR length(organisation) <= 200)
    AND (role         IS NULL OR length(role)         <= 200)
    AND (note         IS NULL OR length(note)         <= 2000)
    AND (source       IS NULL OR length(source)       <= 100)
  );

CREATE POLICY "Admins may read the waitlist"
  ON public.waitlist_signups
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

CREATE POLICY "Admins may delete from the waitlist"
  ON public.waitlist_signups
  FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

REVOKE ALL ON public.waitlist_signups FROM anon, authenticated;
GRANT INSERT                     ON public.waitlist_signups TO anon;
GRANT INSERT, SELECT, DELETE     ON public.waitlist_signups TO authenticated;

COMMENT ON TABLE public.waitlist_signups IS
  'Public landing-page waitlist. anon may INSERT only; reads are admin-gated. Do not add a broader policy — permissive policies are OR-ed.';
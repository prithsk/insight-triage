REVOKE ALL ON public.waitlist_signups FROM anon, authenticated;
GRANT INSERT                     ON public.waitlist_signups TO anon;
GRANT INSERT, SELECT, DELETE     ON public.waitlist_signups TO authenticated;
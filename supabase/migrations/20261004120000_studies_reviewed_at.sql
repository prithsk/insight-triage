-- Record WHEN a study was read, once, on the database's clock.
--
-- Analytics measures read time against each band's read-time target — the one
-- number Kroix exists to move. Until now it used `updated_at` on a REVIEWED row
-- as the read time. That was a proxy and labelled as one: any later edit to the
-- row moved it, archiving a reviewed study changed it, and the client sent the
-- value itself (`useStudies` passes `updated_at: new Date()` from the browser).
--
-- `reviewed_at` is set here, by a trigger, and only here:
--   * on the first transition INTO 'REVIEWED' it becomes now();
--   * after that it never changes — re-reviewing, archiving, or any other
--     update leaves it as it was;
--   * a value supplied by the client is ignored on every insert and update, so
--     the read time cannot be backdated or forged from the browser.
--
-- Existing REVIEWED rows are NOT backfilled. Their true read time is not known,
-- and filling it from `updated_at` would put the proxy back under a new name.
-- Analytics counts them separately as "reviewed before read times were
-- recorded" and excludes them from target attainment.
--
-- No policy changes. The trigger runs as the caller, needs no privilege, and is
-- not SECURITY DEFINER. Existing RLS on `studies` already governs who may update.

ALTER TABLE public.studies
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

COMMENT ON COLUMN public.studies.reviewed_at IS
  'When the study was first marked REVIEWED. Set by trg_studies_reviewed_at on the database clock; never written by clients, never changed after it is set.';

CREATE OR REPLACE FUNCTION public.set_studies_reviewed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- A row born REVIEWED (imports, admin scripts) is read at insert time.
    NEW.reviewed_at := CASE WHEN NEW.status = 'REVIEWED' THEN now() ELSE NULL END;
    RETURN NEW;
  END IF;

  -- UPDATE: whatever the client sent, start from the stored value.
  NEW.reviewed_at := OLD.reviewed_at;

  IF NEW.status = 'REVIEWED'
     AND OLD.status IS DISTINCT FROM 'REVIEWED'
     AND OLD.reviewed_at IS NULL THEN
    NEW.reviewed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_studies_reviewed_at ON public.studies;

CREATE TRIGGER trg_studies_reviewed_at
  BEFORE INSERT OR UPDATE ON public.studies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_studies_reviewed_at();

CREATE INDEX IF NOT EXISTS studies_reviewed_at_idx
  ON public.studies (reviewed_at)
  WHERE reviewed_at IS NOT NULL;

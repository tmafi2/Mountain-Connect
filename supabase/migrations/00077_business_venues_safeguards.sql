-- ============================================================
-- Migration 00077: Business Venues Safeguards
-- ============================================================
-- Three follow-ups to migration 00076 that the venue-feature audit
-- surfaced:
--
-- 1. Auto-create a primary venue when a new business_profiles row
--    is inserted. Without this, businesses that sign up after the
--    backfill ran end up with no venues at all and their first job
--    posts save with venue_id NULL.
-- 2. Validate that job_posts.venue_id always belongs to the same
--    business as job_posts.business_id. RLS allows public reads on
--    business_venues, so without this check a business owner could
--    set their job's venue_id to another business's venue and
--    impersonate it.
-- 3. Change job_posts.venue_id ON DELETE behaviour to SET NULL,
--    matching the venues-page delete-confirm copy ("Job listings
--    tagged to this venue will lose that link but stay live under
--    the business"). Previously the FK defaulted to RESTRICT, so
--    deleting a venue with jobs threw a raw Postgres error.

BEGIN;

-- ─── 1. Auto-create a primary venue on business_profiles INSERT ───
-- Mirrors the slug + data-copy logic from 00076's backfill.
CREATE OR REPLACE FUNCTION public.create_default_business_venue()
RETURNS TRIGGER AS $$
DECLARE
  v_slug TEXT;
BEGIN
  v_slug := COALESCE(
    NULLIF(
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE(NEW.business_name, '[^a-zA-Z0-9 -]', '', 'g'), '\s+', '-', 'g')),
      ''
    ),
    NEW.id::text
  );

  INSERT INTO public.business_venues (
    business_id, name, slug, description, location, resort_id,
    nearby_town_id, logo_url, cover_photo_url, phone, email, website,
    is_primary, created_at
  )
  VALUES (
    NEW.id,
    NEW.business_name,
    v_slug,
    NEW.description,
    NEW.location,
    -- business_profiles.resort_id is uuid in production despite
    -- 00010 declaring it text; the explicit cast handles either
    -- declared shape.
    NEW.resort_id::uuid,
    NEW.nearby_town_id,
    NEW.logo_url,
    NEW.cover_photo_url,
    NEW.phone,
    NEW.email,
    NEW.website,
    TRUE,
    NEW.created_at
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_business_profiles_default_venue ON public.business_profiles;
CREATE TRIGGER trg_business_profiles_default_venue
  AFTER INSERT ON public.business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_business_venue();

-- ─── 2. Validate venue_id ↔ business_id on job_posts ─────────────
-- A trigger rather than a CHECK constraint because the rule
-- crosses tables.
CREATE OR REPLACE FUNCTION public.validate_job_post_venue_business()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id UUID;
BEGIN
  IF NEW.venue_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT business_id INTO v_business_id
  FROM public.business_venues
  WHERE id = NEW.venue_id;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'venue_id % does not match any business_venues row', NEW.venue_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_business_id <> NEW.business_id THEN
    RAISE EXCEPTION 'venue_id % belongs to a different business than business_id %', NEW.venue_id, NEW.business_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_posts_venue_business_match ON public.job_posts;
CREATE TRIGGER trg_job_posts_venue_business_match
  BEFORE INSERT OR UPDATE OF venue_id, business_id ON public.job_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_job_post_venue_business();

-- ─── 3. Change venue_id FK to ON DELETE SET NULL ─────────────────
-- The constraint name is the Postgres auto-generated default from
-- 00076: <table>_<column>_fkey.
ALTER TABLE public.job_posts
  DROP CONSTRAINT IF EXISTS job_posts_venue_id_fkey;

ALTER TABLE public.job_posts
  ADD CONSTRAINT job_posts_venue_id_fkey
  FOREIGN KEY (venue_id)
  REFERENCES public.business_venues(id)
  ON DELETE SET NULL;

COMMIT;

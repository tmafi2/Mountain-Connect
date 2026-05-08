-- ============================================================
-- Migration 00076: Business Venues
-- ============================================================
-- Introduces a first-class "venues" concept beneath each
-- business_profile so a single operator can list distinct
-- establishments (e.g. a pub AND a bar) under one account.
--
-- One primary venue is backfilled per existing business mirroring
-- the business's current location/resort/town/logo/cover image.
-- Existing job_posts are linked to their business's primary venue
-- via a new nullable venue_id column. The site continues to work
-- without UI changes — the primary venue is just a transparent
-- mirror of the business until the business owner explicitly adds
-- a second venue.

BEGIN;

-- ─── 1. business_venues table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.business_venues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  description     TEXT,
  location        TEXT,
  resort_id       UUID REFERENCES public.resorts(id),
  nearby_town_id  UUID REFERENCES public.nearby_towns(id),
  logo_url        TEXT,
  cover_photo_url TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ,
  UNIQUE (business_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_business_venues_business
  ON public.business_venues(business_id);
CREATE INDEX IF NOT EXISTS idx_business_venues_resort
  ON public.business_venues(resort_id);
CREATE INDEX IF NOT EXISTS idx_business_venues_nearby_town
  ON public.business_venues(nearby_town_id);
-- Only one primary venue per business.
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_venues_primary
  ON public.business_venues(business_id)
  WHERE is_primary = TRUE;

-- ─── 2. Add venue_id to job_posts (nullable for backward compat) ───
ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.business_venues(id);

CREATE INDEX IF NOT EXISTS idx_job_posts_venue
  ON public.job_posts(venue_id);

-- ─── 3. Backfill: one primary venue per existing business ─────────
-- business_profiles.resort_id is a live UUID FK to resorts.id in
-- production (despite migration 00010 declaring it text — the
-- column was migrated to uuid before 00072 which already used it
-- as a uuid). Copy it through directly.
INSERT INTO public.business_venues (
  business_id, name, slug, description, location, resort_id,
  nearby_town_id, logo_url, cover_photo_url, phone, email, website,
  is_primary, created_at
)
SELECT
  bp.id,
  bp.business_name,
  -- Slug: lowercase, ascii-letters/digits only, hyphenated. Fall
  -- back to the row's id if name slugifies to empty.
  COALESCE(
    NULLIF(
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE(bp.business_name, '[^a-zA-Z0-9 -]', '', 'g'), '\s+', '-', 'g')),
      ''
    ),
    bp.id::text
  ),
  bp.description,
  bp.location,
  bp.resort_id::uuid,
  bp.nearby_town_id,
  bp.logo_url,
  bp.cover_photo_url,
  bp.phone,
  bp.email,
  bp.website,
  TRUE,
  bp.created_at
FROM public.business_profiles bp
WHERE NOT EXISTS (
  -- Idempotent: skip businesses that already have a primary venue
  -- (so re-running the migration is safe).
  SELECT 1 FROM public.business_venues v
  WHERE v.business_id = bp.id AND v.is_primary = TRUE
);

-- ─── 4. Backfill: link existing job_posts to the primary venue ─────
UPDATE public.job_posts jp
SET venue_id = v.id
FROM public.business_venues v
WHERE v.business_id = jp.business_id
  AND v.is_primary = TRUE
  AND jp.venue_id IS NULL;

-- ─── 5. RLS policies ─────────────────────────────────────────────
ALTER TABLE public.business_venues ENABLE ROW LEVEL SECURITY;

-- Public can read venues that belong to a business (the visibility
-- of the business itself is enforced by the business_profiles RLS).
DROP POLICY IF EXISTS "Anyone can view business venues" ON public.business_venues;
CREATE POLICY "Anyone can view business venues"
  ON public.business_venues FOR SELECT
  USING (TRUE);

-- Business owners can manage their own venues.
DROP POLICY IF EXISTS "Business owners can insert their venues" ON public.business_venues;
CREATE POLICY "Business owners can insert their venues"
  ON public.business_venues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = business_venues.business_id
        AND bp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business owners can update their venues" ON public.business_venues;
CREATE POLICY "Business owners can update their venues"
  ON public.business_venues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = business_venues.business_id
        AND bp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Business owners can delete their venues" ON public.business_venues;
CREATE POLICY "Business owners can delete their venues"
  ON public.business_venues FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      WHERE bp.id = business_venues.business_id
        AND bp.user_id = auth.uid()
    )
  );

-- Admins can do anything (matches the pattern from migration 00011).
DROP POLICY IF EXISTS "Admins can manage all business venues" ON public.business_venues;
CREATE POLICY "Admins can manage all business venues"
  ON public.business_venues FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );

-- ─── 6. updated_at trigger ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_business_venues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_business_venues_updated_at ON public.business_venues;
CREATE TRIGGER trg_business_venues_updated_at
  BEFORE UPDATE ON public.business_venues
  FOR EACH ROW
  EXECUTE FUNCTION public.set_business_venues_updated_at();

COMMIT;

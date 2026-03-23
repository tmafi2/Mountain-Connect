-- ============================================================
-- Migration 00005: Business Verification & Verified Employers
-- ============================================================
-- Adds verification status flow, expanded business profiles,
-- business-resort relationships, photo gallery, and followers.

-- ── 1. Add new columns to business_profiles ─────────────────

-- Replace boolean is_verified with a status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_verification_status') THEN
    CREATE TYPE business_verification_status AS ENUM (
      'unverified',
      'pending_review',
      'verified',
      'rejected'
    );
  END IF;
END
$$;

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS verification_status business_verification_status DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS year_established integer,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS standard_perks text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill: set verification_status from is_verified
UPDATE business_profiles
SET verification_status = CASE WHEN is_verified THEN 'verified'::business_verification_status ELSE 'unverified'::business_verification_status END
WHERE verification_status IS NULL;

-- ── 2. Business–Resort junction table ───────────────────────

CREATE TABLE IF NOT EXISTS business_resorts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  resort_id text NOT NULL, -- matches resorts.id (text-based seed IDs)
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_resorts_unique
  ON business_resorts(business_id, resort_id);

CREATE INDEX IF NOT EXISTS idx_business_resorts_resort
  ON business_resorts(resort_id);

-- ── 3. Business photos table ────────────────────────────────

CREATE TABLE IF NOT EXISTS business_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_photos_business
  ON business_photos(business_id);

-- ── 4. Business followers table ─────────────────────────────

CREATE TABLE IF NOT EXISTS business_followers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_business_followers_unique
  ON business_followers(business_id, worker_id);

CREATE INDEX IF NOT EXISTS idx_business_followers_worker
  ON business_followers(worker_id);

-- ── 5. Add notification types for follow system ─────────────
-- The notifications table already uses text type field, so no schema change needed.
-- New types: 'business_new_job', 'business_closed_job', 'business_update'

-- ── 6. RLS Policies ─────────────────────────────────────────

ALTER TABLE business_resorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_followers ENABLE ROW LEVEL SECURITY;

-- business_resorts: anyone can read, business owners can manage their own
CREATE POLICY "Anyone can view business resort links"
  ON business_resorts FOR SELECT USING (true);

CREATE POLICY "Business owners can manage their resort links"
  ON business_resorts FOR ALL USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- business_photos: anyone can read, business owners can manage their own
CREATE POLICY "Anyone can view business photos"
  ON business_photos FOR SELECT USING (true);

CREATE POLICY "Business owners can manage their photos"
  ON business_photos FOR ALL USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- business_followers: workers can manage their own follows, businesses can see their followers
CREATE POLICY "Workers can view their follows"
  ON business_followers FOR SELECT USING (
    worker_id IN (
      SELECT id FROM worker_profiles WHERE user_id = auth.uid()
    )
    OR
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workers can follow businesses"
  ON business_followers FOR INSERT WITH CHECK (
    worker_id IN (
      SELECT id FROM worker_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workers can unfollow businesses"
  ON business_followers FOR DELETE USING (
    worker_id IN (
      SELECT id FROM worker_profiles WHERE user_id = auth.uid()
    )
  );

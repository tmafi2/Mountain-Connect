-- ============================================================
-- Migration 00010: Expand Business Profiles
-- ============================================================
-- Adds industries, address, country, and resort_id columns
-- to support the enhanced business setup and company profile.

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS industries text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS resort_id text;

-- Add index on country for filtering
CREATE INDEX IF NOT EXISTS idx_business_profiles_country
  ON public.business_profiles(country);

-- ============================================================
-- Migration 00048: Expand Business Tiers to 4 Plans
-- ============================================================
-- Changes tier from (free, premium) to (free, standard, premium, enterprise)
-- Existing rows with 'free' or 'premium' remain valid — no data migration needed.

-- Drop old CHECK constraint
ALTER TABLE public.business_profiles
  DROP CONSTRAINT IF EXISTS business_profiles_tier_check;

-- Add new CHECK constraint with 4 tiers
ALTER TABLE public.business_profiles
  ADD CONSTRAINT business_profiles_tier_check
  CHECK (tier IN ('free', 'standard', 'premium', 'enterprise'));

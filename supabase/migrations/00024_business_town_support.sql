-- ═══ BUSINESS NEARBY TOWN SUPPORT ══════════════════════════

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS operates_in_town BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS nearby_town_id UUID REFERENCES nearby_towns(id);

CREATE INDEX IF NOT EXISTS idx_business_profiles_nearby_town
  ON business_profiles(nearby_town_id);

-- Premium business tiers: admin can toggle businesses between free and premium
ALTER TABLE public.business_profiles
  ADD COLUMN tier TEXT NOT NULL DEFAULT 'free'
  CHECK (tier IN ('free', 'premium'));

CREATE INDEX idx_business_profiles_tier ON public.business_profiles(tier);

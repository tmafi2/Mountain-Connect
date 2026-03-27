-- Allow anyone to read business profiles (needed for job listings to show business name)
-- The existing policy "Public can view verified businesses" only allows is_verified = true,
-- which hides unverified business names from job listings.

CREATE POLICY "Anyone can view business profiles"
  ON public.business_profiles FOR SELECT
  USING (true);

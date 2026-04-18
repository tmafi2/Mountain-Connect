-- ============================================================
-- Migration 00060: Claim Your Listing
-- ============================================================
-- Lets admins pre-import job listings (from Facebook, Seek, etc.) as
-- "unclaimed" business_profiles with no linked auth user. Anonymous
-- job seekers can submit expressions of interest against those jobs.
-- The real business then claims the listing via a unique token, which
-- creates their auth account and links everything up.
-- ============================================================

-- ─── 1. business_profiles: allow NULL user_id + add claim fields ───
ALTER TABLE public.business_profiles ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS is_claimed BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS claim_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Backfill existing rows (should already be TRUE from the default, but be explicit)
UPDATE public.business_profiles SET is_claimed = TRUE WHERE is_claimed IS NULL OR is_claimed = FALSE AND user_id IS NOT NULL;

-- Index for claim-token lookups
CREATE INDEX IF NOT EXISTS idx_business_profiles_claim_token ON public.business_profiles(claim_token) WHERE claim_token IS NOT NULL;

-- ─── 2. job_posts: add source attribution ───
ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT;

-- ─── 3. New table: expressions_of_interest ───
CREATE TABLE IF NOT EXISTS public.expressions_of_interest (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id  UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  message      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eoi_job_post ON public.expressions_of_interest(job_post_id);
CREATE INDEX IF NOT EXISTS idx_eoi_created ON public.expressions_of_interest(created_at DESC);

ALTER TABLE public.expressions_of_interest ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can submit an EOI. Rate limiting is handled
-- at the API layer, not RLS.
CREATE POLICY "Anyone can submit expressions of interest"
  ON public.expressions_of_interest FOR INSERT
  WITH CHECK (true);

-- Businesses can read EOIs for jobs they own.
CREATE POLICY "Businesses can view EOIs for their jobs"
  ON public.expressions_of_interest FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.job_posts jp
      JOIN public.business_profiles bp ON bp.id = jp.business_id
      WHERE jp.id = expressions_of_interest.job_post_id
        AND bp.user_id = auth.uid()
    )
  );

-- Admins can view all EOIs.
CREATE POLICY "Admins can view all EOIs"
  ON public.expressions_of_interest FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role bypass
CREATE POLICY "Service role full access to EOIs"
  ON public.expressions_of_interest FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- Migration 00037: Business Reviews (Workers review businesses)
-- ============================================================
-- Workers can leave ratings and reviews for businesses they have
-- worked with. Public can read all reviews.

CREATE TABLE public.business_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review_text TEXT,
  season TEXT,
  position TEXT,
  would_recommend BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (worker_id, business_id, season)
);

-- Indexes
CREATE INDEX idx_business_reviews_business ON public.business_reviews(business_id);
CREATE INDEX idx_business_reviews_worker ON public.business_reviews(worker_id);
CREATE INDEX idx_business_reviews_rating ON public.business_reviews(business_id, rating);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.business_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (public social proof)
CREATE POLICY "Public can view business reviews"
  ON public.business_reviews FOR SELECT
  USING (true);

-- Workers can create reviews (must own the worker_profile)
CREATE POLICY "Workers can create business reviews"
  ON public.business_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.worker_profiles
      WHERE id = business_reviews.worker_id
      AND user_id = auth.uid()
    )
  );

-- Workers can update their own reviews
CREATE POLICY "Workers can update own reviews"
  ON public.business_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.worker_profiles
      WHERE id = business_reviews.worker_id
      AND user_id = auth.uid()
    )
  );

-- Workers can delete their own reviews
CREATE POLICY "Workers can delete own reviews"
  ON public.business_reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.worker_profiles
      WHERE id = business_reviews.worker_id
      AND user_id = auth.uid()
    )
  );

-- Admins have full access
CREATE POLICY "Admins can manage all business reviews"
  ON public.business_reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

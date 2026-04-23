-- ============================================================
-- Migration 00065: Unclaimed Listing Outreach Timestamps
-- ============================================================
-- Tracks automated follow-up emails sent to businesses whose
-- listings were imported by admin but not yet claimed.
--
--   eoi_nudge_sent_at        — fired once the listing hits 5 EOIs
--   dormancy_warning_sent_at — fired 14 days after import
--                              (last-chance before takedown)
-- ============================================================

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS eoi_nudge_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dormancy_warning_sent_at TIMESTAMPTZ;

-- Index the dormancy sweep query (unclaimed businesses ordered by age /
-- warning status). Partial index keeps it small — only unclaimed rows.
CREATE INDEX IF NOT EXISTS idx_business_profiles_unclaimed_sweep
  ON public.business_profiles(created_at, dormancy_warning_sent_at)
  WHERE is_claimed = FALSE;

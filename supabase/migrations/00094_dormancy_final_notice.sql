-- ============================================================
-- Migration 00094: a second warning before an unclaimed listing goes
-- ============================================================
-- The dormancy cadence gave a business one warning at day 14 and removed
-- their listing at day 21. It becomes two warnings and four weeks:
--
--   day 14   "your listing will be removed in two weeks"
--   day 21   "final notice — one week left"
--   day 28   removed
--
-- Two warnings rather than one because the first arrives cold, from a
-- company the business has never dealt with, about a listing they did not
-- create. One email in that situation is easy to miss entirely. And a
-- fortnight of notice rather than a week gives a seasonal operator time to
-- come back from a stretch of not reading email, which is most of a ski
-- season.
--
-- NOTHING IS IN FLIGHT. The sweep has never successfully run — CRON_SECRET
-- was unset, so every scheduled invocation was rejected with a 401 and
-- dormancy_warning_sent_at is NULL on every row in the table. That makes
-- this a free change: there is no business half-way through the old cadence
-- to reconcile, and no risk of somebody receiving a "final notice" as the
-- first thing they ever hear from us.
-- ============================================================

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS dormancy_final_sent_at timestamptz;

COMMENT ON COLUMN public.business_profiles.dormancy_warning_sent_at IS
  'First removal warning (day 14). Gates the send so a retry cannot repeat it.';

COMMENT ON COLUMN public.business_profiles.dormancy_final_sent_at IS
  'Final notice (a week after the first warning). Takedown is gated on THIS being old enough, not on created_at, so an outage delays removal rather than skipping the warnings.';

-- The sweep asks "who is due a final notice" every day: unclaimed, already
-- warned, not yet given the final. Partial so it stays small — the vast
-- majority of rows never enter this state.
CREATE INDEX IF NOT EXISTS idx_business_dormancy_final_due
  ON public.business_profiles (dormancy_warning_sent_at)
  WHERE dormancy_final_sent_at IS NULL;

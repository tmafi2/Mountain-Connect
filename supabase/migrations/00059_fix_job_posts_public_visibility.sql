-- ============================================================
-- Migration 00059: Fix public job_posts visibility
-- ============================================================
--
-- Two fixes:
--
--  1. The public SELECT RLS policy was keyed on the legacy `is_active`
--     boolean, but the rest of the codebase now uses `status = 'active'`.
--     The two fell out of sync (e.g. drafts that got status-flipped to
--     'active' but never had is_active toggled), leaving jobs visible in
--     admin but invisible to the public. Replacing the policy to check
--     `status = 'active'` makes public visibility match what the business
--     actually sees in their manage-listings UI.
--
--  2. Backfill any existing rows where is_active and status don't agree,
--     so that any other code paths still reading is_active (e.g. the old
--     /api/job-alerts/match query, legacy integrations) stay consistent.
-- ============================================================

-- 1. Replace the public SELECT policy
DROP POLICY IF EXISTS "Anyone can view active jobs" ON public.job_posts;
CREATE POLICY "Anyone can view active jobs"
  ON public.job_posts FOR SELECT
  USING (status = 'active');

-- 2. Sync is_active with status for existing rows
UPDATE public.job_posts
  SET is_active = (status = 'active')
  WHERE is_active IS DISTINCT FROM (status = 'active');

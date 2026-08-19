-- ============================================================
-- Migration 00087: record WHY a job post was paused
-- ============================================================
-- Two different things pause a job, and until now the row looked identical
-- either way:
--
--   1. The owner paused it deliberately ("we've filled this for now").
--   2. We paused it to enforce a tier limit — either the billing downgrade
--      rule (lib/billing/sync.ts enforceJobLimit) or the new claim-time
--      gate, where a business claiming an imported shell with N listings
--      keeps one live on the free tier and the rest are parked.
--
-- Without a marker, nothing can safely un-pause on upgrade: restoring
-- every paused job would silently re-publish listings the owner took down
-- on purpose. That is a bad enough outcome (a filled role back on the
-- public board, collecting applications) that the restore path simply
-- could not exist.
--
-- NULL means "paused by the owner" — the pre-existing meaning of every row
-- today, so the backfill is a no-op by design. Only rows this codebase
-- parks for a limit carry a reason, and only those are ever auto-restored.
-- ============================================================

ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS paused_reason text;

DO $$
BEGIN
  ALTER TABLE public.job_posts
    ADD CONSTRAINT job_posts_paused_reason_check
    CHECK (paused_reason IS NULL OR paused_reason IN ('claim_gated', 'tier_downgrade'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.job_posts.paused_reason IS
  'Why this post is paused. NULL = the owner paused it (never auto-restored). '
  'claim_gated = parked at claim time because the free tier allows one live post. '
  'tier_downgrade = parked by the billing downgrade rule. Both are restored, '
  'newest-first up to the new limit, when the business gains a higher tier.';

-- Partial index: the restore path asks "which of this business's jobs did WE
-- park?", which is a small slice of a table that is mostly active rows.
CREATE INDEX IF NOT EXISTS idx_job_posts_paused_reason
  ON public.job_posts (business_id, paused_reason)
  WHERE paused_reason IS NOT NULL;

-- ============================================================
-- Migration 00092: retire the stale March–June listings
-- ============================================================
-- A one-off cleanup, not a feature. 32 job posts created between March and
-- June 2026 were still live at the end of August — they should have come
-- down months ago. Nobody is notified: these are long dead, and an email
-- saying "your listing from April has been paused" is noise, not news.
--
-- The businesses keep everything. /business/manage-listings selects a
-- business's job posts with no status filter, so a paused row stays visible
-- and editable, and the owner can republish it themselves. The 90
-- applications attached to these posts are untouched — pausing writes only
-- to job_posts.
--
-- WHY A NEW paused_reason RATHER THAN NULL. NULL already means "the owner
-- paused this" (see 00087), and these were paused by us. Recording that
-- distinction is what makes the rows findable later — to audit, to reverse,
-- or to answer a business asking where their listing went.
--
-- THE CATCH THIS CREATES, and why the code change ships alongside it:
-- lib/billing/job-parking.ts treats ANY non-null paused_reason as a row it
-- parked for billing and is free to restore. Left alone, the first of these
-- businesses to upgrade a plan would silently republish every stale listing
-- we just retired. restoreParkedJobs and countParkedJobs are changed in the
-- same commit to match on an explicit allowlist instead, so 'stale_cleanup'
-- is inert to billing. Applying this migration without that change
-- reintroduces the exact staleness it is meant to fix.
-- ============================================================

-- ── 1. Allow the new reason ─────────────────────────────────
ALTER TABLE public.job_posts
  DROP CONSTRAINT IF EXISTS job_posts_paused_reason_check;

ALTER TABLE public.job_posts
  ADD CONSTRAINT job_posts_paused_reason_check
  CHECK (
    paused_reason IS NULL
    OR paused_reason = ANY (ARRAY['claim_gated', 'tier_downgrade', 'stale_cleanup'])
  );

-- ── 2. Retire the stale listings ────────────────────────────
-- Bounded by created_at, and by status = 'active' so the three rows already
-- paused in this window keep whatever reason they were paused for. Re-running
-- this matches nothing, because the rows are no longer active.
UPDATE public.job_posts
SET
  status        = 'paused',
  is_active     = false,
  paused_reason = 'stale_cleanup'
WHERE status = 'active'
  AND created_at >= DATE '2026-03-01'
  AND created_at <  DATE '2026-07-01';

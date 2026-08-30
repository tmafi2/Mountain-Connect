-- ============================================================
-- Migration 00093: job post expiry — schema only (Phase 1)
-- ============================================================
-- Groundwork for automatic expiry of job posts. This migration changes
-- NOTHING a user can see: no post is paused, no email is sent, no cron
-- reads these columns yet. It only starts recording, accurately, when each
-- post went live and when its window ends, so that later phases have real
-- data to work from instead of guesses.
--
-- WHY A TRIGGER RATHER THAN STAMPING AT THE CALL SITES. Four separate paths
-- set status = 'active': POST /api/business/jobs, POST
-- /api/business/publish-drafts, lib/admin/publish-jobs.ts (admin bulk
-- approve), and restoreParkedJobs when a plan upgrade unparks a listing.
-- Patching four writers and every future one is how a column quietly goes
-- half-populated. The database stamps it instead, so every path is covered
-- including ones not written yet.
--
-- THE CLOCK STARTS AT APPROVAL, NOT CREATION. 49 posts are sitting in draft
-- awaiting review. created_at is when the row appeared, which for those is
-- when the business submitted, and for imported listings is when the scraper
-- ran. Neither is when the post became visible to a worker. Stamping on the
-- transition INTO active means an admin review backlog never eats a
-- business's window.
--
-- expires_at IS STORED, NOT DERIVED. Renewal then becomes one explicit
-- write, a per-post custom window costs nothing, and changing the 8-week
-- constant later never retroactively expires something already live.
-- ============================================================

-- ── 1. Columns ──────────────────────────────────────────────
ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS published_at           timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at             timestamptz,
  ADD COLUMN IF NOT EXISTS auto_renew             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expiry_warning_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS expired_notice_sent_at timestamptz;

COMMENT ON COLUMN public.job_posts.published_at IS
  'When this post first became visible to workers. Set once, on the first transition into status=active; never moved afterwards.';
COMMENT ON COLUMN public.job_posts.expires_at IS
  'End of the current live window. Reset on every activation and on renewal. NULL on drafts and on posts never published.';
COMMENT ON COLUMN public.job_posts.auto_renew IS
  'Paid tiers only. Renews the window instead of pausing at expiry; the business is still emailed so a filled role does not sit live forever.';

-- ── 2. 'expired' becomes a valid pause reason ───────────────
-- Safe to add now only because 00092 replaced billing's "any non-null
-- reason is mine to restore" with an explicit allowlist. Without that,
-- adding this value would mean a plan upgrade silently republished every
-- lapsed listing. See lib/billing/job-parking.ts BILLING_PAUSE_REASONS.
ALTER TABLE public.job_posts
  DROP CONSTRAINT IF EXISTS job_posts_paused_reason_check;

ALTER TABLE public.job_posts
  ADD CONSTRAINT job_posts_paused_reason_check
  CHECK (
    paused_reason IS NULL
    OR paused_reason = ANY (ARRAY['claim_gated', 'tier_downgrade', 'stale_cleanup', 'expired'])
  );

-- ── 3. Stamp the window on activation ───────────────────────
-- ⚠️ The 56 days below duplicates JOB_POST_LIFESPAN_DAYS in
-- lib/jobs/expiry.ts. A trigger cannot import TypeScript, so the two are
-- kept in step by hand — changing one requires changing the other.
CREATE OR REPLACE FUNCTION public.job_posts_stamp_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Only interested in rows entering the active state.
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  -- Already active and staying active: an ordinary edit. An edit must not
  -- extend the window, or a business could hold a stale post live forever
  -- by fixing a typo every eight weeks.
  IF TG_OP = 'UPDATE' AND OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  -- First publication is recorded once and never moves; it is the record
  -- of when workers first saw this, not of the current window.
  IF NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;

  -- The window restarts on every activation — a post resumed from pause is
  -- a business confirming it still wants applicants.
  --
  -- A caller that names its own expires_at keeps it, which is what lets a
  -- future relist offer a custom window. The two arms are separate because
  -- "the caller set it" means different things per operation: a non-NULL
  -- value on INSERT, a changed value on UPDATE. Testing TG_OP first also
  -- keeps OLD untouched on INSERT, where it is unassigned.
  IF (TG_OP = 'INSERT' AND NEW.expires_at IS NULL)
     OR (TG_OP = 'UPDATE' AND NEW.expires_at IS NOT DISTINCT FROM OLD.expires_at) THEN
    NEW.expires_at := now() + INTERVAL '56 days';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS job_posts_stamp_expiry ON public.job_posts;
CREATE TRIGGER job_posts_stamp_expiry
  BEFORE INSERT OR UPDATE ON public.job_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.job_posts_stamp_expiry();

-- ── 4. Backfill the posts that are live right now ───────────
-- Everything currently active gets a full window starting today rather than
-- one measured from created_at. Measuring from creation would put every one
-- of these posts past its expiry the moment the cron is switched on, and
-- the first thing the feature would ever do is mass-pause the board.
--
-- Guarded on published_at IS NULL so a re-run extends nobody — the same
-- protection 00080 used when stamping courtesy windows.
UPDATE public.job_posts
SET published_at = now(),
    expires_at   = now() + INTERVAL '56 days'
WHERE status = 'active'
  AND published_at IS NULL;

-- ── 5. Index for the sweep ──────────────────────────────────
-- The cron asks one question daily: which active posts expire soon. Partial
-- on status so it stays small — most rows in this table will eventually be
-- inactive, and none of those are ever candidates.
CREATE INDEX IF NOT EXISTS idx_job_posts_expires_at_active
  ON public.job_posts (expires_at)
  WHERE status = 'active';

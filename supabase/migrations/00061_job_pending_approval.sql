-- Migration 00061: Add pending_approval flag for admin import workflow
--
-- Distinguishes "draft, work in progress" (pending_approval=false) from
-- "draft, ready to be reviewed and published" (pending_approval=true).
-- Set when an admin saves an imported listing via the "Send for approval"
-- button. Cleared when the listing is published.

ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS pending_approval BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_job_posts_pending_approval
  ON public.job_posts(pending_approval)
  WHERE pending_approval = true;

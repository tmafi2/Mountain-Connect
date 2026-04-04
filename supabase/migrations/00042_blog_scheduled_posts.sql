-- ============================================================
-- Migration 00042: Blog Scheduled Posts
-- ============================================================
-- Adds 'scheduled' status and scheduled_at column to blog_posts
-- for scheduled publishing.

-- Drop existing status constraint and add new one with 'scheduled'
ALTER TABLE public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_status_check;
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_status_check
  CHECK (status IN ('draft', 'published', 'scheduled'));

-- Add scheduled_at column
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Ensure scheduled_at is set when status is 'scheduled'
ALTER TABLE public.blog_posts ADD CONSTRAINT blog_posts_scheduled_at_required
  CHECK (status != 'scheduled' OR scheduled_at IS NOT NULL);

-- Index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled
  ON public.blog_posts (scheduled_at)
  WHERE status = 'scheduled';

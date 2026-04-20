-- Migration 00062: Add notion_id for Notion-sourced job imports
--
-- Tracks the origin Notion page ID for listings imported via
-- /api/admin/job-listings/import. Unique when present so re-sends
-- from the same Notion page upsert in place rather than creating
-- duplicates.

ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS notion_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_posts_notion_id
  ON public.job_posts(notion_id)
  WHERE notion_id IS NOT NULL;

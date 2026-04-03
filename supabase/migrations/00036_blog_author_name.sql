-- ============================================================
-- Migration 00036: Blog Author Name
-- ============================================================
-- Adds optional author_name column so admin can set a custom
-- author name instead of always using the logged-in account.

ALTER TABLE public.blog_posts
  ADD COLUMN author_name TEXT;

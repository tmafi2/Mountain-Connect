-- ============================================================
-- Migration 00096: notion_id becomes import_key
-- ============================================================
-- Notion is out of the pipeline as of 2026-08-31, and this column had
-- already stopped meaning what it says. Every value in it now comes from the
-- Facebook monitor, which writes `fb-<hash>` where the hash is derived from
-- (group, business, jobTitle) — nothing to do with Notion at all. The name
-- was the last thing implying a dependency that no longer exists.
--
-- It is renamed rather than dropped because it is still doing real work: it
-- is the importer's idempotency key, the reason re-running a scrape updates
-- a listing instead of duplicating it. Dropping it would make every future
-- import a fresh insert.
--
-- DEPLOY ORDERING. A rename breaks the live endpoint from the moment it
-- applies until the matching code deploys, because the deployed route still
-- selects notion_id. That window is a couple of minutes and the importer
-- runs from a laptop on a fixed schedule — 06:00, 12:00 and 18:00 local,
-- the next of which is hours away. Applied deliberately at a quiet hour with
-- the deploy following immediately; the endpoint also accepts either field
-- name in its payload, so the scraper keeps working whichever version of it
-- is calling.
-- ============================================================

ALTER TABLE public.job_posts
  RENAME COLUMN notion_id TO import_key;

COMMENT ON COLUMN public.job_posts.import_key IS
  'Stable per-listing key from whatever imported it — the FB monitor writes fb-<hash of group+business+title>. First of two idempotency lookups on import; the second is business + title, which catches the same advert cross-posted to two groups and therefore hashing differently. Formerly notion_id, renamed in 00096 when Notion left the pipeline.';

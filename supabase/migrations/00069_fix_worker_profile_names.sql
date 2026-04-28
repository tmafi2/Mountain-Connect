-- ============================================================
-- Migration 00069: Fix worker_profile names for OAuth signups
-- ============================================================
-- Migration 00067 backfilled worker_profiles where BOTH first_name
-- and last_name were null AND the auth metadata had full_name. It
-- missed two cases that surfaced after running:
--
--   1. Rows where ONLY first OR only last is null (single-name
--      profiles). E.g. a Chinese-name worker had first_name
--      populated but last_name null.
--   2. Workers with role=worker but NO worker_profiles row at all.
--      These are usually Google OAuth signups who didn't finish
--      onboarding — their names live in auth.users.raw_user_meta_data
--      but the row was never created.
--
-- This migration handles both. The fix in /auth/callback/route.ts
-- prevents the same problem on future signups by creating the row
-- with names eagerly during the first authenticated request.
-- ============================================================

-- ── Helpers ───────────────────────────────────────────────────
-- Pull first word as first_name, everything after as last_name.
-- For single-word names (no space) NULLIF makes last_name null
-- instead of duplicating the first word.

-- 1. Backfill missing first/last names from auth metadata for any
--    worker_profiles row where first OR last is currently null.
UPDATE public.worker_profiles wp
SET
  first_name = COALESCE(wp.first_name, NULLIF(TRIM(SPLIT_PART(src.meta_full_name, ' ', 1)), '')),
  last_name = COALESCE(
    wp.last_name,
    NULLIF(
      TRIM(SUBSTRING(src.meta_full_name FROM POSITION(' ' IN src.meta_full_name) + 1)),
      TRIM(SPLIT_PART(src.meta_full_name, ' ', 1))
    )
  )
FROM (
  SELECT au.id AS user_id, NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), '') AS meta_full_name
  FROM auth.users au
) src
WHERE wp.user_id = src.user_id
  AND src.meta_full_name IS NOT NULL
  AND (wp.first_name IS NULL OR wp.last_name IS NULL);

-- 2. Create worker_profiles rows for orphan workers — users with
--    role=worker who have no worker_profiles row yet. Pull names
--    from auth metadata, leave the rest to be filled in via
--    onboarding or profile edit.
INSERT INTO public.worker_profiles (user_id, contact_email, first_name, last_name)
SELECT
  u.id,
  u.email,
  NULLIF(TRIM(SPLIT_PART(meta.full_name, ' ', 1)), ''),
  NULLIF(
    TRIM(SUBSTRING(meta.full_name FROM POSITION(' ' IN meta.full_name) + 1)),
    TRIM(SPLIT_PART(meta.full_name, ' ', 1))
  )
FROM public.users u
JOIN auth.users au ON au.id = u.id
JOIN LATERAL (
  SELECT NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), '') AS full_name
) meta ON true
WHERE u.role = 'worker'
  AND NOT EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.user_id = u.id);

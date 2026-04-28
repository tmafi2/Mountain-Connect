-- ============================================================
-- Migration 00067: Backfill worker first_name / last_name
-- ============================================================
-- The signup form was upserting worker_profiles with only user_id +
-- contact_email, even though the form collected firstName + lastName.
-- Those names landed in auth.users.raw_user_meta_data->>'full_name'
-- but never made it into worker_profiles, so any worker who signed
-- up via that path shows as "Unknown" in admin lists.
--
-- This migration pulls full_name out of the auth metadata and splits
-- it into first/last (first whitespace-delimited token = first_name,
-- everything after = last_name) only when the worker_profiles row
-- currently has both names null. Already-named workers are untouched.
-- ============================================================

UPDATE public.worker_profiles wp
SET
  first_name = TRIM(SPLIT_PART(meta_full_name, ' ', 1)),
  last_name  = NULLIF(
    TRIM(SUBSTRING(meta_full_name FROM POSITION(' ' IN meta_full_name) + 1)),
    TRIM(SPLIT_PART(meta_full_name, ' ', 1))  -- single-word names → last stays null
  )
FROM (
  SELECT
    au.id AS user_id,
    NULLIF(TRIM(au.raw_user_meta_data->>'full_name'), '') AS meta_full_name
  FROM auth.users au
) src
WHERE wp.user_id = src.user_id
  AND src.meta_full_name IS NOT NULL
  AND wp.first_name IS NULL
  AND wp.last_name IS NULL;

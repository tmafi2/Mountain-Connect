-- 00114 — a pass nobody mentioned is not a pass refused
--
-- `job_posts.ski_pass_included` and `meal_perks` are BOOLEAN NOT NULL DEFAULT
-- false, and `/api/admin/job-listings/import` omits the field whenever the
-- extractor reports the advert said nothing. So the default fires and `false`
-- means "the advert says no" OR "the advert never mentioned it", with no way
-- to tell them apart.
--
-- Measured on 2026-10-10 across the open board: 299 listings had no pass
-- recorded, and only FOUR of them mention a pass anywhere in their text. The
-- false values are overwhelmingly silence.
--
-- That is the difference between two claims:
--     "16% of listings advertise a pass"   — true
--     "84% of jobs do not include a pass"  — not supported by anything we hold
-- and a reader shown the first will infer the second. /ski-pass-and-meals had
-- to be written entirely around the gap, and the housing page's FAQ had
-- already slipped and said "some do and most do not".
--
-- Same shape as `pay_currency DEFAULT 'USD'` (00109): a value meant for
-- "unknown" read as a fact.
--
--     NULL  = the advert did not say
--     true  = the advert says it is included
--     false = the advert says it is NOT included
--
-- ⚠️ EVERY EXISTING `false` BECOMES NULL, and that is deliberate. A stored
-- false cannot be trusted to mean refusal — four of 299 might, and there is
-- no way to know which — so keeping them would preserve the ambiguity this
-- migration exists to remove. The `true` values are reliable and are kept
-- untouched. `scripts/backfill-pass-and-meals.ts` then re-reads the adverts
-- and records a genuine no where one is actually stated.
--
-- ⚠️ NOTHING RENDERED CHANGES TODAY. Every reader of these columns tests them
-- for truthiness, and NULL is falsy exactly as false was, so a job card that
-- showed no pass badge still shows no pass badge. 31 files reference these
-- columns and none needed editing.

BEGIN;

CREATE TEMP TABLE _perks_before ON COMMIT DROP AS
  SELECT id, ski_pass_included, meal_perks FROM job_posts;

ALTER TABLE job_posts
  ALTER COLUMN ski_pass_included DROP DEFAULT,
  ALTER COLUMN ski_pass_included DROP NOT NULL,
  ALTER COLUMN meal_perks        DROP DEFAULT,
  ALTER COLUMN meal_perks        DROP NOT NULL;

COMMENT ON COLUMN job_posts.ski_pass_included IS
  'NULL = the advert did not say, true = included, false = explicitly not included. Never defaulted.';
COMMENT ON COLUMN job_posts.meal_perks IS
  'NULL = the advert did not say, true = included, false = explicitly not included. Never defaulted.';

UPDATE job_posts SET ski_pass_included = NULL WHERE ski_pass_included = false;
UPDATE job_posts SET meal_perks        = NULL WHERE meal_perks        = false;

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  still_default int;
  still_notnull int;
  lost_pass     int;
  lost_meals    int;
  false_left    int;
  pass_true     int;
  meals_true    int;
BEGIN
  SELECT count(*) INTO still_default FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'job_posts'
     AND column_name IN ('ski_pass_included', 'meal_perks')
     AND column_default IS NOT NULL;
  IF still_default > 0 THEN
    RAISE EXCEPTION '% of the perk columns still carry a default', still_default;
  END IF;

  SELECT count(*) INTO still_notnull FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'job_posts'
     AND column_name IN ('ski_pass_included', 'meal_perks')
     AND is_nullable = 'NO';
  IF still_notnull > 0 THEN
    RAISE EXCEPTION '% of the perk columns are still NOT NULL — unknown cannot be stored', still_notnull;
  END IF;

  -- ⚠️ No `true` may be lost. Those are the reliable values: the advert
  -- actually said the perk is included, and nothing here may touch them.
  SELECT count(*) INTO lost_pass
    FROM job_posts j JOIN _perks_before b ON b.id = j.id
   WHERE b.ski_pass_included = true AND j.ski_pass_included IS DISTINCT FROM true;
  SELECT count(*) INTO lost_meals
    FROM job_posts j JOIN _perks_before b ON b.id = j.id
   WHERE b.meal_perks = true AND j.meal_perks IS DISTINCT FROM true;
  IF lost_pass > 0 OR lost_meals > 0 THEN
    RAISE EXCEPTION 'lost % pass and % meal confirmations', lost_pass, lost_meals;
  END IF;

  -- And every ambiguous false is gone, so nothing can read one as a refusal.
  SELECT count(*) INTO false_left FROM job_posts
   WHERE ski_pass_included = false OR meal_perks = false;
  IF false_left > 0 THEN
    RAISE EXCEPTION '% rows still carry an ambiguous false', false_left;
  END IF;

  SELECT count(*) INTO pass_true FROM job_posts WHERE ski_pass_included;
  SELECT count(*) INTO meals_true FROM job_posts WHERE meal_perks;
  RAISE NOTICE 'perks are tri-state; % pass and % meal confirmations kept', pass_true, meals_true;
END $$;

COMMIT;

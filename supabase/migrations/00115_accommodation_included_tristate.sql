-- 00115 — accommodation too: silence is not a refusal
--
-- The last of the three perk booleans. `accommodation_included` is
-- BOOLEAN NOT NULL DEFAULT false and the import route omits the field when
-- the extractor reports the advert said nothing, so `false` means "says no"
-- OR "never mentioned it". 00114 did the same for `ski_pass_included` and
-- `meal_perks`; this column was left out of that one because it feeds far
-- more of the site.
--
-- ⚠️ IT IS WRONG IN BOTH DIRECTIONS, which the pass column was not. Measured
-- on the open board:
--     27 of the 159 `true` rows never mention housing in their text
--     32 of the 196 `false` rows DO mention it
--      7 rows carry an accommodation_type while saying included = false
-- The seventeen-field extraction was inferring housing from context the same
-- way it invented season passes, and also missing it where it was stated.
-- `scripts/backfill-accommodation.ts --rebuild` re-reads every advert after
-- this migration lands.
--
-- ⚠️ `accommodation_type = 'Not provided'` IS A GENUINE NO AND IS KEPT AS
-- false. Those five adverts actually say housing is not offered — "Must have
-- secure housing in the Sea to Sky corridor. No housing provided." Nulling
-- them would throw away the only explicit refusals on the board, which is the
-- opposite of the point.
--
-- ⚠️ THIS ONE IS VISIBLE. Unlike 00114, the count behind it is published: the
-- /go-for-a-season ad hero reads "193 ski resort jobs in Canada. 68 come with
-- staff accommodation", /staff-housing quotes a share per resort, and
-- /jobs?accommodation=yes filters on it. They all read THIS column, so they
-- move together and cannot disagree — which is exactly why
-- lib/stats/country-job-stats.ts counts the flag rather than something
-- cleverer. Expect the published numbers to change once the rebuild runs.

BEGIN;

CREATE TEMP TABLE _acc_before ON COMMIT DROP AS
  SELECT id, accommodation_included, accommodation_type FROM job_posts;

ALTER TABLE job_posts
  ALTER COLUMN accommodation_included DROP DEFAULT,
  ALTER COLUMN accommodation_included DROP NOT NULL;

COMMENT ON COLUMN job_posts.accommodation_included IS
  'NULL = the advert did not say, true = offered, false = explicitly not offered. Never defaulted.';

-- Every ambiguous false becomes NULL, except the explicit refusals.
UPDATE job_posts
   SET accommodation_included = NULL
 WHERE accommodation_included = false
   AND coalesce(btrim(accommodation_type), '') <> 'Not provided';

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  still_default int;
  still_notnull int;
  lost_true     int;
  lost_refusals int;
  kept_true     int;
  explicit_no   int;
  unknown       int;
BEGIN
  SELECT count(*) INTO still_default FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'job_posts'
     AND column_name = 'accommodation_included' AND column_default IS NOT NULL;
  IF still_default > 0 THEN
    RAISE EXCEPTION 'accommodation_included still carries a default';
  END IF;

  SELECT count(*) INTO still_notnull FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'job_posts'
     AND column_name = 'accommodation_included' AND is_nullable = 'NO';
  IF still_notnull > 0 THEN
    RAISE EXCEPTION 'accommodation_included is still NOT NULL — unknown cannot be stored';
  END IF;

  -- No confirmation may be lost here. The rebuild re-examines them; this
  -- migration only removes the ambiguous falses.
  SELECT count(*) INTO lost_true
    FROM job_posts j JOIN _acc_before b ON b.id = j.id
   WHERE b.accommodation_included = true AND j.accommodation_included IS DISTINCT FROM true;
  IF lost_true > 0 THEN
    RAISE EXCEPTION 'lost % accommodation confirmations', lost_true;
  END IF;

  -- And the explicit refusals must survive as false.
  SELECT count(*) INTO lost_refusals
    FROM job_posts j JOIN _acc_before b ON b.id = j.id
   WHERE btrim(coalesce(b.accommodation_type, '')) = 'Not provided'
     AND j.accommodation_included IS DISTINCT FROM false;
  IF lost_refusals > 0 THEN
    RAISE EXCEPTION 'lost % explicit "not provided" refusals', lost_refusals;
  END IF;

  SELECT count(*) INTO kept_true   FROM job_posts WHERE accommodation_included = true;
  SELECT count(*) INTO explicit_no FROM job_posts WHERE accommodation_included = false;
  SELECT count(*) INTO unknown     FROM job_posts WHERE accommodation_included IS NULL;
  RAISE NOTICE 'accommodation is tri-state: % offered, % refused, % unstated', kept_true, explicit_no, unknown;
END $$;

COMMIT;

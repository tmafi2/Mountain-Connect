-- 00111 — three categories 00110 got wrong
--
-- Found by reading the JobPosting schema on a live listing, which is where
-- `category` now surfaces as `occupationalCategory`. Keeping JobPosting on
-- unclaimed listings (AEO.md) is what makes these worth a migration: a wrong
-- bin is no longer an odd filter result, it is a wrong claim to Google on
-- ~98% of the board.
--
--   "Man-Lift Operator"            Lift Operations -> Maintenance
--   "Ski/Snowboard School Manager" Administration  -> Ski Instruction
--   "Floor Supervisor"             Administration  -> Food & Beverage
--
-- ⚠️ A man-lift is an aerial work platform, not a chairlift, and it was the
-- ONLY job in Lift Operations — a category made to look populated by a
-- machine. The other two fell to Administration through `manager` and
-- `supervisor`: the slash in "Ski/Snowboard School" means "ski school" never
-- appears as contiguous text, and "floor supervisor" missed the "floor staff"
-- rule that had already caught its colleagues. All three rules are fixed in
-- lib/jobs/category.ts with tests, so the next scrape agrees with this.
--
-- ⚠️ EXACTLY THREE ROWS, EACH PINNED BY ID AND BY ITS CURRENT VALUE.
--
-- The corrected classifier disagrees with 20 stored categories, and 17 of
-- those are NOT mistakes — they are values a business chose in the post-job
-- form (paused Australian listings filing "Chef" under Hospitality rather
-- than Food & Beverage). 00110 was guarded on `category IS NULL` precisely so
-- a human choice is never overwritten, and widening this to "every row the
-- classifier disagrees with" would have thrown all 17 away. The three below
-- are active, unclaimed, Facebook-sourced imports that 00110 itself set.

BEGIN;

CREATE TEMP TABLE _cat111_before ON COMMIT DROP AS
  SELECT id, category FROM job_posts;

-- Floor Supervisor: Administration -> Food & Beverage
UPDATE job_posts SET category = 'Food & Beverage'
 WHERE id = '88f9097b-6709-4507-b949-390fc3acbdbb' AND category = 'Administration';

-- Man-Lift Operator: Lift Operations -> Maintenance
UPDATE job_posts SET category = 'Maintenance'
 WHERE id = 'd647bb42-db82-45e5-9853-7e79815aa904' AND category = 'Lift Operations';

-- Ski/Snowboard School Manager: Administration -> Ski Instruction
UPDATE job_posts SET category = 'Ski Instruction'
 WHERE id = '936499b2-090b-4455-b7a1-187ba538fe9d' AND category = 'Administration';

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE changed int; wrong_ones int; lift_left int;
BEGIN
  SELECT count(*) INTO changed
    FROM job_posts j JOIN _cat111_before b ON b.id = j.id
   WHERE j.category IS DISTINCT FROM b.category;
  IF changed <> 3 THEN
    RAISE EXCEPTION 'expected exactly 3 rows to change, got %', changed;
  END IF;

  -- The ones a business chose must be exactly as they were.
  SELECT count(*) INTO wrong_ones
    FROM job_posts j JOIN business_profiles bp ON bp.id = j.business_id
    JOIN _cat111_before b ON b.id = j.id
   WHERE bp.is_claimed AND j.category IS DISTINCT FROM b.category;
  IF wrong_ones > 0 THEN
    RAISE EXCEPTION '% claimed-business categories were overwritten', wrong_ones;
  END IF;

  -- Lift Operations should now be empty, and that is the honest answer:
  -- there is no chairlift role open on the board.
  SELECT count(*) INTO lift_left FROM job_posts WHERE category = 'Lift Operations';
  RAISE NOTICE '3 categories corrected; Lift Operations now holds % rows', lift_left;
END $$;

COMMIT;

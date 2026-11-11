-- 00125_rename_ski_instruction_category.sql
--
-- Renames the job category 'Ski Instruction' to 'Ski Instructor'.
--
-- ⚠️ THE CODE SHIPS FIRST, THIS SECOND. `JOB_CATEGORIES` in
-- lib/jobs/category.ts is the value the post-job form offers, the value the
-- extraction schema allows, and the value `categoryForTitle` writes on every
-- import. If this migration landed first, the deployed code would still be
-- writing 'Ski Instruction' on the next scrape and re-creating exactly the
-- rows this removes. Same ordering as 00109.
--
-- ⚠️ IT IS A CLAIM MADE TO GOOGLE, NOT JUST A LABEL. `job_posts.category` is
-- published as JobPosting `occupationalCategory` on /jobs/[id], and AEO.md's
-- 2026-10-10 decision keeps that schema on unclaimed listings — about 98% of
-- the board. All 16 rows here are active, so 16 live listings change what
-- they tell a search engine. 'Ski Instructor' is the better of the two for
-- that field, which expects an occupation rather than a department.
--
-- ⚠️ FOUR HAND-WRITTEN COPIES OF THIS LIST EXISTED when the rename was
-- requested: lib/jobs/category.ts, the business post-job form, the admin
-- import form and scripts/fb-monitor/schema.ts. Three of them were byte
-- identical to the first and none was imported from it, so renaming one value
-- meant finding all four — and the one most likely to be missed was the
-- extraction schema, which is sent to the model as the allowed set and writes
-- straight into this column. The same commit replaces all three copies with
-- imports, so the next rename is one line.
--
-- Guarded on the old value, so a re-run is a no-op and nothing else is
-- touched. Rehearsed in a rolled-back transaction against production
-- immediately before applying: 16 updated, 0 'Ski Instruction' left, 0
-- expiry windows moved, 0 titles touched.

BEGIN;

-- Snapshot inside the transaction so the checks below hold against whatever
-- the board contains right now. A migration against a live table must not
-- assert a row count that was measured yesterday (00109).
CREATE TEMP TABLE _before_rename ON COMMIT DROP AS
  SELECT id, title, status, category, expires_at, published_at FROM job_posts;

UPDATE job_posts
   SET category = 'Ski Instructor'
 WHERE category = 'Ski Instruction';

DO $$
DECLARE left_old int; moved int; titles int; others int;
BEGIN
  SELECT count(*) INTO left_old FROM job_posts WHERE category = 'Ski Instruction';
  IF left_old <> 0 THEN
    RAISE EXCEPTION 'aborting: % rows still carry the old category', left_old;
  END IF;

  -- ⚠️ The 00107 trap: `job_posts_stamp_expiry` fires on UPDATE, and an
  -- earlier migration silently reset a listing's expiry window by touching a
  -- row it only meant to read. Assert it did not happen here.
  SELECT count(*) INTO moved FROM job_posts j JOIN _before_rename b USING (id)
   WHERE j.expires_at   IS DISTINCT FROM b.expires_at
      OR j.published_at IS DISTINCT FROM b.published_at
      OR j.status       IS DISTINCT FROM b.status;
  IF moved <> 0 THEN
    RAISE EXCEPTION 'aborting: % rows had an expiry window or status change', moved;
  END IF;

  SELECT count(*) INTO titles FROM job_posts j JOIN _before_rename b USING (id)
   WHERE j.title IS DISTINCT FROM b.title;
  IF titles <> 0 THEN
    RAISE EXCEPTION 'aborting: % titles were modified', titles;
  END IF;

  -- Nothing outside the renamed set may have changed category.
  SELECT count(*) INTO others FROM job_posts j JOIN _before_rename b USING (id)
   WHERE j.category IS DISTINCT FROM b.category
     AND b.category IS DISTINCT FROM 'Ski Instruction';
  IF others <> 0 THEN
    RAISE EXCEPTION 'aborting: % rows outside the guard changed category', others;
  END IF;
END $$;

COMMIT;

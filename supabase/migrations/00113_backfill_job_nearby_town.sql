-- 00113 — give listings the town their business is in
--
-- `job_posts.nearby_town_id` is NULL on 354 of 355 open listings, so the
-- platform cannot answer "what does a season in Revelstoke pay?" — only
-- "what does a season at Revelstoke Mountain Resort pay?". AEO.md records a
-- "pay by town" page as unbuildable for exactly this reason, and a town is
-- what a worker searches for: they are looking for somewhere to live.
--
-- The business already knows. `business_profiles.nearby_town_id` is the
-- source of truth for where a business IS and trumps its resort link (the
-- 00074 trigger stamps it from the location text), and 75 open listings
-- belong to a business that has one.
--
-- ⚠️ THE VENUE WOULD HAVE BEEN BETTER, AND IS NOT AVAILABLE. `business_venues`
-- carries its own `nearby_town_id`, which would be exact for a business with
-- premises in two towns. But `job_posts.venue_id` is NULL on all 355 open
-- listings — the claim in CLAUDE.md that it is "populated for every active
-- job since 00076" is not true of the imported board, which is now the whole
-- board. So this inherits from the business, and the guard below is what
-- makes that safe rather than merely convenient.
--
-- ⚠️ THE GUARD IS IN THE SQL, NOT JUST IN THE CHECKING. The update only fires
-- where the business's town is ACTUALLY A TOWN OF THAT JOB'S RESORT, via
-- resort_nearby_towns. Without it, a business that moved, or a bad location
-- parse, would stamp a town hundreds of kilometres from the job. Measured
-- before writing: all 75 candidates satisfy it, 0 do not, no business behind
-- them has more than one venue, and none spans more than one resort. The
-- condition stays in the statement anyway, because the next run of it will be
-- against data nobody has checked.
--
-- Squamish/Whistler Blackcomb looks wrong at a glance and is right: the
-- business genuinely is in Squamish, 58km away, which 00102 linked to
-- Whistler as a non-primary town. The town is where the business is, not
-- where the lifts are.
--
-- ⚠️ Neither trigger on job_posts fires for this. `job_posts_stamp_expiry`
-- returns early on an UPDATE where the row was already active, so no expiry
-- window is reset — the mistake 00107's first draft made — and the venue
-- validation trigger returns early when venue_id is NULL, which it is.

BEGIN;

CREATE TEMP TABLE _town_before ON COMMIT DROP AS
  SELECT id, nearby_town_id, status, expires_at, published_at FROM job_posts;

UPDATE job_posts j
   SET nearby_town_id = b.nearby_town_id
  FROM business_profiles b
 WHERE b.id = j.business_id
   AND j.nearby_town_id IS NULL
   AND b.nearby_town_id IS NOT NULL
   AND EXISTS (
     SELECT 1 FROM resort_nearby_towns rnt
      WHERE rnt.resort_id = j.resort_id
        AND rnt.town_id = b.nearby_town_id
   );

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  overwritten  int;
  unlinked     int;
  expiry_moved int;
  status_moved int;
  stamped      int;
  remaining    int;
BEGIN
  -- A town a human or an earlier import chose is never replaced.
  SELECT count(*) INTO overwritten
    FROM job_posts j JOIN _town_before b ON b.id = j.id
   WHERE b.nearby_town_id IS NOT NULL AND j.nearby_town_id IS DISTINCT FROM b.nearby_town_id;
  IF overwritten > 0 THEN
    RAISE EXCEPTION '% listings had an existing town overwritten', overwritten;
  END IF;

  -- Every town now on a listing belongs to that listing's resort.
  SELECT count(*) INTO unlinked
    FROM job_posts j
   WHERE j.nearby_town_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM resort_nearby_towns rnt
        WHERE rnt.resort_id = j.resort_id AND rnt.town_id = j.nearby_town_id);
  IF unlinked > 0 THEN
    RAISE EXCEPTION '% listings carry a town that is not linked to their resort', unlinked;
  END IF;

  -- ⚠️ Nothing about the listing's LIFE may move. An UPDATE on a live row is
  -- what reset an expiry window in 00107's first draft.
  SELECT count(*) INTO expiry_moved
    FROM job_posts j JOIN _town_before b ON b.id = j.id
   WHERE j.expires_at IS DISTINCT FROM b.expires_at
      OR j.published_at IS DISTINCT FROM b.published_at;
  IF expiry_moved > 0 THEN
    RAISE EXCEPTION '% listings had their expiry or publish date moved', expiry_moved;
  END IF;

  SELECT count(*) INTO status_moved
    FROM job_posts j JOIN _town_before b ON b.id = j.id
   WHERE j.status IS DISTINCT FROM b.status;
  IF status_moved > 0 THEN
    RAISE EXCEPTION '% listings changed status', status_moved;
  END IF;

  SELECT count(*) INTO stamped
    FROM job_posts j JOIN _town_before b ON b.id = j.id
   WHERE b.nearby_town_id IS NULL AND j.nearby_town_id IS NOT NULL;
  SELECT count(*) INTO remaining FROM job_posts WHERE nearby_town_id IS NULL;
  RAISE NOTICE 'towns stamped on % listings; % still without one', stamped, remaining;
END $$;

COMMIT;

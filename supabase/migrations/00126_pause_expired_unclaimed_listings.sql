-- 00126_pause_expired_unclaimed_listings.sql
--
-- Pauses the job posts that are `status='active'` but already past
-- `expires_at`, on businesses nobody has claimed.
--
-- ⚠️ NOTHING A VISITOR CAN SEE CHANGES. Middleware already answers 410 Gone
-- for every one of these rows — `isExpired()` in lib/jobs/expired-gone.ts
-- tests `expires_at <= now()` regardless of status — so this only makes the
-- database agree with what the site has been doing. That is what separates it
-- from the 00107/00108 cliff, where switching the dormancy takedown on would
-- have darkened listings people could still open. Here the listings are
-- already dark; it is the COUNTS that were wrong.
--
-- ⚠️ WHY THEY ACCUMULATED. /api/cron/job-post-expiry deliberately skipped
-- unclaimed shells, on the documented grounds that the dormancy sweep "owns
-- them". That cron measures a different timer — time since import without a
-- claim — and its takedown has been off since 00107
-- (TAKEDOWN_MAX_BUSINESSES_PER_RUN = 0). So an unclaimed listing that passed
-- its 56-day window had nobody at all to pause it. Measured 2026-11-12: 243
-- of 471 active rows past expiry, of which 3 were claimed (and all 3 properly
-- warned — the sweep was healthy inside its scope) and 240 were not.
--
-- ⚠️ THE CODE SHIPS WITH THIS, and this migration is only the backlog. Pass 4
-- in lib/jobs/expiry-sweep.ts + pauseUnclaimedExpired() keep it from
-- rebuilding; without them the next 56 days refill it.
--
-- ⚠️ THE 00107 TRAP IS CLEARED BY READING THE TRIGGER, not by hoping.
-- `job_posts_stamp_expiry` opens with `IF NEW.status <> 'active' THEN RETURN
-- NEW` — an UPDATE setting status='paused' returns before it can touch
-- expires_at or published_at. The verify block below asserts that anyway.
--
-- `paused_reason='expired'` and not a billing reason: restoreParkedJobs
-- matches BILLING_PAUSE_REASONS only, so an upgrade can never republish one
-- of these. It also leaves the row claimable and relistable rather than
-- deleted.

BEGIN;

-- Snapshot inside the transaction. A migration against a live table must not
-- assert a count it measured yesterday (00109) — the scrapes and the expiry
-- cron move this table continuously.
CREATE TEMP TABLE _before_pause ON COMMIT DROP AS
  SELECT id, status, is_active, paused_reason, expires_at, published_at, business_id
    FROM job_posts;

UPDATE job_posts p
   SET status = 'paused',
       is_active = false,
       paused_reason = 'expired'
  FROM business_profiles b
 WHERE b.id = p.business_id
   AND b.user_id IS NULL          -- unclaimed shells only
   AND p.status = 'active'
   AND p.expires_at IS NOT NULL
   AND p.expires_at <= now();

DO $$
DECLARE
  changed int; still_live int; moved int; claimed_touched int; wrong_reason int;
BEGIN
  SELECT count(*) INTO changed
    FROM job_posts j JOIN _before_pause b USING (id)
   WHERE j.status IS DISTINCT FROM b.status;

  -- Nothing unclaimed and past due may remain active.
  SELECT count(*) INTO still_live
    FROM job_posts p JOIN business_profiles bp ON bp.id = p.business_id
   WHERE bp.user_id IS NULL AND p.status = 'active'
     AND p.expires_at IS NOT NULL AND p.expires_at <= now();
  IF still_live <> 0 THEN
    RAISE EXCEPTION 'aborting: % expired unclaimed rows are still active', still_live;
  END IF;

  -- The 00107 trap: no expiry window or publication date may have moved.
  SELECT count(*) INTO moved
    FROM job_posts j JOIN _before_pause b USING (id)
   WHERE j.expires_at IS DISTINCT FROM b.expires_at
      OR j.published_at IS DISTINCT FROM b.published_at;
  IF moved <> 0 THEN
    RAISE EXCEPTION 'aborting: % rows had an expiry window or publish date change', moved;
  END IF;

  -- A claimed business's listing is pass 3's business and owes its owner a
  -- notice period. None may be touched here.
  SELECT count(*) INTO claimed_touched
    FROM job_posts j JOIN _before_pause b USING (id)
    JOIN business_profiles bp ON bp.id = j.business_id
   WHERE bp.user_id IS NOT NULL
     AND (j.status IS DISTINCT FROM b.status OR j.paused_reason IS DISTINCT FROM b.paused_reason);
  IF claimed_touched <> 0 THEN
    RAISE EXCEPTION 'aborting: % listings of CLAIMED businesses were changed', claimed_touched;
  END IF;

  -- Every row we changed must carry exactly the expected marker, and must
  -- have been active and past due before. No owner-paused row may be relabelled.
  SELECT count(*) INTO wrong_reason
    FROM job_posts j JOIN _before_pause b USING (id)
   WHERE j.status IS DISTINCT FROM b.status
     AND (j.paused_reason <> 'expired' OR j.status <> 'paused'
          OR b.status <> 'active' OR b.expires_at IS NULL OR b.expires_at > now());
  IF wrong_reason <> 0 THEN
    RAISE EXCEPTION 'aborting: % rows changed outside the intended guard', wrong_reason;
  END IF;

  RAISE NOTICE 'paused % expired unclaimed listings', changed;
END $$;

COMMIT;

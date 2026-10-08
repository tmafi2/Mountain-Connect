-- 00107 — a pause reason for the unclaimed-dormancy takedown.
--
-- WHY: /api/cron/unclaimed-dormancy-sweep ended its cadence by writing
--   UPDATE job_posts SET status = 'inactive'
-- and 'inactive' is not one of the four values the status CHECK allows
-- ('active', 'paused', 'closed', 'draft'). Every takedown has therefore been
-- rejected by the database since the sweep shipped. The error was pushed onto
-- result.errors and the loop continued, and nothing reads the cron's response
-- body, so it failed silently every single day: on 2026-10-08, 94 businesses
-- were past their takedown date with all 210 of their listings still live,
-- the oldest 23 days overdue. Proven, not inferred — the UPDATE was run in a
-- rolled-back transaction and came back check_violation.
--
-- The fix is to write a legal status, which means 'paused' plus a reason. It
-- needs its OWN reason rather than an existing one:
--
--   * NOT 'claim_gated' or 'tier_downgrade'. Those are BILLING_PAUSE_REASONS
--     in lib/billing/job-parking.ts, and restoreParkedJobs republishes them
--     when a business upgrades. A dormant unclaimed listing must never come
--     back that way — nobody has claimed it, so there is no plan to upgrade.
--   * NOT 'stale_cleanup' (00092) or 'expired' (00093). Both already mean
--     something specific, and 00092's whole lesson was that overloading a
--     reason sends businesses the wrong message about why their listing
--     stopped.
--
-- Nothing is paused by this migration. It only widens the CHECK so the code
-- change in the same commit can write the value.
ALTER TABLE job_posts DROP CONSTRAINT IF EXISTS job_posts_paused_reason_check;

ALTER TABLE job_posts ADD CONSTRAINT job_posts_paused_reason_check
  CHECK (
    paused_reason IS NULL
    OR paused_reason = ANY (ARRAY[
      'claim_gated'::text,
      'tier_downgrade'::text,
      'stale_cleanup'::text,
      'expired'::text,
      'dormant_unclaimed'::text
    ])
  );

-- Verify the END STATE, without touching a single row.
--
-- The behavioural checks (new value accepted, old four still accepted, junk
-- refused, 'inactive' still refused) were run against prod in a rolled-back
-- transaction before this was applied. They are deliberately NOT repeated
-- here: writing to a real job_post would fire the job_posts_stamp_expiry
-- trigger on the way back to status='active' and silently reset that
-- listing's expiry window. A migration must not have side effects on a row
-- it only meant to borrow.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'job_posts'::regclass
       AND conname  = 'job_posts_paused_reason_check'
       AND pg_get_constraintdef(oid) LIKE '%dormant_unclaimed%'
  ) THEN
    RAISE EXCEPTION 'VERIFY FAILED: dormant_unclaimed is not in the paused_reason CHECK';
  END IF;

  -- The status CHECK must still refuse 'inactive'. That value is what broke
  -- the takedown; if it ever becomes legal, the bug returns unnoticed.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'job_posts'::regclass
       AND contype  = 'c'
       AND pg_get_constraintdef(oid) LIKE '%status%'
       AND pg_get_constraintdef(oid) LIKE '%inactive%'
  ) THEN
    RAISE EXCEPTION 'VERIFY FAILED: the status CHECK now allows inactive';
  END IF;
END $$;

-- 00108 — give the 95 overdue unclaimed businesses their notice period back.
--
-- WHY: 00107 found that the takedown had never worked, leaving 95 businesses
-- past their removal date with 212 listings still live, the oldest 23 days
-- overdue. Separately, b71e55e found that every warning and final notice this
-- cadence has ever sent carried a claim link built from the cron's own request
-- url — the protected Vercel deployment host — so the one action those emails
-- asked for was impossible. These businesses were warned twice and could not
-- act either time.
--
-- Rather than remove listings on the strength of notices that could not be
-- answered, the clock is restarted: dormancy_final_sent_at is moved to now(),
-- so nothing is overdue and the takedown (whenever it is switched on; it is
-- currently off at TAKEDOWN_MAX_BUSINESSES_PER_RUN = 0) has a fresh week to
-- run against.
--
-- ⚠️ WHY now() AND NOT NULL. Pass 2 of the sweep selects on
-- `dormancy_final_sent_at IS NULL`, so clearing the column would make all 95
-- eligible again and send 95 final notices on the very next 09:00 run. That is
-- the opposite of the intent here, which is explicitly to restart the counter
-- WITHOUT another email. Moving the timestamp forward satisfies pass 2's
-- "already sent" check and resets only the takedown clock.
--
-- ⚠️ THIS BUYS SEVEN DAYS FROM THE APPLY DATE, NOT A PERMANENT REPRIEVE. These
-- rows fall overdue again a week after this runs. If the takedown is switched
-- on later than that, the same 95-business cliff is waiting, and the reset
-- should be repeated at that moment instead of relied on from this one.
--
-- Guarded to unclaimed businesses that are actually overdue: a business that
-- has since claimed, or one still inside its week, cannot be touched, and a
-- re-run is a no-op.
UPDATE business_profiles
   SET dormancy_final_sent_at = now()
 WHERE is_claimed = false
   AND dormancy_final_sent_at IS NOT NULL
   AND dormancy_final_sent_at <= now() - interval '7 days';

-- Verify without raising on success, and without touching a row.
-- (00107's first push failed because its verify block raised to roll itself
-- back, which aborts the real apply.)
DO $$
DECLARE v_overdue int;
BEGIN
  SELECT count(*) INTO v_overdue FROM business_profiles
   WHERE is_claimed = false
     AND dormancy_final_sent_at IS NOT NULL
     AND dormancy_final_sent_at <= now() - interval '7 days';

  IF v_overdue <> 0 THEN
    RAISE EXCEPTION 'VERIFY FAILED: % businesses still overdue after the reset', v_overdue;
  END IF;

  -- The reset must have SET a timestamp, never cleared one: a NULL here would
  -- make the row eligible for pass 2 and send the very email this migration
  -- exists to avoid. The UPDATE can only write now(), so this is a belt-and-
  -- braces check that it ran at all.
  IF NOT EXISTS (
    SELECT 1 FROM business_profiles
     WHERE is_claimed = false
       AND dormancy_final_sent_at > now() - interval '5 minutes'
  ) THEN
    RAISE EXCEPTION 'VERIFY FAILED: no row carries a freshly reset timestamp';
  END IF;

  -- NOTE: businesses whose FIRST warning is 7+ days old and whose final notice
  -- has not been sent are ordinary pass-2 candidates (7 of them at the time of
  -- writing). They are deliberately untouched here and will get their final
  -- notice on the normal schedule, now with a claim link that works. This
  -- migration only moves rows that were already past the TAKEDOWN cutoff.
END $$;

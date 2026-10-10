-- 00112 — structured housing cost, and whether it comes out of wages
--
-- `accommodation_cost` is TEXT and has ONE non-empty value on the whole
-- board: "¥60k per month". Nothing can be aggregated from that, so the
-- "staff housing cost by resort" page in AEO.md was unbuildable, and the
-- question workers actually ask — "is the rent taken out of my pay?" — had no
-- column at all. 36 live descriptions mention it in prose.
--
-- Four columns, mirroring how pay is already stored (amount + currency +
-- period), because that shape parses 100% of the time on 178 priced rows.
--
-- ⚠️ NO DEFAULTS ON ANY OF THEM, and `accommodation_cost_deducted` is a
-- NULLABLE boolean on purpose. `NOT NULL DEFAULT false` would assert "housing
-- is not deducted from pay" for 355 listings we know nothing about — which is
-- exactly what `pay_currency DEFAULT 'USD'` did, where a stamp meant for
-- "unknown" was read as a fact (00109). Unknown must stay unknown:
--
--     NULL  = the advert did not say
--     true  = the cost comes out of wages
--     false = the advert says it is paid separately
--
-- ⚠️ A CURRENCY WITH NOTHING TO DENOMINATE IS REFUSED BY THE DATABASE. The
-- CHECK below is the 00109 lesson written down where it cannot be forgotten:
-- there, a currency on a row with no amount survived for months and was read
-- as a claim about dollars. The same shape cannot happen here.

BEGIN;

ALTER TABLE job_posts
  ADD COLUMN IF NOT EXISTS accommodation_cost_amount   numeric,
  ADD COLUMN IF NOT EXISTS accommodation_cost_currency text,
  ADD COLUMN IF NOT EXISTS accommodation_cost_period   text,
  ADD COLUMN IF NOT EXISTS accommodation_cost_deducted boolean;

COMMENT ON COLUMN job_posts.accommodation_cost_amount IS
  'What staff housing costs the worker. NULL = not stated. 0 = explicitly free.';
COMMENT ON COLUMN job_posts.accommodation_cost_currency IS
  'Currency of accommodation_cost_amount. Must be NULL when there is no amount.';
COMMENT ON COLUMN job_posts.accommodation_cost_period IS
  'What the amount is per: night, week, month or season.';
COMMENT ON COLUMN job_posts.accommodation_cost_deducted IS
  'NULL = not stated, true = taken out of wages, false = paid separately. Never defaulted.';

-- Only the periods a housing cost is ever quoted in. "hour" and "total" are
-- deliberately absent: nobody rents a bed by the hour, and "total" is the
-- ambiguity that already makes 14 pay rows unusable.
ALTER TABLE job_posts
  ADD CONSTRAINT job_posts_accommodation_cost_period_check
  CHECK (accommodation_cost_period IS NULL
         OR accommodation_cost_period IN ('night', 'week', 'month', 'season'));

-- A cost must be a cost: no negatives.
ALTER TABLE job_posts
  ADD CONSTRAINT job_posts_accommodation_cost_amount_check
  CHECK (accommodation_cost_amount IS NULL OR accommodation_cost_amount >= 0);

-- ⚠️ THE 00109 LESSON, ENFORCED. A currency or a period with no amount beside
-- it denominates nothing, and is exactly how 'USD' came to mean "no pay
-- found" for 177 listings. Here the database refuses it outright.
ALTER TABLE job_posts
  ADD CONSTRAINT job_posts_accommodation_cost_coherent_check
  CHECK (accommodation_cost_amount IS NOT NULL
         OR (accommodation_cost_currency IS NULL AND accommodation_cost_period IS NULL));

CREATE INDEX IF NOT EXISTS job_posts_accommodation_cost_idx
  ON job_posts (accommodation_cost_amount)
  WHERE accommodation_cost_amount IS NOT NULL;

-- ── the one row that already had a cost ──────────────────────────────────
-- "¥60k per month" — the only non-empty accommodation_cost on the board.
-- Pinned by its exact current text, so this cannot touch anything else and a
-- re-run is a no-op. The free-text column is KEPT: it is what a human wrote,
-- and the structured columns are a reading of it, not a replacement.
UPDATE job_posts
   SET accommodation_cost_amount   = 60000,
       accommodation_cost_currency = 'JPY',
       accommodation_cost_period   = 'month'
 WHERE btrim(accommodation_cost) = '¥60k per month'
   AND accommodation_cost_amount IS NULL;

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  cols        int;
  defaulted   int;
  incoherent  int;
  deducted_nn int;
  parsed      int;
BEGIN
  SELECT count(*) INTO cols FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'job_posts'
     AND column_name IN ('accommodation_cost_amount', 'accommodation_cost_currency',
                         'accommodation_cost_period', 'accommodation_cost_deducted');
  IF cols <> 4 THEN
    RAISE EXCEPTION 'expected 4 new columns, found %', cols;
  END IF;

  -- ⚠️ The whole point. A default here would make "unknown" indistinguishable
  -- from an answer, which is the bug 00109 had to undo.
  SELECT count(*) INTO defaulted FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'job_posts'
     AND column_name LIKE 'accommodation_cost_%'
     AND column_default IS NOT NULL;
  IF defaulted > 0 THEN
    RAISE EXCEPTION '% of the new housing-cost columns carry a default', defaulted;
  END IF;

  SELECT count(*) INTO deducted_nn FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'job_posts'
     AND column_name = 'accommodation_cost_deducted' AND is_nullable = 'NO';
  IF deducted_nn > 0 THEN
    RAISE EXCEPTION 'accommodation_cost_deducted is NOT NULL — unknown must stay unknown';
  END IF;

  SELECT count(*) INTO incoherent FROM job_posts
   WHERE accommodation_cost_amount IS NULL
     AND (accommodation_cost_currency IS NOT NULL OR accommodation_cost_period IS NOT NULL);
  IF incoherent > 0 THEN
    RAISE EXCEPTION '% rows carry a housing currency or period with no amount', incoherent;
  END IF;

  SELECT count(*) INTO parsed FROM job_posts WHERE accommodation_cost_amount IS NOT NULL;
  RAISE NOTICE 'housing cost columns added; % row(s) carry a structured cost', parsed;
END $$;

COMMIT;

-- 00109 — pay_currency stops meaning "no pay"
--
-- `job_posts.pay_currency` carried a column default of 'USD', and the import
-- route omits the field whenever extraction found no currency. So an omitted
-- currency became US dollars, on a board with NO US resorts.
--
-- Measured on 2026-10-10, open listings only: 177 of 341 said USD. Cross-
-- tabbed against the resort's country it was unmistakable — 124/124 CAD rows
-- and 40/40 JPY rows carried pay, while 0/58 Canadian-USD and 0/115
-- Japanese-USD rows did. The stamp landed exactly where there was nothing to
-- denominate. Any page quoting the column captioned Canadian and Japanese
-- wages as US dollars, and the first thing it broke was the pay analysis this
-- was found by.
--
-- Two questions, two different answers:
--     nothing to denominate -> NULL
--     priced but unnamed    -> the resort's country (lib/jobs/currency.ts)
--
-- ⚠️ REQUIRED THE CODE TO SHIP FIRST, and it has. Three readers invented a
-- currency where the row had none — /jobs handed the board `|| "USD"`, worker
-- interviews rendered `|| "AUD"` — so nulling the column before that was
-- deployed would have changed nothing on screen and hidden the fix. The
-- import route now resolves the currency instead of omitting the field, so
-- the next scrape cannot rebuild what this clears.

BEGIN;

-- ── 1. The default itself ────────────────────────────────────────────────
-- This is the actual bug. Everything below is cleaning up after it.
ALTER TABLE job_posts ALTER COLUMN pay_currency DROP DEFAULT;

-- ── 2. No pay, no currency ───────────────────────────────────────────────
-- 208 rows across the whole table: 179 USD plus 29 AUD. The 29 are paused
-- Australian listings carrying the business post-job form's `|| "AUD"`
-- default; none has a pay amount OR any salary text, so the currency
-- denominates nothing and clearing it cannot change a rendered page.
UPDATE job_posts
   SET pay_currency = NULL
 WHERE coalesce(btrim(pay_amount), '') = ''
   AND coalesce(btrim(salary_range), '') = ''
   AND pay_currency IS NOT NULL;

-- ── 3. Priced, but wearing the default ───────────────────────────────────
-- Exactly one row: a Méribel door-security listing reading USD 2500/month.
-- Its description says only "QUALIFIED DOOR SECURITY WANTED FOR FRANCE." — no
-- currency anywhere — so the USD came from this default, not the advert.
--
-- ⚠️ GUARDED ON r.country <> 'USA' so a genuine American listing priced in
-- USD is never touched. The country currency is an INFERENCE, which is
-- exactly why it is only applied where the alternative is a currency we know
-- to be wrong.
UPDATE job_posts j
   SET pay_currency = c.code
  FROM resorts r,
       (VALUES ('Andorra','EUR'), ('Argentina','ARS'), ('Australia','AUD'),
               ('Austria','EUR'),  ('Canada','CAD'),   ('Chile','CLP'),
               ('France','EUR'),   ('Georgia','GEL'),  ('Italy','EUR'),
               ('Japan','JPY'),    ('New Zealand','NZD'), ('Sweden','SEK'),
               ('Switzerland','CHF'), ('USA','USD')) AS c(country, code)
 WHERE r.id = j.resort_id
   AND c.country = r.country
   AND coalesce(btrim(j.pay_amount), '') <> ''
   AND j.pay_currency = 'USD'
   AND r.country <> 'USA';

-- ── 4. The one salary_range with no currency prefix ──────────────────────
-- Every other row reads "{CUR} {amount}/{period}"; this one read
-- "2500/month" because there was no currency to prefix with. Now there is.
UPDATE job_posts j
   SET salary_range = j.pay_currency || ' ' || btrim(j.salary_range)
 WHERE coalesce(btrim(j.salary_range), '') <> ''
   AND j.salary_range !~ '^[A-Z]{3} '
   AND j.pay_currency IS NOT NULL
   AND coalesce(btrim(j.pay_amount), '') <> '';

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  still_default   text;
  phantom_cur     int;
  priced_no_cur   int;
  wrong_country   int;
  unprefixed      int;
  priced_total    int;
BEGIN
  SELECT column_default INTO still_default
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'job_posts'
     AND column_name = 'pay_currency';
  IF still_default IS NOT NULL THEN
    RAISE EXCEPTION 'pay_currency still has a column default: %', still_default;
  END IF;

  -- A currency with nothing to denominate is the bug restated.
  SELECT count(*) INTO phantom_cur FROM job_posts
   WHERE coalesce(btrim(pay_amount), '') = ''
     AND coalesce(btrim(salary_range), '') = ''
     AND pay_currency IS NOT NULL;
  IF phantom_cur > 0 THEN
    RAISE EXCEPTION '% rows still carry a currency with no pay', phantom_cur;
  END IF;

  -- And the opposite: an amount on screen with no unit beside it.
  SELECT count(*) INTO priced_no_cur FROM job_posts
   WHERE coalesce(btrim(pay_amount), '') <> '' AND pay_currency IS NULL;
  IF priced_no_cur > 0 THEN
    RAISE EXCEPTION '% priced rows have no currency', priced_no_cur;
  END IF;

  -- No USD left outside the USA.
  SELECT count(*) INTO wrong_country
    FROM job_posts j JOIN resorts r ON r.id = j.resort_id
   WHERE j.pay_currency = 'USD' AND r.country <> 'USA';
  IF wrong_country > 0 THEN
    RAISE EXCEPTION '% rows still say USD at a non-US resort', wrong_country;
  END IF;

  SELECT count(*) INTO unprefixed FROM job_posts
   WHERE coalesce(btrim(salary_range), '') <> '' AND salary_range !~ '^[A-Z]{3} ';
  IF unprefixed > 0 THEN
    RAISE EXCEPTION '% salary_range values have no currency prefix', unprefixed;
  END IF;

  -- Nothing was supposed to lose its pay. 191 rows carry pay text today.
  SELECT count(*) INTO priced_total FROM job_posts
   WHERE coalesce(btrim(pay_amount), '') <> '';
  IF priced_total <> 191 THEN
    RAISE EXCEPTION 'priced rows changed from 191 to % — this migration must not touch pay', priced_total;
  END IF;

  RAISE NOTICE 'pay_currency: default dropped, % priced rows intact, 0 phantom currencies', priced_total;
END $$;

COMMIT;

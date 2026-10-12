-- 00118 — store the advert's language, and an English translation of it
--
-- `job_posts.description` is the raw advert VERBATIM — import.ts sends
-- `row.post.text`, untranslated. That is the right call and does not change
-- here: it is what the employer actually wrote. But 59 of 360 open listings
-- already carry Japanese, Italy has just started, and France is on the board,
-- so a growing share of listings cannot be read by the workers they are for.
--
-- ⚠️ NEITHER COLUMN GETS A DEFAULT, AND NULL MEANS "WE DO NOT KNOW".
-- `description_en IS NULL` means no translation exists — it must NEVER come to
-- mean "the post was already English", because the UI decides whether to offer
-- a translation from exactly this. That conflation is the single most
-- expensive mistake in this schema's history: pay_currency DEFAULT 'USD' made
-- "no pay found" indistinguishable from "priced in dollars" (00109), and
-- ski_pass_included / meal_perks / accommodation_included each had NOT NULL
-- DEFAULT false make "the advert did not say" indistinguishable from "no"
-- (00114, 00115). Four times. Not a fifth.
--
-- `post_language` is the ISO 639-1 code the extractor ALREADY produces and
-- the job importer was throwing away — it was only ever stored for worker
-- leads. It matters because a charset test cannot find a post that needs
-- translating: Japanese is detectable, Italian and French are Latin script
-- and look exactly like English to a regex. The same blind spot made an
-- English-only verification regex twice report correct extractions as errors
-- (免費員工住宿, 季票).
--
-- ⚠️ THE TITLE IS NEVER TRANSLATED AND HAS NO COLUMN HERE. jobTitle is
-- already normalised to English by the extractor BECAUSE it is matched
-- against English resort and town tables and read by English-speaking
-- workers. Translating it would break the import's own matching.

BEGIN;

ALTER TABLE job_posts
  ADD COLUMN IF NOT EXISTS post_language  text,
  ADD COLUMN IF NOT EXISTS description_en text;

COMMENT ON COLUMN job_posts.post_language IS
  'ISO 639-1 code of the ORIGINAL advert, from extraction. NULL = unknown, never assume en.';
COMMENT ON COLUMN job_posts.description_en IS
  'English translation of description, for non-English adverts. NULL = none exists. Machine translated — the page must say so and must keep the original reachable.';

-- Only worth an index for "which listings still need backfilling".
CREATE INDEX IF NOT EXISTS job_posts_untranslated_idx
  ON job_posts (post_language)
  WHERE description_en IS NULL AND post_language IS NOT NULL AND post_language <> 'en';

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  has_default int;
  not_null    int;
  rows_before int;
BEGIN
  SELECT count(*) INTO has_default FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'job_posts'
     AND column_name IN ('post_language','description_en') AND column_default IS NOT NULL;
  IF has_default > 0 THEN
    RAISE EXCEPTION '% new column(s) carry a default — NULL must stay the unknown', has_default;
  END IF;

  SELECT count(*) INTO not_null FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'job_posts'
     AND column_name IN ('post_language','description_en') AND is_nullable = 'NO';
  IF not_null > 0 THEN
    RAISE EXCEPTION '% new column(s) are NOT NULL — unknown could not be stored', not_null;
  END IF;

  -- Adding columns must not touch a single row.
  SELECT count(*) INTO rows_before FROM job_posts
   WHERE post_language IS NOT NULL OR description_en IS NOT NULL;
  IF rows_before > 0 THEN
    RAISE EXCEPTION '% row(s) already carry a value — this migration should add nothing', rows_before;
  END IF;

  RAISE NOTICE 'post_language and description_en added, both nullable, no rows touched';
END $$;

COMMIT;

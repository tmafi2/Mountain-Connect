-- 00124 — did the applicant agree to their application being shared?
--
-- `expressions_of_interest.message` is a cover letter: the apply form asks
-- "Why are you a good fit for the <role>?" and 285 of 308 applications have
-- one, averaging about 500 characters. They are the most persuasive thing we
-- could put in a claim email — a real person who took real trouble beats any
-- count — and they are also somebody else's personal data.
--
-- ⚠️ THE PRIVACY POLICY COVERS READING, NOT PUSHING. It says the hiring
-- business "can view" the cover letter on application, which describes a
-- signed-in business opening an application. Mailing it unprompted to an
-- address scraped from a Facebook advert, belonging to a business that has
-- not claimed, has agreed to nothing and whose address we have never
-- verified, is a different act. `claim-applicants-waiting.ts` already says so
-- in its own header: "counts, never names ... exactly the kind of detail a
-- business should see only after signing in."
--
-- So the applicant gets asked.
--
-- ⚠️ NO DEFAULT, AND NULL MEANS "WE NEVER ASKED". The 308 existing rows
-- predate the checkbox and must not be read as either answer. true = ticked
-- it, false = saw it and left it unticked, NULL = the question did not exist
-- when they applied. That is the fifth time this schema has needed saying:
-- pay_currency DEFAULT 'USD' (00109), and ski_pass_included / meal_perks /
-- accommodation_included as NOT NULL DEFAULT false (00114, 00115), each made
-- "unknown" indistinguishable from "no".
--
-- ⚠️ IT MUST DEFAULT TO UNTICKED IN THE FORM. A pre-ticked box is not consent
-- under GDPR, and the whole point of the column is to be able to say the
-- applicant agreed. Uptake will be lower than if it were pre-ticked. That is
-- the cost of it meaning anything.
--
-- What reads it: lib/email/cover-letter-excerpt.ts decides whether a claim
-- email may quote the letter. A NULL row may still yield a sanitised excerpt
-- — short, and only when the text carries no email, no phone number and no
-- self-naming — because those applicants were never offered the choice. A
-- FALSE row is never quoted at all.

BEGIN;

ALTER TABLE expressions_of_interest
  ADD COLUMN IF NOT EXISTS share_with_employer boolean;

COMMENT ON COLUMN expressions_of_interest.share_with_employer IS
  'Did the applicant tick "share my application with this employer"? NULL = the question did not exist when they applied; never assume either answer.';

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  has_default int;
  not_null    int;
  non_null    int;
  rows_now    int;
BEGIN
  SELECT count(*) INTO has_default FROM information_schema.columns
   WHERE table_name = 'expressions_of_interest' AND column_name = 'share_with_employer'
     AND column_default IS NOT NULL;
  IF has_default > 0 THEN
    RAISE EXCEPTION 'share_with_employer has a DEFAULT — it must not; NULL means "never asked"';
  END IF;

  SELECT count(*) INTO not_null FROM information_schema.columns
   WHERE table_name = 'expressions_of_interest' AND column_name = 'share_with_employer'
     AND is_nullable = 'NO';
  IF not_null > 0 THEN
    RAISE EXCEPTION 'share_with_employer is NOT NULL — it must be nullable';
  END IF;

  -- Every existing row must stay unanswered. A backfill here would be an
  -- assertion about consent nobody gave.
  SELECT count(*) INTO non_null FROM expressions_of_interest WHERE share_with_employer IS NOT NULL;
  IF non_null > 0 THEN
    RAISE EXCEPTION '% existing row(s) carry a consent value; none should', non_null;
  END IF;

  SELECT count(*) INTO rows_now FROM expressions_of_interest;
  RAISE NOTICE 'share_with_employer added; % existing applications left unanswered', rows_now;
END $$;

COMMIT;

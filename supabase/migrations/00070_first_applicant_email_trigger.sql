-- 00070_first_applicant_email_trigger.sql
--
-- Adds a per-business flag for the new "first applicant" outreach email
-- (separate from the existing 5-threshold flag eoi_nudge_sent_at), then
-- back-fills it for every unclaimed business that already has at least one
-- EOI in their queue so we don't surprise existing businesses with an
-- email about a "first applicant" they actually received weeks ago.

ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS first_applicant_email_sent_at timestamptz;

COMMENT ON COLUMN business_profiles.first_applicant_email_sent_at IS
  'When the one-shot first-applicant nudge email was sent to an unclaimed
   business. NULL means it has not been sent yet. Independent of
   eoi_nudge_sent_at (which fires at 5+ EOIs).';

-- Back-fill: mark every unclaimed business that already has at least one
-- EOI as "already notified" so the new trigger only fires for genuinely
-- fresh first applicants going forward.
UPDATE business_profiles bp
SET first_applicant_email_sent_at = now()
WHERE bp.is_claimed = false
  AND bp.first_applicant_email_sent_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM expressions_of_interest eoi
    JOIN job_posts jp ON jp.id = eoi.job_post_id
    WHERE jp.business_id = bp.id
  );

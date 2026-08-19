-- ============================================================
-- Migration 00088: gate the import outreach email per business
-- ============================================================
-- Every other email in the claim cadence is gated by its own sent-at
-- column, so at most one of each ever fires: eoi_nudge_sent_at,
-- first_applicant_email_sent_at, dormancy_warning_sent_at. The initial
-- "we imported your listing, come claim it" outreach is the one type with
-- no such gate — it fires once per PUBLISHED JOB rather than once per
-- business.
--
-- That has been survivable while listings were approved one at a time and
-- most businesses had one. It stops being survivable now: we import one
-- listing per ROLE, so the current queue holds 76 pending jobs across 21
-- businesses, and approving them would send Seasons Niseko thirteen
-- separate claim emails in one burst. That is a spam complaint from
-- exactly the businesses we are trying to recruit.
--
-- NULL means "never sent", so every existing business is eligible for one
-- outreach email and nobody is retroactively silenced. /admin/resend-
-- outreach deliberately ignores this column: a human choosing to resend is
-- not the automatic path this guards.
-- ============================================================

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS import_outreach_sent_at timestamptz;

COMMENT ON COLUMN public.business_profiles.import_outreach_sent_at IS
  'When the import/claim outreach email was first sent to this business. '
  'NULL = never sent. Set by /api/admin/publish-job and /api/admin/publish-jobs '
  'so publishing several of a business''s listings emails them once, not once '
  'per listing. Manual resends via /api/admin/resend-outreach ignore it.';

-- The publish path asks "has this business been emailed yet?" for a small
-- set of ids, so a partial index over the not-yet-emailed rows is the
-- useful shape.
CREATE INDEX IF NOT EXISTS idx_business_profiles_awaiting_outreach
  ON public.business_profiles (id)
  WHERE import_outreach_sent_at IS NULL;

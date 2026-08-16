-- ============================================================
-- Migration 00083: track the one-off paid-plans announcement email
-- ============================================================
-- scripts/send-paid-plans-announcement.ts stamps this when it emails a
-- pre-billing business about the move to paid plans + their founding rate,
-- so a re-run never emails anyone twice. NULL = not yet sent.
ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS paid_plans_notice_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.business_profiles.paid_plans_notice_sent_at IS
  'When the one-off paid-plans / founding-rate announcement email was sent. NULL = not sent.';

-- ============================================================
-- Migration 00080: Billing & subscription state on business_profiles
-- ============================================================
-- Introduces paid plans. Until now `tier` was a manually-set admin flag and
-- there was no payment provider. This adds the columns needed to drive tier
-- from a Stripe subscription, run a 30-day trial, and give existing
-- (pre-billing) businesses a per-business courtesy window instead of the
-- global LAUNCH_GRACE_PERIOD switch.
--
-- Semantics:
--   tier                 = the EFFECTIVE tier everything already reads
--                          (kept; now written by the billing webhook /
--                          grace-period logic rather than only by admins)
--   selected_tier        = the paid plan the business chose at checkout
--                          (what they get billed for). NULL if never chose.
--   subscription_status  = mirror of Stripe subscription status
--   billing_interval     = 'month' or 'season' (season = the ~6-month pass)
--   trial_ends_at        = end of the 30-day free trial
--   current_period_end   = when the current paid period ends / renews
--   is_founding_member   = locked-in founding pricing while continuously
--                          subscribed
--   grace_period_ends_at = courtesy window for businesses that signed up
--                          before billing existed. While in the future the
--                          business is treated as premium regardless of
--                          tier/subscription. NULL = no courtesy window.
--
-- Idempotent: safe to re-run.

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id      TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id  TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status     TEXT,
  ADD COLUMN IF NOT EXISTS selected_tier           TEXT,
  ADD COLUMN IF NOT EXISTS billing_interval        TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_founding_member      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_updated_at      TIMESTAMPTZ;

-- Constrain the enum-ish text columns. Dropped first so re-runs are clean.
ALTER TABLE public.business_profiles
  DROP CONSTRAINT IF EXISTS business_profiles_subscription_status_check;
ALTER TABLE public.business_profiles
  ADD CONSTRAINT business_profiles_subscription_status_check
  CHECK (subscription_status IS NULL OR subscription_status IN (
    'trialing', 'active', 'past_due', 'canceled', 'unpaid',
    'incomplete', 'incomplete_expired', 'paused'
  ));

ALTER TABLE public.business_profiles
  DROP CONSTRAINT IF EXISTS business_profiles_selected_tier_check;
ALTER TABLE public.business_profiles
  ADD CONSTRAINT business_profiles_selected_tier_check
  CHECK (selected_tier IS NULL OR selected_tier IN ('standard', 'premium', 'enterprise'));

ALTER TABLE public.business_profiles
  DROP CONSTRAINT IF EXISTS business_profiles_billing_interval_check;
ALTER TABLE public.business_profiles
  ADD CONSTRAINT business_profiles_billing_interval_check
  CHECK (billing_interval IS NULL OR billing_interval IN ('month', 'season'));

-- Stripe IDs are looked up by the webhook on every event; customer id is
-- unique per business.
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_profiles_stripe_customer
  ON public.business_profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_profiles_stripe_subscription
  ON public.business_profiles(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
-- Cron / dashboards scan for expiring trials and grace windows.
CREATE INDEX IF NOT EXISTS idx_business_profiles_trial_ends
  ON public.business_profiles(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_business_profiles_grace_ends
  ON public.business_profiles(grace_period_ends_at)
  WHERE grace_period_ends_at IS NOT NULL;

-- ------------------------------------------------------------
-- Courtesy window for existing businesses.
-- Every business that exists at the moment billing launches was told the
-- platform was free during launch, and our Terms promise advance notice of
-- pricing changes. Give each of them 60 days of premium-level access from
-- now, after which they fall to whatever their subscription (or free tier)
-- gives them. Only stamps rows that don't already have a window, so
-- re-running never extends anyone.
-- ------------------------------------------------------------
UPDATE public.business_profiles
SET grace_period_ends_at = now() + interval '60 days'
WHERE grace_period_ends_at IS NULL;

COMMENT ON COLUMN public.business_profiles.tier IS
  'Effective tier. Driven by subscription state / grace period; admin can still override.';
COMMENT ON COLUMN public.business_profiles.selected_tier IS
  'Paid plan chosen at checkout (what is billed). NULL if never subscribed.';
COMMENT ON COLUMN public.business_profiles.grace_period_ends_at IS
  'Pre-billing courtesy window: premium access until this time regardless of subscription.';
COMMENT ON COLUMN public.business_profiles.is_founding_member IS
  'Locked-in founding pricing while continuously subscribed.';

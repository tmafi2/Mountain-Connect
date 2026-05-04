-- 00073_outreach_campaigns.sql
--
-- Outreach campaign tables. Lets admins collect emails for businesses
-- not yet on the platform, send them template emails (manually first,
-- drip cron after), and auto-stop sending the moment a matching
-- business signs up. Each lead carries an unsubscribe token so the
-- "unsubscribe" link in every funnel email can flip the lead to
-- unsubscribed without auth.

BEGIN;

-- ── outreach_leads ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.outreach_leads (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                    text NOT NULL,
  business_name            text NOT NULL,
  -- Location: a lead is associated with a resort OR a town (or neither
  -- yet, if we're collecting before we know). Both nullable; templates
  -- pick whichever is set when personalising.
  resort_id                uuid REFERENCES public.resorts(id) ON DELETE SET NULL,
  town_id                  uuid REFERENCES public.nearby_towns(id) ON DELETE SET NULL,
  notes                    text,
  status                   text NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'signed_up', 'unsubscribed')),
  signed_up_business_id    uuid REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  signed_up_at             timestamptz,
  unsubscribed_at          timestamptz,
  -- Per-lead token used in the unsubscribe URL. Public route looks
  -- this up without auth, so it must be unguessable. Default to a
  -- fresh UUID; anyone with the token can unsubscribe themselves.
  unsubscribe_token        text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  added_by                 uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- One lead per email (case-insensitive). If we re-import the same
-- email later we update the existing row instead of duplicating.
CREATE UNIQUE INDEX IF NOT EXISTS outreach_leads_email_unique
  ON public.outreach_leads (lower(email));

CREATE UNIQUE INDEX IF NOT EXISTS outreach_leads_unsubscribe_token_unique
  ON public.outreach_leads (unsubscribe_token);

CREATE INDEX IF NOT EXISTS outreach_leads_status_idx
  ON public.outreach_leads (status);

-- ── outreach_sends ─────────────────────────────────────────
-- One row per email actually sent. Lets the drip cron know "what was
-- the last template sent to this lead, and how long ago" without
-- re-querying Resend. Keeps a permanent audit trail of admin sends.
CREATE TABLE IF NOT EXISTS public.outreach_sends (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid NOT NULL REFERENCES public.outreach_leads(id) ON DELETE CASCADE,
  template_name   text NOT NULL,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  -- NULL when the cron sent it, populated when an admin manually triggered.
  sent_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  resend_id       text,
  status          text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message   text
);

CREATE INDEX IF NOT EXISTS outreach_sends_lead_sent_idx
  ON public.outreach_sends (lead_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS outreach_sends_template_idx
  ON public.outreach_sends (template_name);

-- ── updated_at touch trigger ────────────────────────────────
CREATE OR REPLACE FUNCTION public.outreach_leads_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS outreach_leads_touch_updated_at_trigger ON public.outreach_leads;
CREATE TRIGGER outreach_leads_touch_updated_at_trigger
BEFORE UPDATE ON public.outreach_leads
FOR EACH ROW
EXECUTE FUNCTION public.outreach_leads_touch_updated_at();

-- ── auto-flip lead to signed_up when matching business signs up ───
-- Watches business_profiles inserts; if the new business's email
-- matches an active lead, the lead is marked signed_up and linked.
-- The drip cron skips signed_up leads, so emailing stops immediately.
CREATE OR REPLACE FUNCTION public.outreach_mark_lead_signed_up()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;
  UPDATE public.outreach_leads
  SET status = 'signed_up',
      signed_up_business_id = NEW.id,
      signed_up_at = now()
  WHERE lower(email) = lower(NEW.email)
    AND status = 'active';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS outreach_mark_lead_signed_up_trigger ON public.business_profiles;
CREATE TRIGGER outreach_mark_lead_signed_up_trigger
AFTER INSERT ON public.business_profiles
FOR EACH ROW
EXECUTE FUNCTION public.outreach_mark_lead_signed_up();

-- ── RLS — admin only for both tables ───────────────────────
ALTER TABLE public.outreach_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all outreach leads"
  ON public.outreach_leads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert outreach leads"
  ON public.outreach_leads FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update outreach leads"
  ON public.outreach_leads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete outreach leads"
  ON public.outreach_leads FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can read all outreach sends"
  ON public.outreach_sends FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- All inserts/updates to outreach_sends and the unsubscribe flip on
-- outreach_leads happen via the service-role client (which bypasses
-- RLS), so no insert policies needed for those paths.

COMMIT;

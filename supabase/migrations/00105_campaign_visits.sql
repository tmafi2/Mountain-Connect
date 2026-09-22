-- ═══ 00105: A CONSENT-FREE COUNT OF CAMPAIGN LANDING PAGE HITS ═════════
-- On 20–22 Sept the Meta ad reported 115 landing page views and GA4 saw 6
-- people on the same page. Both GA4 and the Meta pixel load only after the
-- cookie banner is accepted, so every number we have describes the minority
-- who consent, while Meta counts the page load natively inside Instagram's
-- in-app browser and needs nothing from us.
--
-- The six we could see converted at 33% — everyone started the quiz, five of
-- six finished it, two signed up. So the page is not the problem. What the
-- other 109 did is the question, and it is currently unanswerable: "bounced
-- instantly" and "ignored the cookie banner" produce identical data and need
-- opposite fixes. A request is a request whether or not anyone consents, so
-- counting server-side settles it.
--
-- ⚠️ WHAT THIS TABLE MUST NEVER HOLD: no IP address, no raw user agent, no
-- cookie, no identifier. A row is a timestamp, which page, which ad, and two
-- booleans — a counter, not tracking. That is what keeps it outside the
-- consent banner and outside the promises the privacy policy makes. Adding a
-- column that could single out a person would require consent, and would
-- therefore stop measuring exactly the traffic this exists to measure.
--
-- Written by middleware (event.waitUntil, so it never delays a response), not
-- by the page: /go-for-a-season is deliberately static and cached so a burst
-- of paid traffic costs nothing per visit, and making it dynamic to count
-- hits would undo that.

CREATE TABLE IF NOT EXISTS public.campaign_visits (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path           text NOT NULL,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  in_app_browser boolean NOT NULL DEFAULT false,
  likely_bot     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Every question asked of this table is "how many, over what period",
-- usually excluding bots.
CREATE INDEX IF NOT EXISTS campaign_visits_created_at_idx
  ON public.campaign_visits (created_at DESC);
CREATE INDEX IF NOT EXISTS campaign_visits_real_traffic_idx
  ON public.campaign_visits (path, created_at DESC) WHERE NOT likely_bot;

-- Service-role only, exactly like lead_posts: RLS on with NO policy, so it
-- fails closed for anon and authenticated callers alike. Nothing user-facing
-- reads it, and nothing should.
ALTER TABLE public.campaign_visits ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.campaign_visits IS
  'Consent-free count of campaign landing page requests. No IP, no user agent, no identifier — see 00105.';

-- ═══ VERIFY ════════════════════════════════════════════════════════════
DO $$
DECLARE
  rls boolean;
  policies INT;
  cols INT;
BEGIN
  SELECT relrowsecurity INTO rls FROM pg_class WHERE oid = 'public.campaign_visits'::regclass;
  IF NOT rls THEN
    RAISE EXCEPTION '00105: RLS is not enabled on campaign_visits';
  END IF;

  SELECT count(*) INTO policies FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'campaign_visits';
  IF policies <> 0 THEN
    RAISE EXCEPTION '00105: expected no policies (service-role only), found %', policies;
  END IF;

  -- Guards the promise in the comment above: a future migration adding an ip
  -- or user_agent column should fail this and make somebody think.
  SELECT count(*) INTO cols FROM information_schema.columns
   WHERE table_name = 'campaign_visits'
     AND column_name IN ('ip', 'ip_address', 'user_agent', 'session_id', 'visitor_id', 'email');
  IF cols <> 0 THEN
    RAISE EXCEPTION '00105: campaign_visits must hold no identifying column, found %', cols;
  END IF;

  RAISE NOTICE '00105 ok: campaign_visits created, RLS on, no policies, no identifying columns';
END $$;

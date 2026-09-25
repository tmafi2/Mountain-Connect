-- ═══ 00106: THE FUNNEL, COUNTED WITHOUT CONSENT ════════════════════════
-- 00105 counted who REACHES the landing page. This counts what they do next.
--
-- The numbers that forced it, 23–24 September: the server-side counter saw
-- 117 real people on /go-for-a-season while GA4 saw 7. GA4 and the Meta Pixel
-- both load only after the cookie banner is accepted, and the banner does not
-- block anything, so almost nobody answers it — and "has not answered" loads
-- no analytics at all. Every funnel number we had described the ~6% who
-- happened to tap Accept, who are self-evidently the most engaged visitors on
-- the page. Measuring them and calling it a conversion rate is measuring your
-- best visitors and calling it the average; it is how "the six we could see
-- converted at 33%" survived alongside a true rate of about 1%.
--
-- ⚠️ SAME RULE AS 00105, AND IT IS THE WHOLE POINT: no IP, no user agent, no
-- cookie, no session id, no identifier of any kind. A row is a timestamp, an
-- event name, the quiz answers behind it, and two booleans.
--
-- That has a REAL COST, accepted deliberately: with nothing joining one
-- visitor's events together, this yields event COUNTS, not unique users. It
-- can say "90 started the quiz and 50 finished", never "this person did". A
-- per-visit random id would give unique counts and would also be the thing
-- that turns a counter into tracking — which would require consent, and would
-- therefore go blind to exactly the traffic it exists to measure. Counts are
-- enough to find where the drop is, which is the entire job.
--
-- The props are columns rather than jsonb because FunnelProps in
-- lib/analytics/track.ts is a closed set of four keys, and a closed set is
-- worth spending columns on: the funnel queries stay readable and a stray key
-- cannot be written at all.

CREATE TABLE IF NOT EXISTS public.campaign_events (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event          text NOT NULL,
  destination    text,
  season         text,
  work_type      text,
  placement      text,
  in_app_browser boolean NOT NULL DEFAULT false,
  likely_bot     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Every question is "how many of each event, over what period, excluding bots".
CREATE INDEX IF NOT EXISTS campaign_events_funnel_idx
  ON public.campaign_events (event, created_at DESC) WHERE NOT likely_bot;
CREATE INDEX IF NOT EXISTS campaign_events_created_at_idx
  ON public.campaign_events (created_at DESC);

-- Service-role only, like campaign_visits and lead_posts: RLS on, no policy.
ALTER TABLE public.campaign_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.campaign_events IS
  'Consent-free funnel event counts. No IP, no user agent, no identifier, no way to join a visitor''s events — see 00106.';

-- ═══ VERIFY ════════════════════════════════════════════════════════════
DO $$
DECLARE
  rls boolean;
  policies INT;
  identifying INT;
BEGIN
  SELECT relrowsecurity INTO rls FROM pg_class WHERE oid = 'public.campaign_events'::regclass;
  IF NOT rls THEN RAISE EXCEPTION '00106: RLS is not enabled on campaign_events'; END IF;

  SELECT count(*) INTO policies FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'campaign_events';
  IF policies <> 0 THEN
    RAISE EXCEPTION '00106: expected no policies (service-role only), found %', policies;
  END IF;

  -- The promise above, enforced. A future migration adding any of these should
  -- fail here and make somebody argue for it out loud.
  SELECT count(*) INTO identifying FROM information_schema.columns
   WHERE table_name = 'campaign_events'
     AND column_name IN ('ip', 'ip_address', 'user_agent', 'session_id', 'visitor_id',
                         'client_id', 'anonymous_id', 'email', 'user_id');
  IF identifying <> 0 THEN
    RAISE EXCEPTION '00106: campaign_events must hold nothing that identifies or joins a visitor, found %', identifying;
  END IF;

  RAISE NOTICE '00106 ok: campaign_events created, RLS on, no policies, no identifying columns';
END $$;

-- ═══ 00103: SIX BC RESORTS THE OUTREACH LIST NEEDS ═════════════════════
-- The companion to 00102. That migration added the nine towns; these are
-- the six resorts above them, which 29 leads on the Canadian outreach list
-- are attached to and which the importer therefore rejects:
--
--   Whitewater Ski Resort (Nelson)      10 leads
--   RED Mountain Resort (Rossland)       6
--   Panorama Mountain Resort (Invermere) 6
--   Apex Mountain Resort (Penticton)     3
--   Cypress Mountain (West Vancouver)    2
--   Baldy Mountain Resort (Oliver)       2
--
-- ⚠️ A resort row alone is NOT a resort. `/resorts/[id]` renders from the
-- static `lib/data/resorts.ts` array keyed on legacy_id, so a database row
-- with no matching static entry unblocks the importer and 404s its own
-- page. The static entries (legacy ids 109–114) ship in the same commit;
-- neither half is any use alone.
--
-- Cypress gets no resort_nearby_towns link: its workers live across Metro
-- Vancouver, and we carry no town there. The Nearby Towns section is
-- conditional, so the page renders without it — add a town later if the
-- North Shore becomes a real segment rather than inventing one now.
--
-- Idempotent (ON CONFLICT DO NOTHING) and self-verifying (final DO block).

INSERT INTO public.resorts (
  legacy_id, name, region_id, country, state_province, nearest_town,
  description, latitude, longitude,
  base_elevation_m, summit_elevation_m, vertical_drop_m,
  num_runs, num_lifts, skiable_terrain_ha, snowfall_avg_cm,
  season_start, season_end, snow_reliability, website, banner_image_url
) VALUES
  ('109', 'Whitewater Ski Resort',
    (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
    'Canada', 'British Columbia', 'Nelson',
    'A locals'' mountain in the Selkirks 20km south of Nelson, with a reputation out of all proportion to its size: roughly 12 metres of dry Kootenay snow a year and no snowmaking at all. Three chairs open around 480 hectares of steep trees, bowls and easily reached sidecountry. There is no on-mountain accommodation of any kind — everyone who works here lives in Nelson and rides the ski bus up.',
    49.440, -117.150, 1645, 2270, 625, 82, 4, 480, 1200,
    '2026-12-11', '2027-04-04', 'high',
    'https://whitewatermountainresort.com', '/resorts/countries/canada.jpg'),

  ('110', 'RED Mountain Resort',
    (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
    'Canada', 'British Columbia', 'Rossland',
    'Four mountains above the gold-rush town of Rossland — Red, Granite, Grey and Kirkup — adding up to roughly 1,500 hectares and 890m of vertical. Canada has been skiing here since the 1890s and it still feels like it: no purpose-built village, a heritage main street five minutes below the base, and an unusually cheap single-cat operation on Mt Kirkup.',
    49.100, -117.830, 1185, 2075, 890, 119, 8, 1560, 750,
    '2026-12-05', '2027-04-04', 'high',
    'https://www.redresort.com', '/resorts/countries/canada.jpg'),

  ('111', 'Panorama Mountain Resort',
    (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
    'Canada', 'British Columbia', 'Invermere',
    '1,224m of vertical in the Purcells above Invermere — among the biggest in North America — across roughly 1,200 hectares. A purpose-built ski-in ski-out village sits at the base with hot pools in the middle of it, and the snow is colder and drier than the Kootenay resorts further west, backed by serious snowmaking on the lower mountain. Staff accommodation is on the hill; the supermarket is 18km down in Invermere.',
    50.460, -116.240, 1160, 2384, 1224, 135, 10, 1204, 500,
    '2026-12-05', '2027-04-11', 'medium',
    'https://www.panoramaresort.com', '/resorts/countries/canada.jpg'),

  ('112', 'Apex Mountain Resort',
    (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
    'Canada', 'British Columbia', 'Penticton',
    'A small, steep Okanagan hill 33km above Penticton, with about 450 hectares of dry, cold snow and almost no lift queues. Most of the terrain is intermediate and advanced off a single quad, there is a compact village at the base with a skating loop running through the trees, and Penticton''s lakes and wineries are 45 minutes back down the mountain road.',
    49.390, -119.900, 1575, 2185, 610, 79, 4, 450, 600,
    '2026-12-12', '2027-04-04', 'medium',
    'https://apexresort.com', '/resorts/countries/canada.jpg'),

  ('113', 'Cypress Mountain',
    (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
    'Canada', 'British Columbia', 'West Vancouver',
    'The largest of Vancouver''s three North Shore mountains, half an hour from downtown and the 2010 Olympic venue for freestyle skiing and snowboarding. About 240 hectares of lift-served terrain plus a separate Nordic and snowshoe area at Hollyburn. Maritime snow means big dumps and the occasional midwinter rain event, and there is no ski town here at all — staff live across Metro Vancouver and commute up the hill.',
    49.400, -123.200, 910, 1440, 530, 53, 6, 240, 550,
    '2026-12-05', '2027-04-06', 'medium',
    'https://www.cypressmountain.com', '/resorts/countries/canada.jpg'),

  ('114', 'Baldy Mountain Resort',
    (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
    'Canada', 'British Columbia', 'Oliver',
    'A small community hill in the hills east of Oliver, bought by the Osoyoos Indian Band in 2019 after years of stop-start ownership. Roughly 200 hectares of dry South Okanagan snow, genuinely empty runs and a family atmosphere — but a short season and limited operating days, so check the calendar before you count on full-time hours.',
    49.150, -119.230, 1700, 2100, 400, 35, 3, 200, 500,
    '2026-12-18', '2027-03-21', 'medium',
    'https://baldyresort.com', '/resorts/countries/canada.jpg')
ON CONFLICT (legacy_id) DO NOTHING;

-- ── Link each resort to the towns 00102 added ───────────────────────────
-- Panorama carries three: the village at its base, the service town that
-- feeds it, and Radium at the top of the valley. Cypress carries none.
INSERT INTO public.resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
SELECT r.id, t.id, v.distance_km, v.is_primary
FROM (VALUES
  ('109', 'nelson',             20, true),
  ('110', 'rossland',            5, true),
  ('111', 'panorama',            1, true),
  ('111', 'invermere',          18, false),
  ('111', 'radium-hot-springs', 35, false),
  ('112', 'penticton',          33, true),
  ('114', 'oliver',             35, true)
) AS v(legacy_id, slug, distance_km, is_primary)
JOIN public.resorts r ON r.legacy_id = v.legacy_id
JOIN public.nearby_towns t ON t.slug = v.slug
ON CONFLICT DO NOTHING;

-- ═══ VERIFY ════════════════════════════════════════════════════════════
DO $$
DECLARE
  added INT;
  linked INT;
  orphan TEXT;
BEGIN
  SELECT count(*) INTO added FROM public.resorts
   WHERE legacy_id IN ('109','110','111','112','113','114');
  IF added <> 6 THEN
    RAISE EXCEPTION '00103: expected 6 resorts present, found %', added;
  END IF;

  -- A resort with no region would drop out of every region filter.
  SELECT string_agg(name, ', ') INTO orphan FROM public.resorts
   WHERE legacy_id IN ('109','110','111','112','113','114') AND region_id IS NULL;
  IF orphan IS NOT NULL THEN
    RAISE EXCEPTION '00103: resorts inserted with no region: %', orphan;
  END IF;

  SELECT count(*) INTO linked FROM public.resort_nearby_towns rnt
    JOIN public.resorts r ON r.id = rnt.resort_id
   WHERE r.legacy_id IN ('109','110','111','112','114');
  IF linked <> 7 THEN
    RAISE EXCEPTION '00103: expected 7 resort-town links, found %', linked;
  END IF;

  RAISE NOTICE '00103 ok: 6 resorts, 7 town links';
END $$;

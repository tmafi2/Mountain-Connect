-- 00075_add_missing_resorts.sql
--
-- Adds 38 missing resorts across AU, NZ, JP, US, CA, and renames the
-- existing combined "Queenstown / The Remarkables" entry (legacy_id 7)
-- to just "The Remarkables" so the Queenstown sub-region cluster reads
-- cleanly with The Remarkables + Coronet Peak as separate resorts.
--
-- Hemisphere season defaults (overridden where I know specifics):
--   Southern (AU, NZ): 2026-06-06 → 2026-10-04
--   Northern (JP, US, CA): 2026-12-06 → 2027-04-11
--
-- Region IDs reused from existing seed:
--   9  Snowy Mountains  (AU)
--   6  Southern Alps    (NZ — including North Island for filter purposes)
--   3  Japanese Alps    (JP)
--   2  Rocky Mountains  (US, CA)
--
-- Detail level is hybrid per the spec: well-known resorts get a real
-- description + elevations; small/club fields get a short blurb and
-- minimal stats. Banner images intentionally null so the resort detail
-- page falls back to its branded gradient.

BEGIN;

-- ── Rename the combined Queenstown entry ────────────────────
UPDATE public.resorts
SET name = 'The Remarkables',
    description = 'Iconic Queenstown ski area with 384 ha of terrain rising from Lake Wakatipu, known for the Shadow Basin freeride zone and easy beginner area. About 45 minutes from Queenstown by road.',
    nearest_town = 'Queenstown',
    base_elevation_m = 1610,
    summit_elevation_m = 1957,
    snow_reliability = 'medium'
WHERE legacy_id = '7';

-- ── Bulk insert: 38 new resorts ─────────────────────────────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, state_province, nearest_town,
  description, latitude, longitude,
  base_elevation_m, summit_elevation_m,
  season_start, season_end, snow_reliability, website
) VALUES
  -- ─────────────── AUSTRALIA ───────────────
  ('71', 'Selwyn Snow Resort',
    (SELECT id FROM public.regions WHERE legacy_id = '9' LIMIT 1),
    'Australia', 'New South Wales', 'Adaminaby',
    'Family-friendly resort in the NSW Snowy Mountains popular for first-timers and learners. Smaller, gentler terrain than Thredbo or Perisher with lower lift prices. Closer to Adaminaby than Jindabyne.',
    -35.85, 148.78, 1492, 1614,
    '2026-06-06', '2026-10-04', 'low',
    'https://www.selwynsnow.com.au'),

  ('72', 'Mt Buller',
    (SELECT id FROM public.regions WHERE legacy_id = '9' LIMIT 1),
    'Australia', 'Victoria', 'Mansfield',
    'The most accessible major resort from Melbourne (about 3 hours by road), Mt Buller has 80+ runs across 300 hectares with a vibrant alpine village. Popular for day-trippers and full-season visitors alike.',
    -37.146, 146.435, 1390, 1790,
    '2026-06-06', '2026-10-04', 'medium',
    'https://www.mtbuller.com.au'),

  ('73', 'Mount Stirling',
    (SELECT id FROM public.regions WHERE legacy_id = '9' LIMIT 1),
    'Australia', 'Victoria', 'Mansfield',
    'A backcountry and Nordic-focused area adjacent to Mt Buller. Limited lift access; best for cross-country, snowshoeing, and experienced skiers seeking quieter off-piste terrain.',
    -37.131, 146.490, 1320, 1747,
    '2026-06-06', '2026-10-04', 'low',
    'https://www.mtstirling.com.au'),

  ('74', 'Mount Baw Baw',
    (SELECT id FROM public.regions WHERE legacy_id = '9' LIMIT 1),
    'Australia', 'Victoria', 'Noojee',
    'Victoria''s most southerly resort and the closest to Melbourne (about 2.5 hours). Small and family-oriented with a relaxed vibe and limited but accessible terrain.',
    -37.835, 146.272, 1450, 1567,
    '2026-06-06', '2026-09-13', 'low',
    'https://www.mountbawbaw.com.au'),

  ('75', 'Lake Mountain',
    (SELECT id FROM public.regions WHERE legacy_id = '9' LIMIT 1),
    'Australia', 'Victoria', 'Marysville',
    'Cross-country and snow-play focused with very limited downhill terrain. The closest snow area to Melbourne — best for tobogganing, snowshoeing, and Nordic skiing during peak winter.',
    -37.500, 145.880, 1370, 1480,
    '2026-06-06', '2026-09-13', 'low',
    'https://www.lakemountainresort.com.au'),

  ('76', 'Mount Mawson',
    (SELECT id FROM public.regions WHERE legacy_id = '9' LIMIT 1),
    'Australia', 'Tasmania', 'Hobart',
    'A small volunteer-run club field in Mount Field National Park, Tasmania. Limited lift infrastructure and weather-dependent — open only when snow is sufficient.',
    -42.689, 146.586, 1240, 1410,
    '2026-07-04', '2026-09-13', 'low',
    'https://www.mtmawson.info'),

  ('77', 'Ben Lomond',
    (SELECT id FROM public.regions WHERE legacy_id = '9' LIMIT 1),
    'Australia', 'Tasmania', 'Launceston',
    'Tasmania''s largest ski area inside Ben Lomond National Park. Six lifts servicing terrain for beginners through intermediates. About 60 km from Launceston.',
    -41.555, 147.660, 1460, 1572,
    '2026-07-04', '2026-09-20', 'low',
    'https://www.skibenlomond.com.au'),

  -- ─────────────── NEW ZEALAND ───────────────
  ('78', 'Coronet Peak',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Otago', 'Queenstown',
    'Queenstown''s closest mountain (about 20 minutes from town) with 280 ha of varied terrain. Famous for night skiing on Fridays and Saturdays and panoramic views over Lake Wakatipu.',
    -44.920, 168.737, 1187, 1649,
    '2026-06-13', '2026-10-04', 'medium',
    'https://www.coronetpeak.co.nz'),

  ('79', 'Cardrona',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Otago', 'Wanaka',
    'Family-friendly resort with terrain for all levels and a world-class terrain park. The Cardrona Hotel base village is iconic. About 50 minutes from Queenstown or 30 minutes from Wanaka.',
    -44.874, 168.952, 1670, 1860,
    '2026-06-13', '2026-10-18', 'medium',
    'https://www.cardrona.com'),

  ('80', 'Treble Cone',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Otago', 'Wanaka',
    'The largest ski area in the South Island with 550 ha and the longest vertical drop in NZ (700 m). Steep, scenic, and challenging. About 30 minutes from Wanaka.',
    -44.633, 168.897, 1260, 1960,
    '2026-06-27', '2026-09-27', 'medium',
    'https://www.treblecone.com'),

  ('81', 'Porters',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Canterbury', 'Christchurch',
    'A relaxed Canterbury resort an hour from Christchurch. Family-friendly with terrain across all levels and a strong learner-area focus.',
    -43.272, 171.652, 1260, 1980,
    '2026-06-13', '2026-10-04', 'medium',
    'https://www.skiporters.co.nz'),

  ('82', 'Mount Olympus',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Canterbury', 'Christchurch',
    'Canterbury club field with classic nutcracker tow lifts and superb off-piste terrain. Volunteer-run, basic facilities, character in spades. About 2 hours from Christchurch.',
    -43.225, 171.683, 1500, 1860, NULL, NULL, 'medium',
    'https://www.mtolympus.co.nz'),

  ('83', 'Mount Cheeseman',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Canterbury', 'Christchurch',
    'Family-oriented club field in the Craigieburn Range with two T-bar lifts and a gentle alpine bowl. About 2 hours from Christchurch.',
    -43.158, 171.661, 1500, 1850, NULL, NULL, 'medium',
    'https://www.mtcheeseman.co.nz'),

  ('84', 'Broken River',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Canterbury', 'Christchurch',
    'Iconic Canterbury club field reached by an hour of walking from the car park. Steep terrain, deep snow, and zero crowds — a favourite of advanced skiers and snowboarders.',
    -43.180, 171.620, 1480, 1820, NULL, NULL, 'medium',
    'https://www.brokenriver.co.nz'),

  ('85', 'Craigieburn',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Canterbury', 'Christchurch',
    'Steep, advanced terrain in the Craigieburn Range with three nutcracker tows. Famous for powder days and a no-frills authentic Kiwi club-field experience.',
    -43.135, 171.717, 1430, 1980, NULL, NULL, 'medium',
    'https://www.craigieburn.co.nz'),

  ('86', 'Temple Basin',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Canterbury', 'Arthur''s Pass',
    'Hike-in club field reached by an hour''s walk from the road in Arthur''s Pass National Park. No groomers — pure backcountry-style terrain for committed skiers.',
    -42.881, 171.523, 1240, 1980, NULL, NULL, 'medium',
    'https://www.templebasin.co.nz'),

  ('87', 'Hanmer Springs',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Canterbury', 'Hanmer Springs',
    'Small, low-key family ski area near the Hanmer Springs alpine village (famed for its hot pools). Limited terrain but a great combo of skiing + soaking.',
    -42.520, 172.835, 1400, 1760, NULL, NULL, 'low',
    'https://www.skihanmer.co.nz'),

  ('88', 'Mount Lyford',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Canterbury', 'Kaikoura',
    'A relaxed, family-friendly ski area between Kaikoura and Hanmer Springs. Beginner-friendly with intermediate terrain and a quieter feel than the bigger commercial fields.',
    -42.620, 173.000, 1400, 1850, NULL, NULL, 'low',
    'https://www.mtlyford.co.nz'),

  ('89', 'Whakapapa',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Manawatu-Whanganui', 'National Park Village',
    'New Zealand''s largest ski area, on the slopes of active volcano Mount Ruapehu. 550 hectares of terrain across the north-western face of the volcano. About 4.5 hours from Auckland.',
    -39.250, 175.560, 1620, 2300, NULL, NULL, 'medium',
    'https://www.whakapapa.com'),

  ('90', 'Tukino',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Manawatu-Whanganui', 'Waiouru',
    'A remote club field on the eastern flank of Mount Ruapehu, accessed by 4WD. Two tow lifts, basic facilities, fantastic untracked terrain on good days.',
    -39.320, 175.660, 1640, 2100, NULL, NULL, 'medium',
    'https://www.tukino.co.nz'),

  ('91', 'Turoa',
    (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
    'New Zealand', 'Manawatu-Whanganui', 'Ohakune',
    'Sister resort to Whakapapa on the southern slopes of Mount Ruapehu, with NZ''s longest vertical drop (722 m). Open into October most years. Ohakune is the gateway town.',
    -39.300, 175.510, 1600, 2322, NULL, NULL, 'medium',
    'https://www.mtruapehu.com/winter/turoa'),

  -- ─────────────── JAPAN ───────────────
  ('92', 'Kiroro',
    (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
    'Japan', 'Hokkaido', 'Otaru',
    'Hokkaido powder resort about an hour from Sapporo, famed for an annual snowfall of around 21 m. Quieter than Niseko with two interconnected mountains and an upmarket base village.',
    43.103, 140.967, 570, 1180, NULL, NULL, 'high',
    'https://www.kiroro.co.jp'),

  ('93', 'Okunakayama Kogen',
    (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
    'Japan', 'Iwate', 'Morioka',
    'Mid-sized Iwate resort with reliable Tohoku-region powder. Quieter than the Hokkaido and Nagano resorts; popular with Japanese domestic skiers.',
    39.970, 140.980, 700, 1080, NULL, NULL, 'high',
    NULL),

  ('94', 'Madarao Kogen',
    (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
    'Japan', 'Nagano', 'Iiyama',
    'Connected to Tangram resort to form Madarao Tangram. Famous for its ungroomed tree-skiing zones — a powder hound favourite within easy reach of Hakuba (about 90 minutes away).',
    36.840, 138.310, 850, 1350, NULL, NULL, 'high',
    'https://www.madarao.jp'),

  ('95', 'Appi Kogen',
    (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
    'Japan', 'Iwate', 'Hachimantai',
    'One of Tohoku''s biggest resorts with 21 long, well-groomed runs and reliable snow from December through April. Has long been a favourite for Japanese family skiing.',
    40.070, 140.920, 500, 1304, NULL, NULL, 'high',
    'https://www.appi.co.jp'),

  ('96', 'Shizukuishi',
    (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
    'Japan', 'Iwate', 'Morioka',
    'Resort on Mount Iwate, about 30 minutes from Morioka. Hosted the 1993 Alpine World Ski Championships. Long groomers and a panoramic top section.',
    39.745, 140.957, 580, 1300, NULL, NULL, 'high',
    'https://www.shizukuishi-ski.co.jp'),

  ('97', 'Karuizawa',
    (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
    'Japan', 'Nagano', 'Karuizawa',
    'Closest resort to Tokyo (about 75 min by Shinkansen), known for early-season snowmaking and an upmarket alpine town with shopping and onsens. Smaller terrain footprint but very accessible.',
    36.367, 138.620, 1130, 1335, NULL, NULL, 'medium',
    'https://www.princehotels.com/ski/karuizawa'),

  ('98', 'Hakkaisan',
    (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
    'Japan', 'Niigata', 'Minamiuonuma',
    'Steep terrain on Mount Hakkai in the Niigata snowbelt. Famous for its 5-km Yuzawa-side run and reliable deep powder; about 90 min from Tokyo by Shinkansen.',
    37.100, 138.928, 380, 1147, NULL, NULL, 'high',
    'https://www.hakkaisan.co.jp/ski'),

  ('99', 'Manza Onsen',
    (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
    'Japan', 'Gunma', 'Tsumagoi',
    'High-altitude resort (1800 m base) on Mount Shirane with one of the highest onsen in Japan. Reliable cold dry powder; small but uncrowded terrain.',
    36.620, 138.500, 1800, 2020, NULL, NULL, 'high',
    'https://www.princehotels.com/ski/manza'),

  ('100', 'Hachimantai',
    (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
    'Japan', 'Iwate', 'Hachimantai',
    'A lightly-trafficked Tohoku resort surrounded by hot springs and old-growth beech forests. Great for tree skiing; access from Morioka.',
    39.970, 140.940, 500, 1300, NULL, NULL, 'high',
    NULL),

  ('101', 'Hakkoda',
    (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
    'Japan', 'Aomori', 'Aomori',
    'Legendary off-piste destination in northern Honshu, famed for its juhyo (snow monsters) and waist-deep powder. Single ropeway accessing huge ungroomed terrain — for committed skiers only.',
    40.660, 140.850, 660, 1325, NULL, NULL, 'high',
    'https://hakkoda-ropeway.jp'),

  ('102', 'Tazawako',
    (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
    'Japan', 'Akita', 'Senboku',
    'Akita resort overlooking Lake Tazawa, Japan''s deepest lake. A mid-sized terrain footprint with reliable Tohoku snow and a low-key local feel.',
    39.720, 140.780, 540, 1100, NULL, NULL, 'high',
    'https://www.tazawako-ski.com'),

  -- ─────────────── USA ───────────────
  ('103', 'Snowbird',
    (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
    'USA', 'Utah', 'Salt Lake City',
    'Steep, deep-powder resort in Little Cottonwood Canyon, 45 min from Salt Lake City. 2500 acres dominated by expert terrain; long season — usually well into May.',
    40.582, -111.656, 2365, 3353,
    '2026-11-21', '2027-05-23', 'high',
    'https://www.snowbird.com'),

  ('104', 'Beaver Creek',
    (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
    'USA', 'Colorado', 'Avon',
    'Upscale Vail-owned resort 10 minutes from Vail Village. Known for impeccable grooming, ski-in/ski-out luxury lodging, and an extensive learner-friendly mid-mountain.',
    39.605, -106.522, 2255, 3488,
    '2026-11-26', '2027-04-11', 'high',
    'https://www.beavercreek.com'),

  ('105', 'Palisades Tahoe',
    (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
    'USA', 'California', 'Olympic Valley',
    'Combined Squaw Valley + Alpine Meadows resort on Lake Tahoe''s north shore — host of the 1960 Winter Olympics. 6,000 acres connected by gondola; famously consistent late-season snow.',
    39.197, -120.236, 1890, 2758,
    '2026-11-26', '2027-05-30', 'high',
    'https://www.palisadestahoe.com'),

  ('106', 'Heavenly',
    (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
    'USA', 'California', 'South Lake Tahoe',
    'Straddles California / Nevada on Lake Tahoe''s south shore with views over the lake from every chair. 4,800 acres and a vibrant casino-village base.',
    38.935, -119.940, 2003, 3060,
    '2026-11-21', '2027-04-18', 'high',
    'https://www.skiheavenly.com'),

  -- ─────────────── CANADA ───────────────
  ('107', 'Kicking Horse',
    (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
    'Canada', 'British Columbia', 'Golden',
    'Famously steep BC interior resort with the 4th-highest vertical drop in North America (1260 m). 85% of terrain is intermediate or expert; little for beginners.',
    51.300, -117.050, 1190, 2450,
    '2026-12-12', '2027-04-11', 'high',
    'https://www.kickinghorseresort.com'),

  ('108', 'Fernie',
    (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
    'Canada', 'British Columbia', 'Fernie',
    'Five alpine bowls and 142 trails in the Lizard Range. Known for huge annual snowfall (around 9 m) and laid-back vibe. The Fernie town has heritage architecture and a strong ski-bum culture.',
    49.460, -115.080, 1067, 2134,
    '2026-12-05', '2027-04-18', 'high',
    'https://www.skifernie.com')
ON CONFLICT (legacy_id) DO NOTHING;

COMMIT;

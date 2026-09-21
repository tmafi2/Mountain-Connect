-- ═══ 00102: NINE BC TOWNS THE OUTREACH LIST NEEDS ══════════════════════
-- A 212-row Canadian outreach list (Sep 2026) named 21 towns. Nine of them
-- had no row in nearby_towns, and POST /api/admin/outreach/leads/import
-- resolves a lead's location by EXACT name match against nearby_towns or
-- resorts — an unmatched value errors the whole row rather than importing
-- it without a location. So a missing town is not a cosmetic gap; it is
-- the difference between a lead landing and being rejected.
--
-- Added: Nelson, Rossland, Squamish, Pemberton, Invermere, Panorama,
-- Radium Hot Springs, Penticton, Oliver — all British Columbia.
--
-- Six of the nine sit below a resort we do NOT carry yet (Whitewater, RED
-- Mountain, Panorama, Apex, Mount Baldy), so they get no resort_nearby_towns
-- link here; the link belongs with the migration that adds the resort.
-- Only Squamish and Pemberton attach to an existing resort — both are Sea
-- to Sky commuter towns for Whistler Blackcomb, neither is primary
-- (Whistler Village keeps that), which matches how Lake Louise already
-- carries Banff as a second, non-primary town.
--
-- hero_image_url is left NULL on purpose: the detail page renders the
-- country-gradient ResortBanner and the index card never reads the field,
-- so a stock photo would add nothing and risk being wrong.
--
-- Meadow Creek was deliberately NOT added — see the note at the end.
--
-- Idempotent (ON CONFLICT DO NOTHING) and self-verifying (final DO block).

-- ------------------------------------------------------------
-- 1. Nelson — serves Whitewater (~20km). 9 leads.
-- ------------------------------------------------------------
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website,
  staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options,
  public_transport_to_resort, parking_availability, distance_to_airport, road_conditions,
  weekly_cost_estimate, supermarkets, eating_out,
  local_employers, extra_job_opportunities,
  bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals,
  medical_facilities, emergency_services,
  vibe_atmosphere, international_workforce, social_life,
  avg_winter_temp, snowfall_in_town, summer_appeal,
  best_time_to_arrive, community_groups, insider_tips)
VALUES (
  'Nelson', 'nelson', 'Canada', 'British Columbia', 49.50, -117.29,
  'A heritage Kootenay town on the west arm of Kootenay Lake, with a preserved Victorian main street and a long counterculture streak. Whitewater Ski Resort is 20km south up Highway 6, and because Whitewater has no on-mountain accommodation, virtually everyone who works that hill lives in Nelson.',
  11100, 12500, 'https://www.nelson.ca',
  false, 'CAD $225–$375/week shared', 'High. Nelson is a year-round town with a college population and no resort dorms to absorb seasonal staff, so winter rooms are genuinely competitive — start looking in September or October.', 'Hostels and worker houses in town, motels either side of the bridge, short-term rooms through local buy-and-sell groups.',
  'The Whitewater ski bus runs from Nelson on operating days and is how most staff get up. BC Transit covers the town itself; otherwise it is a 20km drive up a mountain road.', 'Paid street parking downtown, free in the residential blocks. Free day parking at Whitewater, though the lot fills early on a powder day.', 'West Kootenay Regional Airport at Castlegar (YCG) is ~42km, but winter fog cancels enough flights that locals call it Cancelgar. Spokane (GEG) ~3hr south and Kelowna (YLW) ~4hr west are the dependable alternatives.', 'Highway 6 up to the hill and the passes out of town are ploughed but properly wintry. Winter tyres are legally required Oct–Apr. Kootenay Pass closes periodically for avalanche control.',
  'CAD $375–$525/week', 'Full-size supermarkets plus the Kootenay Co-op, one of the larger independent food co-ops in the country.', 'CAD $15–$28 for a pub meal. Baker Street carries a cafe and restaurant scene well beyond what a town this size should manage.',
  'Whitewater Ski Resort, Selkirk College, Kootenay Lake Hospital, the Baker Street hospitality strip, cat-ski and backcountry operators, and a cluster of small manufacturers.', 'Hospitality and retail hire year-round; cat-ski and heli operators take winter staff; tree planting and trail crews pick up in spring.',
  'Live music most weekends, brewery taprooms and long-standing locals'' pubs. It is a town scene rather than an apres one — the hill empties back into Nelson at 3.30pm.', 'Independent coffee roasters, bakeries and a strong vegetarian streak. Oso Negro is the town''s unofficial living room.', 'Nelson & District Community Complex (pool, gym, rinks), a climbing gym and several yoga studios.', 'Banks, pharmacies, outdoor and ski shops, laundromats, thrift stores, post office — a full service town, not a resort strip.', 'Coldsmoke Powder Festival at Whitewater in February; Baker Street markets and a steady run of live music through winter.',
  'Kootenay Lake Hospital with an emergency department, plus walk-in and GP clinics.', 'Nelson Police Department, ambulance and fire all based in town.',
  'Heritage storefronts with mountains straight up from the lake, in a town that has been attracting people who wanted out of the city since the 1960s. Unhurried, opinionated, thoroughly outdoors-minded.', 'Smaller than the big-name resort towns — Whitewater is a locals'' mountain first — but there is a steady IEC working-holiday contingent alongside Canadians who moved for the snow.', 'Ski bus friendships, pub live music, touring partners for the backcountry, and hot springs trips to Ainsworth and Nakusp on days off.',
  '-8°C to 0°C', 'Regular snow in town through winter, with far more on the hill — Whitewater averages around 12m a season and runs no snowmaking.', 'Kootenay Lake swimming and boating, mountain biking, hiking and a long hot summer. Plenty of winter workers stay on.',
  'October. Whitewater hires through autumn for a December opening, and housing is the hard part, not the job.', 'Nelson buy-and-sell, housing and rideshare Facebook groups; Whitewater seasonal staff channels.', 'Sort housing before you commit to the season — it is the hardest part of moving here. The ski bus means you do not strictly need a car, but one opens up Kootenay Pass, RED Mountain and the hot springs. Whitewater is small by lift count and enormous by snowfall; judge it on the second.'
) ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 2. Rossland — serves RED Mountain (~5km). 6 leads.
-- ------------------------------------------------------------
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website,
  staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options,
  public_transport_to_resort, parking_availability, distance_to_airport, road_conditions,
  weekly_cost_estimate, supermarkets, eating_out,
  local_employers, extra_job_opportunities,
  bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals,
  medical_facilities, emergency_services,
  vibe_atmosphere, international_workforce, social_life,
  avg_winter_temp, snowfall_in_town, summer_appeal,
  best_time_to_arrive, community_groups, insider_tips)
VALUES (
  'Rossland', 'rossland', 'Canada', 'British Columbia', 49.08, -117.80,
  'A gold-rush town sitting at around 1,000m in the bowl of an extinct volcano, five minutes below RED Mountain Resort. Nancy Greene grew up here, the main street is heritage brick, and the ski hill is treated as municipal infrastructure rather than a tourist attraction.',
  4100, 5000, 'https://rossland.ca',
  false, 'CAD $200–$350/week shared', 'Tight in winter. The town is small, a lot of housing is second homes, and RED''s season fills what is left — look in September and October, and consider Trail, ten minutes downhill, where rent is markedly cheaper.', 'Hostels and worker houses in town, motels in Trail and Warfield, rooms through local buy-and-sell groups.',
  'A seasonal shuttle links town and the hill, and RED is close enough that lifts and carpools do most of the work. Regional transit runs down to Trail and Castlegar.', 'Free street parking in town. Free day lots at RED.', 'Trail Regional Airport (YZZ) is ~15km, Castlegar (YCG) ~45km, and Spokane (GEG) ~2.5hr south is what most international staff actually fly into.', 'Highway 3B over the Blueberry-Paulson and Kootenay passes is a serious winter drive and closes for avalanche control. Winter tyres legally required Oct–Apr.',
  'CAD $350–$500/week', 'A grocery store in town for day-to-day shopping; the big supermarkets and box stores are ten minutes down in Trail.', 'CAD $15–$25 pub meals. A handful of genuinely good spots for a town this size, plus a brewery.',
  'RED Mountain Resort, the Teck smelter and Kootenay Boundary Regional Hospital in Trail, town hospitality, and cat-ski operators working the terrain behind the resort.', 'Trail''s industrial employers hire year-round, and hospitality, retail and snow-clearing work turns over through winter.',
  'Small and unpretentious — a couple of locals'' pubs, a brewery taproom and the base-area bar. Nights out are cheap and everyone is there.', 'Cafes and bakeries on Columbia Avenue, casual dinner spots, and a coffee scene that opens early for first chair.', 'Rossland Arena and community facilities, plus a pool and rec centre in Trail.', 'Bank, pharmacy, ski and bike shops, hardware, post office. Anything bigger is in Trail.', 'Winter Carnival (one of the oldest in Canada), the Rubberhead mountain bike race, and RED''s own season events.',
  'Health centre in town for day-to-day care; Kootenay Boundary Regional Hospital with an emergency department is ten minutes away in Trail.', 'RCMP, fire and ambulance serving Rossland and the Trail area.',
  'A working mountain town that happens to have a world-class hill above it — no purpose-built village, no gondola-side retail, just a heritage main street and a lot of people who plan their week around snowfall.', 'A solid IEC working-holiday contingent — Aussies, Kiwis, Brits and Europeans — though smaller and less transient than Whistler or Banff.', 'Powder-day carpools, pub nights on Columbia Avenue, ski touring behind the resort, and a social circle small enough to know by New Year.',
  '-10°C to -2°C', 'Heavy. The town sits high enough that snow stays, and shovelling is part of the routine.', 'Legendary mountain biking on the Seven Summits trail, hiking and the Kootenay lakes within reach. Many winter staff stay for it.',
  'Late October or early November. Hiring runs through autumn and the best shared houses go before December.', 'Rossland and Trail buy-and-sell, housing and rideshare groups; RED seasonal staff channels.', 'Look at Trail for housing before you decide Rossland is unaffordable — it is ten minutes down the hill and a different market. RED''s terrain is far bigger than the lift count suggests, and the cat-skiing operation behind it is the cheapest lift-accessed powder in the country.'
) ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 3. Squamish — Sea to Sky commuter town for Whistler (~58km). 9 leads.
-- ------------------------------------------------------------
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website,
  staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options,
  public_transport_to_resort, parking_availability, distance_to_airport, road_conditions,
  weekly_cost_estimate, supermarkets, eating_out,
  local_employers, extra_job_opportunities,
  bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals,
  medical_facilities, emergency_services,
  vibe_atmosphere, international_workforce, social_life,
  avg_winter_temp, snowfall_in_town, summer_appeal,
  best_time_to_arrive, community_groups, insider_tips)
VALUES (
  'Squamish', 'squamish', 'Canada', 'British Columbia', 49.70, -123.16,
  'A former logging and mill town at the head of Howe Sound, halfway between Vancouver and Whistler, now better known for the Stawamus Chief, world-class rock climbing and a mountain bike network that rivals anywhere in BC. No ski hill of its own — workers here either serve the outdoor-tourism economy or commute the 45 minutes north to Whistler Blackcomb.',
  24000, 26000, 'https://squamish.ca',
  false, 'CAD $275–$450/week shared', 'High and getting higher. Squamish grew fast as a Vancouver commuter town, so you are competing with full-time residents on city wages, not just seasonal staff.', 'Rooms through local housing groups, motels on the highway, and short-term rentals between seasons. Vancouver is close enough that some people start there and move up.',
  'BC Transit runs a Sea to Sky commuter service linking Squamish with Whistler and Vancouver, and there are private shuttles on the corridor. Most people who work in Whistler and live here drive or carpool.', 'Free parking almost everywhere in town — one of the real advantages over Whistler.', 'Vancouver International (YVR) ~70km, about 1hr15 down the Sea to Sky Highway.', 'The Sea to Sky Highway is a modern, well-maintained road, but it is coastal mountain driving — rain at sea level, snow on the Whistler end, and closures after slides or crashes. Winter tyres required Oct–Apr.',
  'CAD $425–$600/week', 'Full-size supermarkets and a farmers market — normal town grocery prices rather than resort ones.', 'CAD $18–$30 for a pub meal. Strong brewery and cafe scene built around the climbing and biking crowd.',
  'Sea to Sky Gondola, outdoor guiding and adventure operators, hotels and restaurants, the district and school board, and Whistler employers drawing staff down the corridor.', 'Guiding, outdoor retail and hospitality year-round; construction is busy; summer is the peak season here rather than winter.',
  'Brewery taprooms, a couple of pubs and live music — low-key and early, because most people are up at dawn for something.', 'Cafes built for climbers and cyclists, bakeries, casual dinner spots and food trucks.', 'Brennan Park Recreation Centre (pool, gym), two climbing gyms, yoga studios.', 'Full services: banks, pharmacies, hardware, gear shops, laundromats, post office.', 'Squamish Constellation Festival and the Squamish 50 in summer; winter is quieter and the mountains take over.',
  'Squamish General Hospital with an emergency department, plus clinics.', 'RCMP, fire and ambulance based in town; Squamish Search and Rescue is one of the busiest in the province.',
  'An outdoor-sports town that never bothered becoming a resort — granite walls on one side, ocean on the other, and a population that mostly moved here to be outside.', 'Strong. Working-holiday staff who cannot afford Whistler rents end up here, alongside climbers and bikers from everywhere.', 'Climbing and riding after shift, brewery evenings, and carpools north for powder days.',
  '0°C to 7°C', 'Little to none at sea level — Squamish gets rain in winter while Whistler gets snow. That is the trade for cheaper rent.', 'Outstanding. Climbing, mountain biking, kiteboarding on the Spit, and hiking. Summer is the busy season for local employers.',
  'Any time — the hiring calendar here is not tied to a ski season the way Whistler''s is.', 'Squamish housing, buy-and-sell and rideshare Facebook groups; Sea to Sky commuter carpool groups.', 'If you are working in Whistler, do the sums on the commute before committing: cheaper rent, but 90 minutes of mountain highway a day and a car you have to keep running through winter. If you are working in Squamish itself, note that the busy season is summer.'
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='1' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='squamish' LIMIT 1), 58, false) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 4. Pemberton — serves Whistler Blackcomb (~32km). 1 lead.
-- ------------------------------------------------------------
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website,
  staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options,
  public_transport_to_resort, parking_availability, distance_to_airport, road_conditions,
  weekly_cost_estimate, supermarkets, eating_out,
  local_employers, extra_job_opportunities,
  bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals,
  medical_facilities, emergency_services,
  vibe_atmosphere, international_workforce, social_life,
  avg_winter_temp, snowfall_in_town, summer_appeal,
  best_time_to_arrive, community_groups, insider_tips)
VALUES (
  'Pemberton', 'pemberton', 'Canada', 'British Columbia', 50.32, -122.80,
  'A farming valley 30 minutes north of Whistler, under the face of Mount Currie and next to the Lil''wat Nation. Seed potatoes and hay rather than ski lifts — but it is the closest thing to affordable housing on the Sea to Sky corridor, and a good share of Whistler''s staff live here.',
  3400, 3800, 'https://www.pemberton.ca',
  false, 'CAD $250–$400/week shared', 'Tight, because demand comes from Whistler rather than from Pemberton itself. Rooms turn over with the ski season and go quickly in autumn.', 'Rooms through Sea to Sky housing groups, a small number of motels and B&Bs, and short-term rentals outside peak season.',
  'BC Transit runs a Pemberton–Whistler commuter route timed around work shifts, and it is well used. Otherwise it is a 30-minute drive down Highway 99.', 'Free parking throughout the village. Day parking in Whistler is paid and fills early.', 'Vancouver International (YVR) ~160km, about 2hr30 down the Sea to Sky Highway.', 'Highway 99 between Pemberton and Whistler climbs over a pass and gets snow, ice and the occasional closure. Winter tyres required Oct–Apr, and a car that starts at -15°C matters here more than in Whistler.',
  'CAD $400–$550/week', 'A supermarket and a good general store for day-to-day shopping; bigger shops are in Whistler or Squamish.', 'CAD $15–$28 for a meal. A small but genuinely good spread of cafes, a bakery and a couple of pubs.',
  'Whistler Blackcomb and Whistler hospitality drawing commuters, local farms, the village and school district, and backcountry and heli operators using the valley.', 'Farm work through spring and summer, construction, and Whistler''s year-round hospitality market half an hour away.',
  'One or two pubs and a brewery — you go to Whistler for a night out, and there is a designated-driver problem to solve if you do.', 'A well-regarded bakery, a few cafes and casual restaurants — small, friendly and closed earlier than you expect.', 'Pemberton & District Community Centre, plus Whistler''s facilities down the road.', 'Grocery, pharmacy, hardware, post office and a couple of gear shops. Whistler covers the rest.', 'Slow Food Cycle Sunday in summer, valley farmers markets, and the Whistler event calendar half an hour away.',
  'Pemberton Health Centre for day-to-day care; the nearest hospitals are Whistler and Squamish.', 'RCMP, fire and ambulance based in the village.',
  'A working agricultural valley that happens to sit under enormous mountains. Quieter, cheaper and more local than anywhere else on the corridor — and everyone here knows exactly why you moved.', 'Plenty of working-holiday staff priced out of Whistler, mixed into a farming community that has been here far longer.', 'Commuter carpools, valley pub nights, backcountry touring up the Duffey Lake road, and everything Whistler offers when you can face the drive.',
  '-6°C to 2°C', 'Regular snow through winter — a proper valley-bottom winter, unlike Squamish at sea level.', 'Excellent. Farm stands, the Duffey Lake road, hiking, riding and a hot valley summer.',
  'October, alongside Whistler''s hiring — housing here follows that calendar even though the jobs may not.', 'Sea to Sky housing and rideshare Facebook groups; Pemberton community boards.', 'A reliable winter car is the price of living here — the commuter bus is good but it is not built around every shift pattern. Do not let a Whistler employer count on you for a late close without agreeing how you get home.'
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='1' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='pemberton' LIMIT 1), 32, false) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 5. Invermere — serves Panorama (~18km). 2 leads.
-- ------------------------------------------------------------
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website,
  staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options,
  public_transport_to_resort, parking_availability, distance_to_airport, road_conditions,
  weekly_cost_estimate, supermarkets, eating_out,
  local_employers, extra_job_opportunities,
  bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals,
  medical_facilities, emergency_services,
  vibe_atmosphere, international_workforce, social_life,
  avg_winter_temp, snowfall_in_town, summer_appeal,
  best_time_to_arrive, community_groups, insider_tips)
VALUES (
  'Invermere', 'invermere', 'Canada', 'British Columbia', 50.51, -116.03,
  'The service town of the Columbia Valley, on the shore of Lake Windermere between the Rockies and the Purcells. Panorama Mountain Resort is 18km up the hill, and Invermere is where its staff shop, see a doctor and find rent that the resort village cannot offer.',
  4000, 9000, 'https://invermere.net',
  false, 'CAD $225–$350/week shared', 'Awkward rather than impossible. A lot of the housing stock is Calgary second homes, so what is available is seasonal and often furnished — winter is actually easier than summer here.', 'Rooms through valley housing groups, motels on the highway, and Panorama''s own staff accommodation up the hill.',
  'No regular public bus up to Panorama — staff drive or carpool the 20-minute climb. The resort runs its own shuttles for guests and some staff shifts.', 'Free parking in town. Free day parking at Panorama.', 'Calgary International (YYC) ~300km, about 3hr over the Rockies via Radium and the Kootenay Parkway. Cranbrook (YXC) is ~130km south.', 'Highway 93/95 through the valley is well maintained; the Panorama road is a steady mountain climb that demands winter tyres and a car that can handle a cold start.',
  'CAD $350–$500/week', 'Full-size supermarket and a good independent grocer — the valley does its serious shopping here.', 'CAD $15–$28 for a pub meal. A lakefront strip of cafes and restaurants that quietens considerably once the summer crowd leaves.',
  'Panorama Mountain Resort, valley hospitality and accommodation businesses, the hospital, construction serving the second-home market, and heli and cat operators in the Purcells.', 'Construction and trades year-round, summer tourism on the lake, and hospitality that runs on two distinct seasons.',
  'A couple of pubs and a brewery in town, with the resort''s own bars up the hill. Low-key by resort standards.', 'Cafes and bakeries on the main street, casual dinner spots, and lake views in summer.', 'Community rec facilities and a pool, plus Panorama''s hot pools as the après option.', 'Banks, pharmacies, hardware, gear shops, laundromat, post office — a full service town for the whole valley.', 'Winter events at Panorama; the valley''s summer calendar is built around the lake.',
  'Invermere & District Hospital with an emergency department, plus clinics.', 'RCMP, fire and ambulance based in town.',
  'A lake town with two personalities — packed and Albertan in July, quiet and local in January. Less ski-town intensity than the Kootenays and more of a normal community.', 'Moderate. Panorama takes a good number of working-holiday staff each winter, most of whom live at the resort or in town.', 'Hill days followed by hot pools, pub nights in town, skating on the lake when it freezes clean, and hot springs at Radium.',
  '-10°C to -1°C', 'Moderate in the valley bottom — the serious snow is up at Panorama, 1,200m higher.', 'Very strong. Lake Windermere, golf, biking and the Rockies on the doorstep. Summer is the busier season for many employers here.',
  'Late October or November for a winter season at Panorama; spring if you are aiming at the summer economy.', 'Columbia Valley buy-and-sell and housing Facebook groups; Panorama staff channels.', 'Decide early whether you want resort staff accommodation or a room in town — they are different seasons. Living in Invermere means a 20-minute mountain drive each way and a proper grocery store; living at Panorama means ski-in ski-out and one small store.'
) ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 6. Panorama — the resort village itself. 3 leads.
-- ------------------------------------------------------------
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website,
  staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options,
  public_transport_to_resort, parking_availability, distance_to_airport, road_conditions,
  weekly_cost_estimate, supermarkets, eating_out,
  local_employers, extra_job_opportunities,
  bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals,
  medical_facilities, emergency_services,
  vibe_atmosphere, international_workforce, social_life,
  avg_winter_temp, snowfall_in_town, summer_appeal,
  best_time_to_arrive, community_groups, insider_tips)
VALUES (
  'Panorama', 'panorama', 'Canada', 'British Columbia', 50.46, -116.24,
  'The purpose-built village at the base of Panorama Mountain Resort, 18km above Invermere in the Purcells. Not a town in the ordinary sense — a cluster of lodges, a few restaurants, the hot pools and staff accommodation, with 1,200m of vertical directly above it.',
  200, 2000, 'https://www.panoramaresort.com',
  true, 'CAD $175–$300/week in resort staff accommodation', 'Managed rather than competitive — most winter staff are housed by the resort, and the allocation happens when you are hired, not when you arrive.', 'Resort staff accommodation, plus hotel and condo rentals in the village. Anything else means living down in Invermere.',
  'You live on the hill, so the commute is a walk. The resort runs shuttles down to Invermere on a schedule, but most staff without a car depend on lifts from those who have one.', 'Free parking at the village lots.', 'Calgary International (YYC) ~320km, about 3hr15 via Radium. Cranbrook (YXC) ~150km.', 'The access road from Invermere is a steady 18km mountain climb, ploughed daily but genuinely wintry. Winter tyres are essential, and a two-wheel-drive car will struggle on the worst mornings.',
  'CAD $300–$450/week if you eat at the village; considerably less if you shop in Invermere', 'One small general store in the village for essentials at village prices. Everyone does a weekly shop down in Invermere.', 'CAD $18–$30 for a village meal. A handful of restaurants and bars, all resort-operated or resort-adjacent.',
  'Panorama Mountain Resort is essentially the entire employer — lifts, ski school, food and beverage, hotels, property management, the hot pools — alongside a few independent operators in the village.', 'Very little outside the resort itself. If you want a second job or year-round work, Invermere is where it is.',
  'The village bars carry the whole scene — busy on staff nights and after a storm, quiet midweek. Nothing else is within 18km.', 'A small set of village restaurants and a coffee stop. Cooking in staff accommodation is how most people actually eat.', 'The hot pools are the main recovery option; Invermere has the gyms and pool.', 'Essentials only — a general store, rental and retail shops, and the resort''s own services. Banks, pharmacy and everything else are in Invermere.', 'The resort''s winter event calendar, staff parties and the Columbia Valley''s summer programme down the hill.',
  'First aid and ski patrol on the mountain. The nearest hospital with an emergency department is Invermere & District, 20 minutes down.', 'Resort patrol and security on site; RCMP, fire and ambulance respond from Invermere.',
  'Small, self-contained and entirely built around the mountain. Ski-in ski-out convenience, a short list of people, and a strong sense of season — everybody arrives and leaves at once.', 'Good for a resort this size. Panorama hires a solid working-holiday cohort each winter, and staff accommodation throws everyone together quickly.', 'Staff housing is the social life — hot pools after work, village bar nights, storm-day laps, and trips down to Invermere for anything else.',
  '-12°C to -3°C', 'Heavy on the mountain, which is where you are. The village sits high enough that snow stays all season.', 'The resort runs a summer season on biking and golf, but it is far quieter than winter — most seasonal staff move on or down to the valley.',
  'Early November, as staff accommodation is allocated and the hill prepares to open.', 'Panorama seasonal staff groups; Columbia Valley buy-and-sell and housing groups for anyone looking to move down to Invermere.', 'Take the staff accommodation for your first season — it is the cheapest housing in the valley and the fastest way into the community. Do a proper shop in Invermere on your day off; village prices are village prices everywhere in the world.'
) ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 7. Radium Hot Springs — Columbia Valley, ~35km from Panorama. 1 lead.
-- ------------------------------------------------------------
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website,
  staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options,
  public_transport_to_resort, parking_availability, distance_to_airport, road_conditions,
  weekly_cost_estimate, supermarkets, eating_out,
  local_employers, extra_job_opportunities,
  bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals,
  medical_facilities, emergency_services,
  vibe_atmosphere, international_workforce, social_life,
  avg_winter_temp, snowfall_in_town, summer_appeal,
  best_time_to_arrive, community_groups, insider_tips)
VALUES (
  'Radium Hot Springs', 'radium-hot-springs', 'Canada', 'British Columbia', 50.62, -116.07,
  'A small village at the mouth of Sinclair Canyon, where the highway enters Kootenay National Park. Named for the mineral pools just up the canyon, known locally for the bighorn sheep that wander through town, and used as an accommodation and golf base for the Columbia Valley.',
  1300, 4000, 'https://radiumhotsprings.ca',
  false, 'CAD $200–$325/week shared', 'Seasonal. Summer is the squeeze here; winter rooms are easier and cheaper than anywhere else in the valley.', 'Motels and lodges along the highway, seasonal staff accommodation with the larger resorts and golf operations, and rooms through valley housing groups.',
  'No public bus. Panorama is ~35km, roughly 40 minutes via Invermere, so a car or a reliable carpool is the practical requirement.', 'Free parking throughout the village.', 'Calgary International (YYC) ~260km, about 2hr45 via the Kootenay Parkway through Banff and Kootenay national parks.', 'Highway 93 through Sinclair Canyon and over Vermilion Pass is a national park road — ploughed, scenic, and prone to closures for weather and wildlife. Winter tyres required Oct–Apr.',
  'CAD $325–$475/week', 'A grocery store for essentials; the full supermarkets are 15 minutes south in Invermere.', 'CAD $15–$26 for a meal. A modest strip of restaurants and cafes serving highway and hot springs traffic.',
  'The hot springs and park operations, golf resorts, highway motels and lodges, and Columbia Valley tourism businesses. Panorama draws staff from here too.', 'Golf and hospitality in summer, accommodation year-round, and park and highway seasonal work.',
  'A pub or two and lodge bars — quiet, and quieter still in midwinter.', 'Cafes, a bakery and casual restaurants along the highway strip.', 'The hot springs pools themselves; gyms and the rec centre are in Invermere.', 'Grocery, liquor store, gas, post office and gift shops. Banks and pharmacy are in Invermere.', 'Village summer events and the Columbia Valley calendar; winter is deliberately low-season here.',
  'Clinic services in the village; the nearest emergency department is Invermere & District, 15 minutes south.', 'RCMP, fire and ambulance serving the village and the valley; Parks Canada handles incidents inside the park.',
  'A one-street village with a national park at the end of it and sheep on the verges. Busy and holiday-flavoured in summer, very quiet in winter — which is exactly why rent is cheap.', 'Modest, and mostly summer-weighted. Winter staff here are usually commuting to Panorama or working in accommodation.', 'Hot springs after a hill day, quiet pub nights, and the valley''s social life 15 minutes down the road in Invermere.',
  '-11°C to -1°C', 'Light to moderate in the village — it sits at the valley bottom, and the snow is up the hill.', 'Strong. Hot springs, golf, hiking and the national parks make summer the main season for most employers here.',
  'Spring, if you are chasing the summer economy. For a winter at Panorama, arrive in late October and accept the commute.', 'Columbia Valley buy-and-sell and housing groups; village community boards.', 'This is a cheap place to live and an inconvenient place to work a ski season — do not take a Panorama job from here without a winter-ready car. If you want a summer season in the Rockies, though, it is one of the better bases going.'
) ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 8. Penticton — serves Apex Mountain (~33km). 1 lead.
-- ------------------------------------------------------------
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website,
  staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options,
  public_transport_to_resort, parking_availability, distance_to_airport, road_conditions,
  weekly_cost_estimate, supermarkets, eating_out,
  local_employers, extra_job_opportunities,
  bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals,
  medical_facilities, emergency_services,
  vibe_atmosphere, international_workforce, social_life,
  avg_winter_temp, snowfall_in_town, summer_appeal,
  best_time_to_arrive, community_groups, insider_tips)
VALUES (
  'Penticton', 'penticton', 'Canada', 'British Columbia', 49.50, -119.59,
  'An Okanagan city wedged between two lakes, surrounded by vineyards and orchards. Apex Mountain Resort is 33km west and about 45 minutes up a mountain road — Penticton is where most of its staff live, and where a ski season comes with a wine region attached.',
  37000, 45000, 'https://www.penticton.ca',
  false, 'CAD $200–$325/week shared', 'Easier in winter than summer, which inverts the usual ski-town pattern — the Okanagan''s squeeze is the July tourist season, not January.', 'Rooms through Okanagan housing groups, motels along the lakes, and winter rates on places that are unaffordable in summer.',
  'A seasonal ski shuttle runs up to Apex on operating days; otherwise it is a 45-minute drive up Green Mountain Road. Penticton itself has a local transit system.', 'Free and paid parking throughout the city. Free day parking at Apex.', 'Penticton Regional Airport (YYF) is in the city with connections to Vancouver and Calgary. Kelowna (YLW) is ~65km north with far more flights.', 'Highway 97 through the valley is a main road and stays clear. Green Mountain Road up to Apex is a different proposition — narrow, climbing and genuinely snowy. Winter tyres required.',
  'CAD $375–$525/week', 'Every supermarket chain plus farm stands and a good market — city prices, not resort ones.', 'CAD $15–$28 for a pub meal. A full city food scene, plus more wineries within 20 minutes than anywhere else in Canada.',
  'Apex Mountain Resort, Penticton Regional Hospital, the wineries and orchards, city hospitality and tourism, and a busy summer events economy.', 'Vineyard and orchard work through the harvest, a large summer tourism season, and year-round city hospitality — Penticton has far more non-ski work than a ski town does.',
  'Proper city nightlife by BC interior standards — pubs, breweries, live music and a lakefront strip that goes off in summer.', 'Cafes, bakeries and restaurants across the city, plus winery restaurants through the valley.', 'Community centre, pool, several private gyms and climbing at the Skaha bluffs in shoulder season.', 'Everything: banks, pharmacies, big-box retail, gear shops, laundromats, post offices.', 'Ironman Canada and the summer festival circuit; Apex runs its own winter events calendar.',
  'Penticton Regional Hospital with a full emergency department, plus clinics and specialists.', 'RCMP, fire and ambulance all based in the city.',
  'A lake city that happens to have a ski hill above it. Winter here is the quiet season — cheap, sunny and mild in the valley, with proper snow 45 minutes up the road.', 'Apex is small and hires modestly, so the international scene is thinner than the big resorts. The valley''s agricultural season brings a much larger working-holiday population in summer.', 'Apex carpools on powder days, city pubs and breweries, lake life the moment it warms, and wine touring on days off.',
  '-4°C to 3°C', 'Little in the city — the Okanagan valley floor is mild and often bare. Apex, 1,000m higher, is a different climate entirely.', 'Excellent, and the main event. Lakes, beaches, cycling the Kettle Valley rail trail, and the wine harvest.',
  'November for a winter at Apex; March or April if you are aiming at the valley''s summer and harvest work.', 'Penticton and South Okanagan housing, buy-and-sell and rideshare groups; Apex staff channels.', 'Check the road before you commit to living down here and working up there — Green Mountain Road in a storm is the whole job. Apex is small, but it is dry, cold Okanagan snow and the village is genuinely friendly.'
) ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 9. Oliver — serves Mount Baldy (~35km). 2 leads.
-- ------------------------------------------------------------
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website,
  staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options,
  public_transport_to_resort, parking_availability, distance_to_airport, road_conditions,
  weekly_cost_estimate, supermarkets, eating_out,
  local_employers, extra_job_opportunities,
  bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals,
  medical_facilities, emergency_services,
  vibe_atmosphere, international_workforce, social_life,
  avg_winter_temp, snowfall_in_town, summer_appeal,
  best_time_to_arrive, community_groups, insider_tips)
VALUES (
  'Oliver', 'oliver', 'Canada', 'British Columbia', 49.18, -119.55,
  'A South Okanagan town that calls itself the Wine Capital of Canada and has the vineyard acreage to back it up. Baldy Mountain Resort is about 35km east and 45 minutes up into the hills — a small, family-run ski area with a big local following and no village of its own.',
  5100, 7000, 'https://www.oliver.ca',
  false, 'CAD $175–$300/week shared', 'Driven by the harvest, not the ski season. Late summer and autumn are when rooms disappear; winter is the easy time to find something.', 'Seasonal worker accommodation on the larger vineyards and orchards, motels on Highway 97, and rooms through South Okanagan housing groups.',
  'No public service up to Baldy — it is a 45-minute drive up a mountain road, and carpooling is how most people get there. Regional transit links Oliver with Osoyoos and Penticton.', 'Free parking in town. Free day parking at Baldy.', 'Penticton (YYF) ~40km north; Kelowna (YLW) ~110km with far more flights. Spokane and Vancouver are both long drives.', 'Highway 97 through the valley stays clear most of the winter. The Baldy road climbs more than 1,000m and is a proper winter drive — winter tyres, and check conditions before you leave.',
  'CAD $325–$450/week', 'A full supermarket plus farm stands and fruit stands along the highway — this is agricultural country and food is cheap.', 'CAD $14–$25 for a meal. Small-town pubs and cafes, plus winery restaurants scattered through the valley.',
  'The wineries and orchards above everything else, Baldy Mountain Resort, South Okanagan General Hospital, town hospitality and agricultural processing.', 'This is the strongest agricultural seasonal-work town in the region — pruning, thinning, harvest and cellar work run from spring to late autumn, and a lot of working-holiday travellers build a whole season around it.',
  'A couple of pubs and winery tasting rooms — quiet, and that is the point. Penticton is 40 minutes north for a real night out.', 'Cafes, a bakery and casual restaurants in town, with the valley''s winery dining nearby.', 'Community centre and pool, plus the Okanagan outdoors in every direction.', 'Grocery, pharmacy, bank, hardware, post office — everything day-to-day, with Penticton for the rest.', 'Festival of the Grape in autumn, harvest events through the valley, and Baldy''s small winter calendar.',
  'South Okanagan General Hospital in town; Penticton Regional Hospital handles anything larger.', 'RCMP, fire and ambulance based in town.',
  'Farming country with a ski hill behind it — hot, dry and busy from spring to harvest, quiet and cheap through winter. Nothing about it is a resort town, which is the appeal.', 'Large in the agricultural season — the South Okanagan has one of the biggest working-holiday populations in BC through harvest. Much smaller in winter.', 'Winery and orchard crews in season, small-town pubs, Baldy carpools on a good snow week, and lakes 20 minutes in either direction.',
  '-4°C to 3°C', 'Very little in town — the valley floor here is the mildest in the country. The snow is all up at Baldy, 1,300m higher.', 'The main season. Vineyard and orchard work, lakes, cycling and some of the hottest weather in Canada.',
  'March for the vineyard season, or November if you are specifically chasing a winter at Baldy.', 'South Okanagan harvest work, housing and rideshare Facebook groups; Baldy community channels.', 'Be honest about what you want — this is a farm-work town with skiing attached, not the other way round. If it is the winter you are after, Baldy is small and the road is long; if it is a full year in the Okanagan, Oliver is one of the cheapest places to do it.'
) ON CONFLICT (slug) DO NOTHING;

-- ═══ VERIFY ════════════════════════════════════════════════════════════
-- Fail loudly rather than leaving a half-applied set: the outreach import
-- resolves on an exact name match, so a town that silently failed to
-- insert reappears later as a rejected lead row with no obvious cause.
DO $$
DECLARE
  added INT;
  linked INT;
BEGIN
  SELECT count(*) INTO added FROM nearby_towns
   WHERE slug IN ('nelson','rossland','squamish','pemberton','invermere',
                  'panorama','radium-hot-springs','penticton','oliver');
  IF added <> 9 THEN
    RAISE EXCEPTION '00102: expected 9 towns present, found %', added;
  END IF;

  SELECT count(*) INTO linked FROM resort_nearby_towns rnt
    JOIN nearby_towns t ON t.id = rnt.town_id
    JOIN resorts r ON r.id = rnt.resort_id
   WHERE t.slug IN ('squamish','pemberton') AND r.legacy_id = '1';
  IF linked <> 2 THEN
    RAISE EXCEPTION '00102: expected Squamish + Pemberton linked to Whistler Blackcomb, found %', linked;
  END IF;

  RAISE NOTICE '00102 ok: 9 towns present, 2 Sea to Sky links';
END $$;

-- ═══ DELIBERATELY NOT ADDED ════════════════════════════════════════════
-- Meadow Creek (1 lead: White Grizzly Cat Skiing). A hamlet of roughly a
-- hundred people north of Kaslo — it has no supermarket, no clinic, no
-- transport and no housing market, so a town page for it would be thirty
-- empty fields indexed by Google, which is the kind of thin public page
-- 00098 and 00101 were cleaning up. That lead is pointed at Nelson in the
-- corrected CSV instead. If cat-ski operators become a real segment, give
-- them a proper home rather than a stub town.

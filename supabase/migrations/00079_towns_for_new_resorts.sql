-- ═══ 00079: NEARBY TOWNS FOR THE 00075 RESORT BATCH ═══════════════════
-- The 38-resort batch added in 00075 shipped without resort_nearby_towns
-- links, so 21 resorts (Japan 92–102, USA 103–106, Canada 107–108) had an
-- empty "Nearby Towns" section and an empty town dropdown when posting jobs.
-- This migration seeds 16 new towns (full detail-page content) and links them.
-- Shared towns: Morioka serves 93+96; Hachimantai City serves 95+100.
-- Palisades Tahoe (105) gets two towns: Olympic Valley (primary) + Truckee.
-- All inserts are idempotent (ON CONFLICT DO NOTHING).

-- ═══ JAPAN ═════════════════════════════════════════════════════════════
-- ------------------------------------------------------------
-- 1. Otaru (Hokkaido) — serves Kiroro (~30km)
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
  best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES (
  'Otaru', 'otaru', 'Japan', 'Hokkaido', 43.19, 141.00,
  'A historic canal port city on Hokkaido''s west coast, famous for its preserved warehouses, glassworks and seafood. The nearest real city to Kiroro — many resort workers live here or in Kiroro''s staff housing and commute over the hill.',
  110000, 1000, 'https://www.city.otaru.lg.jp',
  true, '¥12,000–¥20,000/week for a small apartment (¥50,000–¥80,000/month). Many Kiroro workers live in subsidised staff dorms at the resort instead.', 'Low — Otaru is a full-sized city with plenty of rental stock, though older buildings dominate.', 'Business hotels, hostels near the canal, monthly ("weekly mansion") apartments, Kiroro staff dorms.',
  'Resort shuttle and Hokkaido Chuo Bus services run from Otaru Station to Kiroro in winter (~50min). Some workers carpool via Akaigawa.', 'Free or cheap parking at most apartments. Kiroro has free day parking.', 'New Chitose Airport ~90km — direct JR rapid train via Sapporo takes about 1.5hr.', 'Roads are ploughed constantly but expect compacted snow and ice all winter. Winter tyres are legally essential in Hokkaido.',
  '¥25,000–¥40,000/week', 'MaxValu, Co-op Sapporo and other full-size supermarkets, plus a large discount Don Quijote.', '¥800–¥1,500 for ramen, soup curry or a teishoku set. Otaru''s sushi is famous but pricier — save it for payday.',
  'Kiroro Resort (Yu Kiroro, Club Med Kiroro), Otaru hotels, canal-district tourism businesses, seafood restaurants.', 'Hospitality in the canal tourist district, hotel work, convenience store and izakaya shifts for Japanese speakers.',
  'Izakayas and small bars cluster in the Hanazono district — cheap, cheerful and very local. Sapporo''s Susukino nightlife is 40min away by train.', 'Sushi along the famous sushi street, ramen shops, canal-side cafes, and countless small izakayas.', 'Municipal gyms and a few private fitness clubs — far cheaper than resort-town options.', 'Full city services: banks, post offices, phone shops, 100-yen stores, drug stores, konbini on every corner.', 'Otaru Snow Light Path Festival (February) turns the canal into a candlelit snow gallery. Sapporo Snow Festival is a short train ride away.',
  'Otaru General Hospital and multiple clinics. Full city medical services; some hospitals have limited English.', 'Police, fire and ambulance all based in the city. Dial 110 (police) or 119 (ambulance/fire).',
  'A slightly faded, deeply charming port city — touristy by day around the canal, quiet and local by night. City comforts with real Hokkaido snow.', 'Kiroro''s international staff (Club Med especially) create a decent foreign community, but Otaru itself is very Japanese — basic Japanese helps a lot.', 'Staff parties at Kiroro, izakaya nights in Hanazono, weekend trips into Sapporo, powder days at Kiroro''s famously deep snow.',
  '-6°C to 0°C', 'Very heavy — Otaru itself gets several metres a season. Shovelling is part of daily life.', 'Canal cruises, glassblowing, seafood markets and music-box museums keep tourism strong; great cycling and hiking nearby.',
  'Late November — Kiroro opens early by Hokkaido standards and hiring peaks in autumn.', 'Kiroro seasonal staff groups and Sapporo/Otaru expat Facebook groups.', 'Get an IC transport card (Kitaca/Suica) and a Japanese SIM on arrival. Konbini are your friend for cheap meals and paying bills. If you skip the resort dorms, living in Otaru gives you a real Japanese city for less than a Niseko share house.',
  'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1600&q=80'
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='92' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='otaru' LIMIT 1), 30, true) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 2. Morioka (Iwate) — serves Okunakayama Kogen (~35km) and Shizukuishi (~20km)
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
  best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES (
  'Morioka', 'morioka', 'Japan', 'Iwate', 39.70, 141.15,
  'Iwate''s prefectural capital and a Tohoku Shinkansen stop, famous for wanko soba, jajamen noodles and a castle-park riverside centre. A full city base within commuting reach of Shizukuishi and Okunakayama Kogen.',
  280000, NULL, 'https://www.city.morioka.iwate.jp',
  true, '¥10,000–¥18,000/week for an apartment (¥40,000–¥70,000/month) — cheap by Japanese city standards. Resort staff usually get dorms at Shizukuishi or Appi instead.', 'Low — plentiful rental stock and far cheaper than any resort town.', 'Business hotels, monthly apartments, guesthouses, resort staff dorms on-mountain.',
  'JR Tazawako Line to Shizukuishi Station then resort shuttle (~40min total). IGR Iwate Galaxy Railway runs north to Okunakayama-Kogen Station. Most staff without dorms drive.', 'Cheap monthly parking in town; resorts have free day parking.', 'Iwate Hanamaki Airport ~45km (40min by car or airport bus). Tokyo is 2hr 15min by shinkansen.', 'City roads are ploughed quickly; the run out to Shizukuishi is a proper snow-country drive in January. Winter tyres essential.',
  '¥22,000–¥35,000/week', 'Aeon Mall Morioka plus regional chains like Universe and MaxValu — big-city grocery prices, not resort prices.', '¥700–¥1,200 for noodles or a set meal. Morioka''s three famous noodles (wanko soba, jajamen, reimen) are all cheap eats.',
  'Shizukuishi Prince Hotel resort, city hotels, Okunakayama Kogen ski area, restaurants and retail.', 'Hotel and hospitality shifts in the city, English teaching, izakaya work for Japanese speakers.',
  'A compact izakaya and bar scene in the city centre — the biggest nightlife between Sendai and Sapporo, though still low-key.', 'Wanko soba halls, jajamen institutions, coffee roasters and riverside cafes — Morioka made the New York Times "52 Places" list in 2023 largely for its food and cafe culture.', 'Municipal sports centres and several private gyms at normal Japanese city prices.', 'Everything a prefectural capital has: department stores, phone carriers, banks, immigration-friendly city hall services.', 'Morioka Sansa Odori drum festival (August) is one of Tohoku''s biggest. Winter brings small snow festivals at the surrounding resorts.',
  'Iwate Medical University Hospital and many clinics — the best medical cover in the prefecture.', 'Full city police, fire and ambulance services.',
  'An underrated, easy-going castle town — big enough to have everything, small enough to feel local. Very few foreign residents, so you live like a local.', 'Small — Shizukuishi and Okunakayama hire mostly Japanese seasonal staff, with a handful of working-holiday workers. Little English spoken; some Japanese is close to essential.', 'Izakaya dinners, onsen trips to Tsunagi Onsen on the edge of town, powder weekends at Appi and Hachimantai as well as your home hill.',
  '-5°C to 3°C', 'Regular snowfalls but modest accumulation in the city — the serious snow sits on the mountains to the west.', 'Sansa Odori festival, hiking Mt Iwate, riverside beer gardens — a genuinely pleasant summer city.',
  'Early December — both resorts open mid-December and hiring is done through autumn.', 'Iwate international association events; small expat meetups tied to the universities.', 'Learn to love the konbini and the ¥100 shop. A used kei car is cheap here and transforms your season — resort trains and buses are workable but thin. Tsunagi Onsen after a ski day is the move.',
  'https://images.unsplash.com/photo-1548873903-5fc219569c50?w=1600&q=80'
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='93' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='morioka' LIMIT 1), 35, true) ON CONFLICT DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='96' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='morioka' LIMIT 1), 20, true) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 3. Iiyama (Nagano) — serves Madarao Kogen (~15km)
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
  best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES (
  'Iiyama', 'iiyama', 'Japan', 'Nagano', 36.85, 138.37,
  'A classic snow-country town with its own Hokuriku Shinkansen station, sitting in the valley below Madarao Kogen and serving as the rail gateway to Madarao and Nozawa Onsen. Temple-town streets, huge snowbanks, real rural Japan.',
  19000, 800, 'https://www.city.iiyama.nagano.jp',
  true, '¥8,000–¥15,000/week (¥35,000–¥60,000/month) for older valley apartments. Most Madarao staff live in lodge or hotel staff housing on the mountain.', 'Low in town, but on-mountain staff rooms at Madarao fill by autumn.', 'Business hotels near the station, guesthouses, Madarao lodge staff rooms and share houses.',
  'A shuttle bus runs from Iiyama Station up to Madarao Kogen in winter (~30min), timed around shinkansen arrivals. Many lodges collect their staff from the station.', 'Free parking almost everywhere in town; Madarao has free resort parking.', 'No local airport — Tokyo (Narita/Haneda) is the gateway, then Hokuriku Shinkansen to Iiyama (under 2hr from Tokyo Station).', 'The climb to Madarao is steep, snowy and relentless in January — one of Japan''s snowiest roads. Winter tyres or chains mandatory.',
  '¥20,000–¥32,000/week', 'A-Coop and other small local supermarkets in town — stock up here, as Madarao mountain has almost no shops.', '¥800–¥1,500 for soba, ramen or a set meal in town. On-mountain restaurants are lodge-based and pricier.',
  'Madarao Kogen lodges and hotels, Madarao Mountain Resort, Nozawa Onsen businesses, local soba restaurants.', 'Nozawa Onsen (20min away) has a far bigger hospitality job market if you have transport. Some spring farm work in the valley.',
  'A few quiet izakayas in town; on-mountain, the lodge bars at Madarao are where the seasonal crowd drinks. Nozawa has the area''s real après scene.', 'Family-run soba shops, small cafes near the station, izakayas — humble but good.', 'Municipal gym and sports facilities; most workers just ski.', 'Post office, banks, drug store, hardware store, konbini — small-town basics covered.', 'Iiyama Snow Festival (February) with its snow statues, and the famous kamakura snow-hut dining village nearby in winter.',
  'Iiyama has a city hospital plus clinics; serious cases go to Nagano City (~40min).', 'Local police and fire stations; ambulance response reaches the resort road.',
  'Deep-snow rural Japan — temples, rice paddies under three metres of snow, and a friendly, ageing local community that welcomes winter workers.', 'Madarao has one of Nagano''s fastest-growing international scenes — many lodges are foreign-owned and hire working-holiday staff, so English is common on-mountain.', 'Lodge family dinners, onsen runs to Nozawa, powder laps through Madarao''s famous tree runs, karaoke in town.',
  '-5°C to 2°C', 'Enormous — Iiyama is textbook snow country and the town itself is regularly buried; Madarao above it gets over 10m a season.', 'Green-season trekking on the Shin-Etsu Trail, rice-field cycling, and cheap living.',
  'Late November — lodges want staff settled before the mid-December opening.', 'Madarao seasonal workers and lodge-staff Facebook groups; Nozawa''s international community is close by.', 'Live on-mountain if you can — the commute road is brutal in a storm. Get a Suica/IC card for the shinkansen and a Japanese SIM in Tokyo before heading up. Learn kotatsu culture fast: it is how you survive valley housing.',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80'
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='94' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='iiyama' LIMIT 1), 15, true) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 4. Hachimantai City (Iwate) — serves Appi Kogen (~15km) and Hachimantai resort (~20km)
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
  best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES (
  'Hachimantai', 'hachimantai-city', 'Japan', 'Iwate', 39.93, 141.10,
  'A rural onsen city of scattered farming settlements beneath the Hachimantai plateau, home turf for Appi Kogen — one of Tohoku''s biggest resorts — and the smaller Hachimantai ski areas. Quiet, snowy and steeped in hot-spring culture.',
  24000, 500, 'https://www.city.hachimantai.lg.jp',
  true, '¥7,000–¥12,000/week (¥30,000–¥50,000/month) for rural housing, but almost all resort staff live in Appi''s hotel staff dormitories with meals included.', 'Very low — this is depopulating rural Iwate; the constraint is dorm places at Appi, not town housing.', 'Appi Kogen staff dorms, onsen ryokan worker rooms, a handful of pensions and guesthouses.',
  'JR Hanawa Line stops at Appi-Kogen Station right by the resort; shuttle buses also run from Morioka Station (~50min). Hachimantai resort needs a car or resort shuttle.', 'Free parking everywhere — this is deep countryside.', 'Iwate Hanamaki Airport ~75km (about 1.5hr); most international arrivals come via Tokyo and the shinkansen to Morioka.', 'Rural roads are ploughed but long, dark and icy between settlements. The high Aspite Line over the plateau closes entirely for winter.',
  '¥18,000–¥28,000/week (less if dorm meals are included)', 'Small local supermarkets and farm stores in the Nishine and Ashiro districts; serious shopping means a run into Morioka.', '¥700–¥1,200 for ramen or a teishoku at roadside restaurants. On-resort dining at Appi is hotel-priced.',
  'Appi Kogen resort and the ANA InterContinental Appi Kogen hotel — the dominant employer — plus onsen ryokan (Matsukawa Onsen area) and the Hachimantai ski areas.', 'Ryokan and onsen work, occasional farm work; Morioka''s job market is under an hour away.',
  'Essentially none in town — social life happens in the Appi staff dorms and hotel bars, or on nights out in Morioka.', 'Roadside noodle shops, a few farm-to-table cafes, hotel restaurants at Appi.', 'Resort and hotel facilities for staff; no real gym scene in town.', 'Post offices, a small drug store, konbini along the main roads — bring anything specialist from the city.', 'Hachimantai''s spring "snow corridor" opening on the Aspite Line is the local spectacle; small onsen and harvest festivals through the year.',
  'Small clinics in town; the nearest full hospitals are in Morioka (~45min).', 'Local police boxes and a fire station; ambulance transfers to Morioka for anything serious.',
  'Remote, silent, beautiful — steaming onsen in the snow, ski-in powder mornings, and very little else. You come here for the mountain, not the town.', 'Growing but still small — Appi has pushed internationally since the ANA InterContinental opened and hires some foreign staff, but rural Iwate speaks very little English.', 'Dorm-mate dinners, onsen soaking (Matsukawa Onsen''s milky water is the classic), night skiing at Appi, weekend escapes to Morioka.',
  '-7°C to 1°C', 'Heavy and dry — Appi is famous for silky "aspirin snow" powder, and the town below gets a solid snowpack all winter.', 'The Hachimantai plateau is a hiking and onsen paradise once the Aspite Line reopens; trekking, marshland boardwalks, autumn colours.',
  'Early December — Appi opens in mid-December and dorm places are allocated well beforehand.', 'Appi seasonal staff networks; Iwate international association in Morioka.', 'Take the dorm with meals — winter grocery runs here are a chore without a car. A JR Hanawa Line timetable is worth memorising: trains are few. Onsen etiquette (wash first, no towels in the water) is your ticket to the best part of living here.',
  'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?w=1600&q=80'
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='95' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='hachimantai-city' LIMIT 1), 15, true) ON CONFLICT DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='100' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='hachimantai-city' LIMIT 1), 20, true) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 5. Karuizawa (Nagano) — serves Karuizawa Prince (~3km)
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
  best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES (
  'Karuizawa', 'karuizawa', 'Japan', 'Nagano', 36.35, 138.63,
  'Japan''s most polished resort town — a highland retreat of villas, boutiques and a giant outlet mall, just 70 minutes from Tokyo by shinkansen. The Karuizawa Prince ski slopes start practically at the station.',
  21000, 1500, 'https://www.town.karuizawa.lg.jp',
  true, '¥18,000–¥35,000/week (¥75,000–¥140,000/month) — the priciest rents on this list. Prince Hotels houses most seasonal staff in company dorms at a fraction of that.', 'High — Karuizawa is a wealthy second-home town and cheap rentals are genuinely scarce. Take the staff dorm.', 'Prince staff dormitories, business hotels, guesthouses; monthly apartments exist but book out.',
  'The ski resort is about 3km from Karuizawa Station — resort shuttle buses loop from the station, and plenty of staff just cycle or walk.', 'Paid parking near the station and outlets; the resort has large (busy) day car parks.', 'No local airport — Tokyo Haneda/Narita via Hokuriku Shinkansen (Tokyo Station is ~70min away).', 'Modest snowfall but frequent black ice at this altitude; roads are well maintained. Winter tyres still required.',
  '¥30,000–¥45,000/week', 'Tsuruya Karuizawa — a famously good supermarket — plus Delicia and convenience stores.', '¥1,000–¥2,500 typical; Karuizawa skews upmarket, from bakery lunches to serious French dining. The outlet food court is the budget option.',
  'Prince Hotels (ski resort, hotels, Karuizawa Prince Shopping Plaza outlet mall), luxury hotels, restaurants and boutiques.', 'Big retail job market at the outlet mall, hotel banqueting, cafe and bakery work — more non-ski winter jobs than any other town on this list.',
  'Wine bars, hotel bars and a brewery taproom rather than party nightlife — Karuizawa evenings are civilised. Tokyo is close enough for a big night out.', 'Exceptional for a town this size: historic bakeries, coffee roasters, soba houses and the Kyu-Karuizawa Ginza shopping street.', 'Hotel fitness clubs and private gyms; ice skating at the Kazakoshi Park arena.', 'The Prince Shopping Plaza outlet (200+ stores), banks, clinics, everything — this town wants for nothing.', 'Winter illuminations around the station and churches; a packed summer calendar of concerts and markets.',
  'Karuizawa Hospital plus several private clinics used to dealing with visitors.', 'Police, fire and ambulance stations in town.',
  'Upscale, tidy and international-facing — more "alpine Tokyo weekender" than ski bum town. The slopes are family-oriented with immaculate machine-groomed snow.', 'Solid — Prince Hotels actively recruits working-holiday staff, and the hotel and retail scene employs many foreign workers. English gets you further here than almost anywhere in rural Japan.', 'Cafe-hopping, outlet shopping on days off, onsen at Hoshino''s Tombo-no-yu, easy Tokyo day trips.',
  '-4°C to 4°C', 'Light — Karuizawa is cold but dry; the resort relies heavily on world-class snowmaking, which is why it opens as early as November.', 'The main season — summer Karuizawa is Japan''s classic highland escape, packed with Tokyoites, festivals and green luxury.',
  'Early November — Karuizawa Prince opens earlier than nearly every resort in Japan and hires accordingly.', 'Prince seasonal staff networks; active international residents'' community by Nagano standards.', 'This is the season job for people who want convenience over powder: shinkansen to Tokyo, a heated dorm, and November-to-March employment. Bring warm layers — it is colder than the snowfall suggests. Staff discounts at the outlet mall are a genuine perk.',
  'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1600&q=80'
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='97' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='karuizawa' LIMIT 1), 3, true) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 6. Minamiuonuma (Niigata) — serves Hakkaisan (~10km)
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
  best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES (
  'Minamiuonuma', 'minamiuonuma', 'Japan', 'Niigata', 37.07, 138.88,
  'The heart of Japan''s snow country and its most famous rice region — home of Uonuma Koshihikari rice and the Hakkaisan sake brewery, under the steep face of Mt Hakkai and its old-school ski area.',
  54000, 500, 'https://www.city.minamiuonuma.niigata.jp',
  true, '¥8,000–¥14,000/week (¥35,000–¥55,000/month) around Muikamachi. Ski area and ryokan staff often get simple worker housing.', 'Low — this is a working rural city, not a resort bubble; housing is cheap and available.', 'Business hotels in Muikamachi, ryokan worker rooms, guesthouses; the Joetsu Shinkansen stops at Urasa in the city.',
  'Hakkaisan''s base is ~10km from Muikamachi/Urasa — a short winter shuttle or drive; local buses exist but are sparse, so most workers drive or get lifts.', 'Free and abundant everywhere.', 'No convenient airport — Tokyo via Joetsu Shinkansen from Urasa Station (~1.5hr) is the standard route in.', 'Serious snow-country driving: the city routinely carries metres of roadside snow, but Niigata''s road-melting sprinkler systems and ploughing are the best in Japan.',
  '¥18,000–¥30,000/week', 'Regional supermarket chains and farm stores in Muikamachi — everyday Japanese prices, excellent local rice and produce.', '¥800–¥1,500 for ramen, tonkatsu or soba; splash out occasionally on hegisoba, the local seaweed-bound noodle speciality.',
  'Hakkaisan ski area, Hakkaisan sake brewery, onsen ryokan, rice-related food producers; the bigger Ishiuchi Maruyama and Joetsu Kokusai resorts are minutes up the valley.', 'The Yuzawa resort cluster (Ishiuchi Maruyama, Gala Yuzawa, Joetsu Kokusai) is 15–30min away and hires heavily each winter — living here puts a dozen resorts in commuting range.',
  'Quiet local izakayas and sake bars — this is a place to drink very good nihonshu slowly, not to party. Echigo-Yuzawa has slightly more going on.', 'Soba and ramen shops, family restaurants, and the Hakkaisan brewery''s snow-aged sake facilities with tastings nearby.', 'Municipal sports centres; most workers count powder laps as cardio.', 'Banks, post offices, drug stores, home centres — proper rural-city infrastructure.', 'Snow festivals through February and lively autumn harvest and sake events; the region celebrates rice like nowhere else.',
  'Uonuma Kikan Hospital in the city is a modern regional hub, plus local clinics.', 'City police and fire departments; well-drilled snow-emergency response.',
  'Authentic snow country: three-metre snowbanks, sake breweries, steaming rice fields — utterly unglamorous and completely real Japan.', 'Small — Hakkaisan is a locals'' mountain and this is not an international resort scene. Japanese language matters here; nearby Yuzawa sees more foreign staff.', 'Sake tastings, onsen after work, deep-powder mornings at Hakkaisan''s ropeway, snowshoeing between rice villages.',
  '-3°C to 3°C', 'Among the heaviest in Japan — this valley is the original "snow country" of Kawabata''s novel, and the town itself gets buried repeatedly.', 'Brilliant green rice terraces, riverside cycling, sake and food tourism.',
  'Early December — the ski area and ryokan staff up before the late-December rush.', 'Local international exchange association; Yuzawa-area seasonal worker groups.', 'A car is close to essential and turns the whole Yuzawa valley into your job market. Buy rice and sake locally — you are living at the source of Japan''s best of both. Learn what a "yukiguni" roof shovel is; you may be handed one.',
  'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1600&q=80'
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='98' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='minamiuonuma' LIMIT 1), 10, true) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 7. Tsumagoi (Gunma) — serves Manza Onsen (~20km)
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
  best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES (
  'Tsumagoi', 'tsumagoi', 'Japan', 'Gunma', 36.53, 138.53,
  'A highland farming village famous for summer cabbage fields, spread beneath the volcanoes of the Gunma–Nagano border. The service village for Manza Onsen, the high sulphur hot-spring resort where most winter staff actually live and work.',
  9000, 300, 'https://www.vill.tsumagoi.gunma.jp',
  true, '¥7,000–¥12,000/week (¥30,000–¥50,000/month) in the village — but note nearly all Manza Onsen workers live in hotel staff housing up at the onsen itself (around 1,800m), with meals and onsen access included.', 'Very low in the village; Manza staff rooms are allocated by the hotels when you''re hired.', 'Manza hotel staff dorms (the norm), village minshuku and pensions, Karuizawa hotels 40min away.',
  'Sparse — a bus connects Manza-Kazawaguchi Station (Agatsuma Line) and the Karuizawa area to Manza Onsen, but services are limited. Staff typically arrive via employer transport from Karuizawa or Manza-Kazawaguchi.', 'Free village parking; Manza hotels have staff and guest parking.', 'No local airport — Tokyo Haneda/Narita via shinkansen to Karuizawa (~40min drive away) is the practical route.', 'The winter road up to Manza is a serious high-altitude snow road, and the Shiga–Kusatsu route over the pass closes completely in winter. Chains or proper winter tyres non-negotiable.',
  '¥15,000–¥25,000/week (much less living in at Manza with meals)', 'A couple of small village supermarkets and farm stores; there is nothing to buy up at Manza beyond hotel shops, so stock up before ascending.', '¥700–¥1,200 at village noodle shops and drive-in restaurants; at Manza you mostly eat hotel staff meals.',
  'Manza Onsen hotels (Manza Prince Hotel and neighbouring ryokan) and the Manza Onsen ski area; Palcall Tsumagoi ski resort is also in the village.', 'Summer flips the village economy to cabbage farming — Japan''s biggest highland cabbage harvest hires seasonal field workers, making a year-round Tsumagoi stint possible.',
  'None in any real sense — evenings mean the staff dorm, the hotel izakaya, and soaking in some of Japan''s most acidic, milky-white sulphur baths.', 'Village soba houses and roadside restaurants; hotel dining at Manza.', 'Hotel staff facilities; otherwise the mountains are the gym.', 'Post office, agricultural co-op store, konbini in the lower village — bring specialist items from Tokyo or Karuizawa.', 'Cabbage-harvest festivals in summer; quiet winters where the onsen itself is the event.',
  'A village clinic; real medical care means Karuizawa or Naganohara, so hotels manage winter medical transport.', 'Village fire brigade and police box; mountain rescue coordinated through the resorts.',
  'The remotest posting on this list: a 1,800m onsen village above the clouds, steam rising through the snow, silent nights and star-filled skies. Isolation is the price and the point.', 'Minimal — Manza hires mostly Japanese seasonal hotel staff with only occasional foreign workers. Functional Japanese is effectively required.', 'Onsen soaking (staff usually get free access), board games in the dorm, snowshoe walks, the odd staff trip down to Karuizawa.',
  '-10°C to -2°C at Manza — one of the coldest inhabited spots in Kanto', 'Consistent dry powder at altitude; the village below gets less but stays white all winter.', 'Cabbage fields to the horizon, volcano hiking on Mt Shirane and Asama, cool highland summers that draw Tokyo cyclists.',
  'Early December, with hiring through autumn; ask explicitly about staff housing and meals — they define your season here.', 'Hotel staff networks; the village international community is tiny.', 'Confirm your room is AT Manza Onsen before accepting a job — commuting up daily in winter is unrealistic. The sulphur water is legendary for skin and joints but strips silver jewellery black, so leave it home. A kotatsu and good books beat any nightlife you''ll be missing.',
  'https://images.unsplash.com/photo-1548873903-5fc219569c50?w=1600&q=80'
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='99' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='tsumagoi' LIMIT 1), 20, true) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 8. Aomori City (Aomori) — serves Hakkoda (~25km)
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
  best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES (
  'Aomori', 'aomori-city', 'Japan', 'Aomori', 40.82, 140.75,
  'The prefectural capital at the top of Honshu — a ferry and shinkansen hub, apple capital of Japan, and one of the snowiest cities on Earth. Base town for the legendary deep-powder backcountry terrain of the Hakkoda mountains.',
  270000, NULL, 'https://www.city.aomori.aomori.jp',
  true, '¥9,000–¥16,000/week (¥35,000–¥65,000/month) — cheap city apartments are easy to find. Hakkoda-area lodges and onsen ryokan house their own staff on the mountain.', 'Low — a shrinking regional capital with plenty of rental stock.', 'Business hotels, monthly apartments, guesthouses, mountain ryokan staff rooms (including around the famous Sukayu Onsen area).',
  'A JR bus runs from Aomori Station to the Hakkoda Ropeway (about 1hr), year-round. Riders without a car build their day around its timetable.', 'Cheap city parking; free parking at the ropeway base.', 'Aomori Airport ~13km (35min bus) with domestic flights and some international routes; Shin-Aomori Station connects to Tokyo in ~3hr.', 'The city ploughs constantly and still drowns in snow; the mountain road to the ropeway is a storm-driving education. Winter tyres essential everywhere.',
  '¥22,000–¥35,000/week', 'Full city shopping — regional chains like Universe plus national supermarkets, drug stores and a fish market culture all its own.', '¥800–¥1,500 gets superb food: miso-curry-milk ramen (a real local dish), fresh scallops, and the build-your-own nokkedon seafood bowl at Furukawa Market.',
  'Hakkoda Ropeway, mountain lodges and onsen ryokan (Sukayu Onsen among them), city hotels, the ferry terminal and food industries.', 'City hospitality and hotel work, English teaching, apple-industry work in autumn — the widest off-mountain job market in this list.',
  'A genuine little nightlife quarter of izakayas and snack bars in the city centre — lively by Tohoku standards, dead cheap by Tokyo standards.', 'Seafood izakayas, ramen counters, apple-pie cafes (an Aomori obsession), market stalls.', 'Municipal gyms and private fitness clubs at normal city prices.', 'Everything: department stores, phone carriers, immigration office, ferry connections to Hokkaido.', 'The spectacular Nebuta Festival every August; in winter, the snow itself is the festival — plus the "snow monsters" (juhyo) on Hakkoda''s summit.',
  'Aomori Prefectural Central Hospital and full city medical services.', 'Full city police, fire and ambulance; mountain rescue operates in the Hakkoda backcountry — respect it, people die out there in whiteouts.',
  'A gritty, friendly, workaday northern city — zero resort gloss. Hakkoda is a serious mountain for serious riders, and the city wears its eight metres of annual snow like a badge.', 'Small but growing — Hakkoda''s reputation pulls international powder tourists and guides each winter, yet the workforce remains mostly Japanese. English is limited; effort in Japanese is repaid warmly.', 'Izakaya nights, onsen pilgrimages to Sukayu''s thousand-person cedar bath, ropeway powder laps, ferry-trip weekends to Hakodate.',
  '-4°C to 1°C', 'Extreme — roughly 8m falls on the city itself in an average winter, among the highest of any city its size in the world.', 'Nebuta Festival, apple orchards, Shimokita and Tsugaru peninsula road trips, seafood at its peak.',
  'Early December — the ropeway runs all winter and lodge hiring happens in autumn.', 'Aomori international association; a small but welcoming expat and guide community around Hakkoda.', 'Hakkoda is backcountry-grade terrain: get avalanche gear and go with people who know the mountain, especially in storms. Live near Aomori Station to be on the ropeway bus line. Buy a proper snow shovel for your apartment doorway — you will use it daily.',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80'
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='101' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='aomori-city' LIMIT 1), 25, true) ON CONFLICT DO NOTHING;

-- ------------------------------------------------------------
-- 9. Semboku (Akita) — serves Tazawako (~10km)
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
  best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES (
  'Semboku', 'semboku', 'Japan', 'Akita', 39.70, 140.73,
  'A rural Akita city wrapped around Lake Tazawa — Japan''s deepest lake — with the storied Nyuto Onsen ryokan hidden in the beech forest above and the Kakunodate samurai district at its southern end. Tazawako ski resort sits on the mountainside between lake and onsen.',
  24000, 300, 'https://www.city.semboku.akita.jp',
  true, '¥7,000–¥12,000/week (¥30,000–¥50,000/month) around the Tazawako and Kakunodate districts; ski resort and ryokan staff are commonly housed on-site.', 'Very low — rural Akita has cheap, plentiful housing; on-site ryokan rooms are the usual arrangement anyway.', 'Ryokan worker rooms (Nyuto Onsen ryokan traditionally house live-in staff), lakeside pensions, business hotels near Tazawako Station.',
  'The Akita Shinkansen (Komachi) stops at Tazawako Station; local Ugo Kotsu buses run from the station past the lake to the ski resort and on up to Nyuto Onsen (~30–40min).', 'Free everywhere, including the ski resort.', 'Akita Airport ~60km (about 1hr by car); Tokyo is ~3hr direct on the Komachi shinkansen.', 'Lakeside and mountain roads are ploughed but quiet, icy and dark at night — the climb to Nyuto Onsen demands respect in a storm. Winter tyres essential.',
  '¥16,000–¥26,000/week (less if living in at a ryokan with meals)', 'Small supermarkets in the Tazawako and Kakunodate districts; a proper shop means Daisen or Akita City.', '¥700–¥1,200 for local staples — miso-grilled kiritanpo rice skewers, Inaniwa udon and mountain-vegetable soba.',
  'Tazawako ski resort, the Nyuto Onsen ryokan collective (including the famous 350-year-old Tsurunoyu), lakeside hotels, Kakunodate tourism businesses.', 'Ryokan service and housekeeping work is the big alternative to ski jobs; Kakunodate''s samurai-district tourism adds cafe and guide work, busiest in cherry-blossom season.',
  'Practically none — a handful of izakayas near the stations. Nights here are onsen, dinner, sleep. Perfect or dreadful depending on the worker.', 'Homely soba and udon shops, lakeside cafes with Tatsuko-statue views, ryokan kaiseki dinners if you''re staff-fed.', 'Municipal facilities only; skiing and snowshoeing are the fitness plan.', 'Post offices, small drug stores, konbini near the stations — rural basics, nothing more.', 'Kakunodate''s weeping-cherry festival (spring) is nationally famous; winter brings the Tazawako area''s small snow and fire festivals and quiet lakeside beauty.',
  'Clinics in town; the nearest substantial hospitals are in Daisen (~30min) and Akita City.', 'Local police and fire services; mountain rescue via the resort and ryokan network.',
  'Serene and half-asleep in winter: a steel-blue lake that never freezes, snow-buried beech forest, lantern-lit ryokan. One of the most beautiful places in Tohoku to spend a season — and one of the quietest.', 'Very small — Tazawako and the Nyuto ryokan hire almost entirely Japanese staff, with rare working-holiday placements. Minimal English; conversational Japanese opens every door here.', 'Onsen-hopping the seven Nyuto baths, quiet powder days at Tazawako with lake views from the lifts, weekend trips to Kakunodate and Morioka (35min by shinkansen).',
  '-5°C to 2°C', 'Heavy and reliable in the hills — the ski area and Nyuto forest sit under deep snowpack all winter, with less accumulation by the lake.', 'Lake swimming and kayaking, the Tatsuko legend and gold statue, samurai-district strolls under cherry blossoms.',
  'Early December — the resort and ryokan settle winter staff in before the New Year holiday crush, their busiest week of the season.', 'Semboku city international exchange programmes; ryokan staff networks.', 'If a ryokan offers live-in work with meals and onsen access, that is the authentic-Japan jackpot — take it. The Komachi shinkansen makes Morioka your practical "big city". Cash is still king in rural Akita: withdraw at the post office ATM, and carry more than you think you need.',
  'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?w=1600&q=80'
) ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='102' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='semboku' LIMIT 1), 10, true) ON CONFLICT DO NOTHING;

-- ═══ USA ═══════════════════════════════════════════════════════════════
-- ============================================================
-- Salt Lake City, Utah — serves Snowbird (Little Cottonwood Canyon)
-- ============================================================
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website, hero_image_url,
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
  'Salt Lake City', 'salt-lake-city', 'United States', 'Utah', 40.76, -111.89,
  'A full-sized city with four major ski areas within an hour — Snowbird is ~40km up Little Cottonwood Canyon. The big-city option: real rents, real jobs, and the UTA Ski Bus straight up the canyon.',
  200000, 205000, 'https://www.slc.gov', 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1600&q=80',
  true, 'USD $180–$300/week shared', 'Moderate — far easier than resort towns. Sandy, Cottonwood Heights and Midvale are the closest suburbs to the canyon.', 'Hostels downtown, Airbnb, month-to-month rooms on Craigslist/Facebook. Snowbird also runs employee housing at the resort.',
  'UTA Ski Bus runs up Little Cottonwood Canyon in winter from park-and-rides in Sandy/Midvale — free or cheap with a resort pass. Many workers carpool; the canyon road is ~40min in good conditions.', 'Free street parking in most SLC neighbourhoods. Snowbird parking fills early on powder days — the bus is often faster.', 'Salt Lake City International (SLC) ~10km, 15min from downtown. One of the best-connected ski airports in the US.', 'SR-210 up Little Cottonwood Canyon has a traction law (snow tyres or chains) and closes regularly for avalanche control — check UDOT before dawn patrol.',
  'USD $350–$500/week', 'Smith''s, Harmons, Trader Joe''s, Costco, WinCo — full city grocery options, much cheaper than mountain towns.', 'USD $12–$25 mains. Everything from cheap tacos to fine dining — huge range compared to any resort town.',
  'Snowbird, Alta, Brighton and Solitude resorts; downtown hotels, restaurants and the airport.', 'Year-round city jobs — hospitality, retail, warehouse, rideshare. Easy to stack a city job with resort work.',
  'Proper city nightlife downtown — bars, clubs, live music. Utah''s liquor laws are quirkier than other states but the scene is real.', 'Hundreds of options — coffee roasters, brunch spots, every cuisine. Sugar House and downtown are the main strips.', 'Big-box gyms, climbing gyms (SLC is a climbing hub), yoga studios everywhere.', 'Everything a city has — malls, gear shops (multiple ski/board retailers), mechanics, phone stores.', 'Sundance Film Festival is up the road in Park City each January. NBA games, concerts, and a busy downtown events calendar all winter.',
  'University of Utah Hospital and Intermountain Medical Center — major hospitals, plus urgent care clinics throughout the valley.', 'Full city police, fire and ambulance services.',
  'A real city that happens to sit under world-class skiing. Less ski-bum bubble, more balance — you trade the village vibe for cheaper rent and options.', 'Sizeable international scene — J-1 students and working-holiday Aussies/Kiwis at the four Cottonwood resorts, plus a diverse city population.', 'Canyon carpools, brewery nights, climbing gym sessions. The powder-day text chain is the real social network.',
  '-6°C to 4°C', 'Regular valley snowfall, though winter inversions can trap haze in the city while the canyons sit in sunshine.', 'Hiking and climbing in the Wasatch, five national parks within a half-day drive.',
  'Early November — resort hiring fairs run October–November and city housing is easy to line up year-round.', 'Cottonwood Canyons carpool and powder Facebook groups, SLC ski-bum housing groups.', 'Live near a Ski Bus park-and-ride in Sandy or Midvale — canyon traffic on powder mornings is brutal and the bus skips the queue. Many Snowbird workers take resort employee housing to dodge the commute entirely.'
)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='103' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='salt-lake-city' LIMIT 1), 40, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Avon, Colorado — serves Beaver Creek
-- ============================================================
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website, hero_image_url,
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
  'Avon', 'avon-colorado', 'United States', 'Colorado', 39.63, -106.52,
  'The gateway town at the base of Beaver Creek, ~4km below the village. More down-to-earth than Vail or Beaver Creek proper — this is where a lot of the Vail Valley workforce actually lives.',
  6500, 10000, 'https://www.avon.org', 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1600&q=80',
  true, 'USD $300–$500/week shared', 'High — the Vail Valley is one of the most expensive ski markets in the US. Workers share in Avon, Eagle-Vail, Edwards and further down-valley in Eagle.', 'Hostel-style worker lodging is scarce; short-term Airbnb and sublets bridge the gap. Vail Resorts offers employee housing for Beaver Creek staff — apply early.',
  'The Riverfront Express Gondola links Avon to Beaver Creek Landing, and free town and valley buses run to the resort base. Genuinely car-optional for the commute.', 'Free town lots in Avon with time limits. Beaver Creek village parking is paid and tight — take the gondola or bus.', 'Eagle County Regional (EGE) ~35km with winter ski flights. Denver International ~190km (2.5–3.5hr on I-70, longer in storms).', 'I-70 and US-6 are heavily maintained but Vail Pass closes in big storms. No mountain pass needed between Avon and Beaver Creek itself.',
  'USD $450–$650/week', 'City Market and a Walmart in Avon itself — a genuine advantage over most resort towns.', 'USD $15–$30 mains. Solid mid-range options in Avon; Beaver Creek village dining is resort-priced.',
  'Vail Resorts (Beaver Creek), the Westin Riverfront, Ritz-Carlton Bachelor Gulch, and valley hotels and restaurants.', 'Vail is 15km east — many workers stack shifts across both resorts'' hospitality scenes. Down-valley Edwards has restaurant work too.',
  'A handful of solid locals'' bars in Avon; bigger nights happen in Vail Village, a short bus ride away.', 'Good spread of grills, taquerias and coffee shops in Avon and nearby Edwards.', 'Avon Recreation Center has a gym, pool and hot tubs — popular with seasonal staff.', 'Grocery, pharmacy, gear shops, post office — Avon covers the essentials so you rarely need Vail prices.', 'Birds of Prey World Cup downhill races at Beaver Creek each December; free winter concerts and a busy summer calendar at Nottingham Park.',
  'Colorado Mountain Medical clinics in Avon; Vail Health Hospital ~15km east in Vail.', 'Avon police, Eagle River fire protection, ambulance service in the valley.',
  'Working-town energy below a white-glove resort. Beaver Creek is polished and quiet; Avon is where staff live, shop and socialise.', 'Big international crew — Vail Resorts brings in large J-1 and working-holiday cohorts every winter; South Americans, Aussies and Kiwis are everywhere.', 'Employee ski days, rec-center hot-tub sessions, house parties in Eagle-Vail, bus-ride friendships.',
  '-8°C to 3°C', 'Regular snowfall in town at 2,270m elevation — a real winter town.', 'Mountain biking, hiking, and concerts at Nottingham Park. Summer in the Vail Valley is arguably better than winter.',
  'Early November — Beaver Creek opens around Thanksgiving and employee housing fills well before that.', 'Vail Valley housing and jobs Facebook groups; Vail Resorts'' internal housing board for staff.', 'Apply for Vail Resorts employee housing the moment you''re hired — market rents in the valley will eat a resort wage. If you miss out, look down-valley in Eagle where rent drops and the ECO bus still gets you to work.'
)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='104' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='avon-colorado' LIMIT 1), 4, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Olympic Valley, California — serves Palisades Tahoe (base village)
-- ============================================================
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website, hero_image_url,
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
  'Olympic Valley', 'olympic-valley', 'United States', 'California', 39.20, -120.24,
  'The base village of Palisades Tahoe and site of the 1960 Winter Olympics. A tiny valley with a walkable resort village — living here means living at work, and very few manage it.',
  1500, 4000, NULL, 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1600&q=80',
  true, 'USD $350–$500/week shared', 'Very high — housing stock in the valley is minimal and mostly vacation homes. The vast majority of workers live in Truckee or Tahoe City instead.', 'Village hotel/condo sublets in shoulder season, Airbnb, and Palisades Tahoe employee housing (limited beds, apply early).',
  'You''re already there — the village sits at the lifts. TART buses run along Highway 89 connecting the valley to Truckee and Tahoe City.', 'Large base-area lots that fill by mid-morning on weekends and powder days.', 'Reno-Tahoe International (RNO) ~70km, about 1hr via I-80 in good conditions.', 'Highway 89 along the Truckee River is well-plowed but chain controls are routine in storms; Sierra storm cycles can be enormous.',
  'USD $500–$700/week', 'Only small village markets in the valley — workers do real grocery runs in Truckee or Tahoe City.', 'USD $15–$35 village dining, skewed resort-priced. Cooking at home requires a shopping trip out of the valley.',
  'Palisades Tahoe (by far the largest), the Everline Resort & Spa, PlumpJack Inn, and village restaurants and shops.', 'Very little beyond the resort ecosystem — for second jobs, look to Truckee or Tahoe City.',
  'Le Chamois — "the Chammy" — is one of the most storied après bars in US skiing and doubles as the staff living room. Otherwise nightlife means Truckee or Tahoe City.', 'Village coffee shops, pizza and resort restaurants; solid après scene, limited everyday options.', 'Hotel gyms and the resort''s facilities; most workers rely on the mountain for their exercise.', 'Ski/board shops and village retail — essentials require a trip to Truckee.', 'WinterWonderGrass bluegrass festival, big-mountain freeride comps, and a packed spring events calendar at the base.',
  'Small clinic coverage in the valley; Tahoe Forest Hospital in Truckee (~19km) is the nearest hospital.', 'Fire station in the valley; sheriff and ambulance coverage from the North Tahoe/Truckee area.',
  'Pure ski-resort village — you wake up under KT-22, one of the most famous lifts in America. Magic if you land housing, impractical for most.', 'Strong J-1 and working-holiday presence at Palisades — Aussies, Kiwis and South Americans fill lift ops and hospitality every winter.', 'Après at the Chammy, employee race leagues, dawn-patrol laps before clock-in.',
  '-7°C to 5°C', 'Heavy — the valley floor sits at 1,890m and Sierra storms regularly dump metres. Snowbanks taller than cars by February.', 'Aerial tram to High Camp, hiking, and the Truckee River for rafting. The valley hosts events all summer.',
  'Early November — employee housing and the few valley rentals are gone well before the lifts spin.', 'North Tahoe/Truckee housing and jobs Facebook groups; Palisades Tahoe employee channels.', 'Take resort employee housing if offered — it''s effectively the only way to live in the valley on a seasonal wage. Otherwise plan for Truckee and the TART bus from day one, and don''t sign anything sight-unseen.'
)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='105' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='olympic-valley' LIMIT 1), 1, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Truckee, California — serves Palisades Tahoe (the worker town)
-- ============================================================
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website, hero_image_url,
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
  'Truckee', 'truckee', 'United States', 'California', 39.33, -120.18,
  'A historic railroad town on I-80 and the real worker hub for North Lake Tahoe. More rental stock, more services and more year-round life than anywhere else near Palisades Tahoe (~19km).',
  17000, 25000, NULL, 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80',
  false, 'USD $250–$400/week shared', 'High but workable — the biggest rental market in North Tahoe. Shared houses in Glenshire, Tahoe Donner and Prosser are the standard worker setup.', 'Winter sublets, Airbnb, and room shares posted heavily in local Facebook groups each autumn.',
  'TART buses run Highway 89 from Truckee to Palisades Tahoe and Tahoe City, with on-demand TART Connect service around town. Many workers still drive or carpool — ~25min to the resort.', 'Free parking in most of Truckee; downtown has time limits. Resort lots fill early on weekends.', 'Reno-Tahoe International (RNO) ~50km, ~40min straight down I-80. Amtrak''s California Zephyr also stops right in downtown Truckee.', 'I-80 over Donner Summit is a major interstate but closes or requires chains in big Sierra storms. Highway 89 to Palisades has routine winter chain controls.',
  'USD $400–$550/week', 'Safeway, Save Mart, Grocery Outlet and natural-food stores — proper full-price-range shopping.', 'USD $12–$28 mains. Historic downtown has a genuinely good food scene, from breweries to date-night spots.',
  'Palisades Tahoe, Northstar (Vail Resorts) and Sugar Bowl are all within ~30min, plus downtown restaurants, hotels and retail.', 'Three major resorts in commuting range means bar, restaurant and retail shifts are easy to stack on top of mountain work.',
  'The best nightlife in North Tahoe — historic downtown bars, breweries and live music. Where Palisades and Northstar staff end up on nights off.', 'Strong coffee culture, bakeries, brewpubs and restaurants along Donner Pass Road.', 'Local gyms, climbing/fitness options, and endless trail access; Tahoe Donner has member facilities.', 'Gear shops, thrift stores, hardware, mechanics, DMV-adjacent errands — Truckee is where North Tahoe gets things done.', 'Truckee Thursdays street festival (summer), holiday festivities downtown, and race/festival events at the surrounding resorts all winter.',
  'Tahoe Forest Hospital — the main hospital for the entire North Tahoe/Truckee region — plus urgent care and clinics.', 'Truckee police, fire district, ambulance, and Caltrans/CHP managing the mountain corridors.',
  'Mountain town with real bones — railroad history, a working main street, and a big community of people who moved here for snow and stayed.', 'Growing international mix — J-1s and working-holiday visa holders from Palisades and Northstar share houses all over town alongside a large Latino community.', 'Brewery nights, backyard hot tubs, Nordic skiing at Donner, powder-day carpools organised the night before.',
  '-8°C to 5°C', 'Heavy and reliable — Truckee sits at 1,800m near Donner Summit and is regularly among the snowiest towns in America.', 'Donner Lake beaches, mountain biking, climbing at Donner Summit, river days — summer here is superb.',
  'Late October — hiring fairs run through autumn and the good shared houses go before Thanksgiving.', 'Tahoe/Truckee housing and jobs Facebook groups are extremely active and where nearly all worker housing is found.', 'AWD/snow tyres or chains are non-negotiable if you drive — I-80 checkpoints will turn you around. Glenshire rooms are often the best value; check TART times before signing somewhere off the bus line.'
)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='105' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='truckee' LIMIT 1), 19, false)
ON CONFLICT DO NOTHING;

-- ============================================================
-- South Lake Tahoe, California — serves Heavenly (gondola from town)
-- ============================================================
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description,
  population_permanent, population_seasonal, website, hero_image_url,
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
  'South Lake Tahoe', 'south-lake-tahoe', 'United States', 'California', 38.94, -119.98,
  'The classic American ski-worker town: the Heavenly gondola rises straight out of town, casinos sit across the Nevada line at Stateline, and shared houses full of seasonal workers line the backstreets.',
  21000, 30000, 'https://www.cityofslt.us', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80',
  true, 'USD $250–$400/week shared', 'High — but with far more housing stock than most resort towns. Shared houses are the norm; rooms turn over constantly as seasons change.', 'Motels along US-50 do winter weekly rates, plus Airbnb and sublets. Heavenly (Vail Resorts) offers employee housing — limited and worth applying for early.',
  'The Heavenly gondola loads from Heavenly Village in the middle of town, and local buses plus resort shuttles cover the California and Nevada base lodges. Genuinely car-free-friendly for the commute.', 'Free and paid lots around Heavenly Village; base-lodge lots fill on weekends. Street parking rules tighten during snow-removal.', 'Reno-Tahoe International (RNO) ~90km, ~1.25hr over Spooner Summit in good conditions.', 'US-50 and the Spooner/Echo Summit approaches carry chain controls in storms; big Sierra cycles can shut passes entirely for a day.',
  'USD $400–$550/week', 'Safeway, Raley''s and Grocery Outlet in town — real supermarkets at semi-normal prices.', 'USD $12–$25 mains. Huge range for a mountain town: taquerias, diners, casino buffets and everything between.',
  'Heavenly (Vail Resorts), the Stateline casino hotels (Harrah''s, Harveys and neighbours), and a deep bench of restaurants, motels and rental shops.', 'The casinos hire year-round across food, beverage, housekeeping and front desk — the classic second job. Kirkwood and Sierra-at-Tahoe are within ~45min for extra shifts.',
  'Unique in US skiing: 24-hour casino bars and shows at Stateline plus dive bars and breweries on the California side. Nights out are never in question.', 'Strong budget-eats scene along US-50, good coffee shops, and lakefront dining for payday treats.', 'Local gyms and rec facilities, plus the obvious: lake runs and skinning Heavenly before work.', 'Everything a real town has — gear shops, thrift stores, laundromats, pharmacies, mechanics.', 'Casino headliners all winter, New Year''s at Stateline is enormous, and lake-life festivals take over in summer.',
  'Barton Memorial Hospital in town, plus urgent care and clinics.', 'City police, Douglas County sheriff across the line, fire and ambulance services in town.',
  'Unpolished, fun and genuinely affordable-ish by Tahoe standards — a working town where seasonal staff outnumber tourists in the neighbourhoods behind the casinos.', 'One of the biggest J-1 hubs in US skiing — Heavenly and the casinos bring in large international crews, and Aussies/Kiwis on working-holiday visas are a fixture every winter.', 'House parties, casino nights, hot springs missions, and a beach bonfire culture that carries into shoulder season.',
  '-7°C to 5°C', 'Regular snowfall at 1,900m lake level — expect to shovel, with huge totals in big storm years.', 'Lake Tahoe in summer is world-famous — beaches, boating, hiking Desolation Wilderness. Many winter workers stay for it.',
  'Early November — Heavenly opens mid-November and the best rooms and casino jobs are locked in by then.', 'Tahoe housing and jobs Facebook groups (very active), Heavenly employee channels.', 'Live within walking or bus distance of the gondola and you can skip owning a car entirely. Casino jobs across the line in Nevada often pay better than resort hospitality — plenty of workers ride lifts by day and deal blackjack by night.'
)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='106' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='south-lake-tahoe' LIMIT 1), 3, true)
ON CONFLICT DO NOTHING;

-- ═══ CANADA ════════════════════════════════════════════════════════════
-- ============================================================
-- Golden, British Columbia (serves Kicking Horse Mountain Resort)
-- ============================================================
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
  best_time_to_arrive, community_groups, insider_tips,
  hero_image_url)
VALUES (
  'Golden', 'golden', 'Canada', 'British Columbia', 51.30, -116.96,
  'A working CPR railway town on the Trans-Canada Highway where the Kicking Horse River meets the Columbia. Base town for Kicking Horse Mountain Resort, with a genuine local community and cheaper living than the Banff–Lake Louise corridor.',
  7000, 9000, 'https://www.tourismgolden.com',
  true, 'CAD $200–$325/week shared', 'Tight in early winter but noticeably easier than Banff or Revelstoke. Start looking before December.', 'Hostels and worker houses in town, motels along the highway strip, short-term rooms via local Facebook groups.',
  'No regular public bus up the hill — most workers drive or carpool the ~20min run up Kicking Horse Trail. Local taxis operate in town.', 'Free street parking in town. Free day lots at Kicking Horse.', 'Calgary Airport (YYC) ~270km (3hr) via Lake Louise.', 'Trans-Canada through Kicking Horse Canyon is well-maintained; winter tires legally required Oct–Apr. Rogers Pass to the west closes periodically for avalanche control.',
  'CAD $350–$500/week', 'Full-size supermarket in town plus smaller grocers and a bakery — cheaper than shopping on-mountain.', 'CAD $15–$25 pub meals. A solid handful of restaurants and cafes for a town this size, plus cheap highway food.',
  'Kicking Horse Mountain Resort, CP Rail, the local sawmill, hotels and restaurants in town and on the highway strip.', 'Rail and forestry work year-round, hotel housekeeping, heli-ski and snowmobile operators in winter.',
  'A couple of proper locals'' pubs and a taproom — low-key but friendly. The real party nights are on-mountain events at Kicking Horse.', 'Good cafes and bakeries downtown, casual pubs, a few dinner spots. Many workers cook at home.', 'Mount 7 Rec Plex (arena, curling), local yoga and climbing options.', 'Banks, pharmacy, hardware store, outdoor gear shops, laundromat, post office.', 'Snow King''s Masque Parade (winter lantern festival), summer farmers market, mountain bike and trail-running events.',
  'Golden & District General Hospital (emergency dept) in town. Medical clinic for GP visits.', 'RCMP, ambulance and fire all based in town.',
  'Unpretentious mountain-industry town — railway workers and ski bums side by side. Less polished than resort villages, and locals like it that way.', 'Strong IEC working-holiday scene — Aussies, Kiwis, Brits and Europeans staff much of the resort each winter.', 'House parties, pub nights, carpool crews up the hill, hot springs missions to Radium and Banff on days off.',
  '-12°C to -2°C', 'Regular snowfall in town but far less than the mountain — the valley bottom sits around 800m.', 'Paragliding off Mount 7 is world-class, plus rafting the Kicking Horse, mountain biking and the grizzly bear refuge at the resort.',
  'Mid November. Resort hiring peaks Oct–Nov and housing goes fast once the season is confirmed.', 'Golden and Kicking Horse seasonal worker and housing Facebook groups.', 'A cheap car (or a reliable carpool) makes the season — the hill is 14km up a mountain road with no public bus. Living in Golden is far cheaper than resort accommodation, and the town has real year-round jobs if you want to stay past winter.',
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80'
)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='107' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='golden' LIMIT 1), 14, true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Fernie, British Columbia (serves Fernie Alpine Resort)
-- ============================================================
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
  best_time_to_arrive, community_groups, insider_tips,
  hero_image_url)
VALUES (
  'Fernie', 'fernie', 'Canada', 'British Columbia', 49.50, -115.06,
  'A historic coal-mining town in the Elk Valley with heritage brick buildings and legendary powder. Fernie Alpine Resort is just 5km away, and the town is a fixture of BC''s Powder Highway.',
  6000, 8500, 'https://tourismfernie.com',
  true, 'CAD $225–$350/week shared', 'High — Fernie''s reputation means rooms go quickly. Line something up before you arrive if you can.', 'Hostels and worker houses in town, motels on Highway 3, staff accommodation at the resort.',
  'A winter shuttle links town and the resort on ski days; many workers still drive or carpool the 10min trip. Everything in town itself is walkable.', 'Free parking in town. Free day lots at the resort.', 'Cranbrook Airport (YXC) ~100km (1hr15). Calgary Airport (YYC) ~330km (3.5hr) via the Crowsnest Pass.', 'Highway 3 through the Elk Valley is a major route and well-plowed, but expect winter driving conditions Nov–Apr. Winter tires required.',
  'CAD $375–$525/week', 'Full-size supermarket in town plus smaller grocers — no need to shop on-mountain.', 'CAD $15–$25 pub meals. Genuinely good food scene for a small town — bakeries, sushi, pizza, brewpub fare.',
  'Fernie Alpine Resort (Resorts of the Canadian Rockies), Elk Valley coal mines, hotels, restaurants and the local brewery.', 'Mining-adjacent and trades work pays well year-round; cat-ski operators, hotels and cafes hire every winter.',
  'Proper apres town — historic hotel bars with live music, a busy brewery taproom, and packed powder-day celebrations.', 'Excellent bagel and coffee spots, sushi, casual grills and a brewpub, mostly along the walkable heritage downtown.', 'Fernie Aquatic Centre (pool, gym), yoga studios, community centre programs.', 'Banks, pharmacy, several ski and outdoor gear shops, laundromat, thrift store, post office.', 'Griz Days winter festival (celebrating the town''s powder-bringing Griz legend), Wapiti Music Festival in summer.',
  'Elk Valley Hospital (emergency dept) right in town. Medical clinics for GP visits.', 'RCMP, ambulance and fire all based in town.',
  'Heritage mining town turned powder mecca — brick storefronts, friendly locals, and a town that genuinely celebrates snowfall.', 'One of the strongest Aussie/Kiwi seasonal scenes in Canada, plus Brits and Europeans on IEC working-holiday visas.', 'Powder-day rituals, pub live music, hot tub sessions, and a social circuit small enough that you know everyone by Christmas.',
  '-10°C to -2°C', 'Heavy — Fernie town itself gets proper dumps, and shoveling is part of life.', 'Renowned mountain biking and fly fishing on the Elk River, hiking, and summer festivals. Many workers stay year-round.',
  'Early-to-mid November. Resort hiring ramps up in October and the best shared houses are gone by December.', 'Fernie seasonal worker, buy-and-sell and housing Facebook groups.', 'Live in town, not on-mountain — the shuttle and short drive make it easy, rent is lower, and the nightlife is in town. Say hello to the Griz statue and don''t book flights home before the legendary late-season dumps.',
  'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1600&q=80'
)
ON CONFLICT (slug) DO NOTHING;
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
VALUES ((SELECT id FROM resorts WHERE legacy_id='108' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='fernie' LIMIT 1), 5, true)
ON CONFLICT DO NOTHING;

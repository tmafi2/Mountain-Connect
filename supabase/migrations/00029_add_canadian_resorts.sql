-- ═══ ADD 13 CANADIAN SKI RESORTS + NEARBY TOWNS ═════════════
-- Legacy IDs 57–69. All use North America region (legacy_id='2').

-- ── SUN PEAKS RESORT (BC) — legacy_id='57' ────────────────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  '57', 'Sun Peaks Resort',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'Canada''s second-largest ski area by skiable terrain, located in the interior of British Columbia. Sun Peaks offers three mountains, a charming European-style village, and famously uncrowded slopes. A hidden gem with reliable dry powder.', 50.8837, -119.9003,
  'British Columbia', 'Sun Peaks Village', 'https://www.sunpeaksresort.com', 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1600&q=80',
  1728, 137, 14, 58, 52, 13,
  882, 1200, 2080, 13, '{"gondolas":1,"chairlifts":7,"surface_lifts":5}'::jsonb,
  600, '2025-11-28', '2026-04-12',
  ARRAY['Sun Peaks Grand Hotel', 'Sun Peaks Resort LLP', 'Nancy Greene''s Cahilty Hotel', 'Village restaurants and shops']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Staff', 'Kitchen Staff', 'Bartender / Server', 'Retail Sales', 'Guest Services', 'Ski Patrol']::text[], '800–1,200', ARRAY['English']::text[],
  'Working Holiday Visa (IEC) for most international workers. LMIA-backed permits available for some roles.', 'Hiring begins August–September. Many positions filled by October.',
  true, 500, 'CAD $500–$900/month shared',
  'CAD $300–$450/week', 'Free village shuttle. Kamloops (45min drive) for larger services.', ARRAY['Free season pass', 'Staff meal discounts', 'Pro deals on gear', 'Staff housing available']::text[],
  'Morrisey''s, Bottoms Bar & Grill, Masa''s Bar. Relaxed village après. Less hectic than Whistler.', ARRAY['Cross-country skiing', 'Snowshoeing', 'Dog sledding', 'Ice skating', 'Fat biking']::text[], 'Sun Peaks Health Centre for minor issues. Kamloops Royal Inland Hospital (45min) for emergencies.', 'Village has basics — small grocery, gear shops, restaurants. Kamloops for full services.',
  'Moderate — growing international community. Australians, British, Japanese workers. More Canadian-dominated than Whistler.',
  -12, -3, 'high', 5
) ON CONFLICT DO NOTHING;

-- ── BIG WHITE SKI RESORT (BC) — legacy_id='58' ────────────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  '58', 'Big White Ski Resort',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'British Columbia''s largest totally ski-in/ski-out resort, famous for its champagne powder and "snow ghosts" — trees encrusted in rime ice. Located near Kelowna in the Okanagan, Big White has a vibrant village and strong Australian seasonal worker culture.', 49.7225, -118.9314,
  'British Columbia', 'Big White Village', 'https://www.bigwhite.com', 'https://images.unsplash.com/photo-1477601263568-180e2c6d046e?w=1600&q=80',
  1147, 118, 18, 40, 42, 18,
  777, 1508, 2319, 16, '{"gondolas":0,"chairlifts":5,"surface_lifts":11}'::jsonb,
  750, '2025-11-28', '2026-04-13',
  ARRAY['Big White Ski Resort Ltd', 'Big White Central Reservations', 'Village restaurants and pubs', 'Ski school operators']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Housekeeping', 'F&B Staff', 'Retail Sales', 'Childcare / Kids Camp', 'Guest Services', 'Grooming']::text[], '1,000–1,500', ARRAY['English']::text[],
  'Working Holiday Visa (IEC). Strong Australian contingent on WHV.', 'Hiring August–October. Australian workers often recruited via agencies.',
  true, 600, 'CAD $600–$1,000/month shared',
  'CAD $300–$450/week', 'Free village shuttle. Kelowna (56km) has full city services and airport.', ARRAY['Free season pass', 'Staff discounts', 'Pro deals', 'Staff events', 'Accommodation assistance']::text[],
  'Snowshoe Sam''s, Blarney Stone Pub, Kettle Valley Steakhouse. Fun Aussie-influenced après scene.', ARRAY['Snowshoeing', 'Ice climbing', 'Tubing', 'Cross-country skiing', 'Snowmobiling']::text[], 'Village first aid. Kelowna General Hospital (56km) for emergencies.', 'Small village shops and grocery. Kelowna for full shopping.',
  'Large Australian community — Big White is known as "Little Australia" in winter. Also British and European workers.',
  -12, -4, 'high', 5
) ON CONFLICT DO NOTHING;

-- ── SILVER STAR MOUNTAIN RESORT (BC) — legacy_id='59' ──────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  '59', 'Silver Star Mountain Resort',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'A colourful, brightly painted heritage village in the North Okanagan. Silver Star is known for its charming Victorian-style village, excellent cross-country skiing, and family-friendly atmosphere. The resort is owned by Vail Resorts.', 50.3569, -119.0608,
  'British Columbia', 'Silver Star Village', 'https://www.skisilverstar.com', 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1600&q=80',
  520, 132, 20, 50, 40, 22,
  760, 1155, 1915, 12, '{"gondolas":1,"chairlifts":5,"surface_lifts":6}'::jsonb,
  700, '2025-11-28', '2026-04-06',
  ARRAY['Vail Resorts', 'Silver Star Mountain Resort', 'Village hotels and restaurants', 'Sovereign Lake Nordic Centre']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'F&B Staff', 'Housekeeping', 'Retail Sales', 'Guest Services', 'Nordic Trail Grooming']::text[], '500–800', ARRAY['English']::text[],
  'Working Holiday Visa (IEC). Vail Resorts handles some LMIA permits.', 'Hiring begins August. Vail Resorts positions fill early.',
  true, 300, 'CAD $500–$800/month shared',
  'CAD $280–$400/week', 'Vernon (22km) for larger services. Limited public transit.', ARRAY['Free Epic Pass (Vail Resorts)', 'Staff discounts', 'Pro deals', 'Staff events']::text[],
  'The Den, Bugaboos Café. Relaxed village atmosphere. Less party-focused, more community.', ARRAY['Cross-country skiing (world-class)', 'Snowshoeing', 'Tubing', 'Fat biking', 'Ice skating']::text[], 'Village first aid. Vernon Jubilee Hospital (22km).', 'Small village shops. Vernon for full services.',
  'Growing international community but smaller than Big White or Whistler. Australian and British workers.',
  -12, -3, 'high', 8
) ON CONFLICT DO NOTHING;

-- ── LAKE LOUISE SKI RESORT (AB) — legacy_id='60' ──────────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  '60', 'Lake Louise Ski Resort',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'Set in Banff National Park with views of the iconic Victoria Glacier, Lake Louise is one of the most scenic ski resorts in the world. The resort offers vast terrain across four mountain faces and is part of the SkiBig3 with Sunshine and Norquay.', 51.4414, -116.1525,
  'Alberta', 'Lake Louise Village', 'https://www.skilouise.com', 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1600&q=80',
  1700, 145, 25, 45, 47, 28,
  991, 1645, 2637, 10, '{"gondolas":1,"chairlifts":6,"surface_lifts":3}'::jsonb,
  360, '2025-11-08', '2026-05-11',
  ARRAY['Lake Louise Ski Resort (Resorts of the Canadian Rockies)', 'Fairmont Chateau Lake Louise', 'Lake Louise Inn', 'Parks Canada']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Staff', 'F&B Staff', 'Retail Sales', 'Guest Services', 'Ski Patrol']::text[], '600–1,000', ARRAY['English']::text[],
  'Working Holiday Visa (IEC). Fairmont offers LMIA-backed permits for hotel roles.', 'Hiring begins August. Hotel positions fill earliest.',
  true, 400, 'CAD $500–$900/month (staff housing at Lake Louise or Banff)',
  'CAD $350–$500/week', 'Free Roam bus between Lake Louise and Banff. SkiBig3 shuttle between resorts.', ARRAY['Free or discounted season pass', 'SkiBig3 access', 'Staff meal discounts', 'Staff housing', 'Pro deals']::text[],
  'Lodge of the Ten Peaks base lodge. Banff (45min) has the real nightlife scene.', ARRAY['Snowshoeing', 'Ice skating on Lake Louise', 'Cross-country skiing', 'Ice climbing', 'Wildlife viewing']::text[], 'Lake Louise Medical Clinic. Banff Mineral Springs Hospital (45min). Canmore Hospital.', 'Small Lake Louise village — general store, gas station. Banff and Canmore for full services.',
  'Very international — Working Holiday makers from Australia, UK, Japan, Europe. Fairmont employs many international workers.',
  -18, -5, 'high', 5
) ON CONFLICT DO NOTHING;

-- ── SUNSHINE VILLAGE (AB) — legacy_id='61' ─────────────────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  '61', 'Sunshine Village',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'Located on the continental divide in Banff National Park, Sunshine Village receives more natural snow than any other Canadian resort. The gondola-accessed resort sits at high elevation and has Canada''s longest non-glacial season. Part of SkiBig3.', 51.0784, -115.7749,
  'Alberta', 'Banff', 'https://www.skibanff.com', 'https://images.unsplash.com/photo-1610906592995-1852b86452b9?w=1600&q=80',
  1358, 137, 20, 36, 46, 35,
  1070, 1660, 2730, 12, '{"gondolas":1,"chairlifts":8,"surface_lifts":3}'::jsonb,
  900, '2025-11-08', '2026-05-25',
  ARRAY['Sunshine Village (Resorts of the Canadian Rockies)', 'Sunshine Mountain Lodge', 'On-mountain restaurants']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Staff', 'F&B Staff', 'Guest Services', 'Snowmaker', 'Ski Patrol']::text[], '500–800', ARRAY['English']::text[],
  'Working Holiday Visa (IEC). Some LMIA positions at the lodge.', 'Hiring begins August–September.',
  true, 200, 'CAD $500–$800/month (on-mountain lodge or Banff housing)',
  'CAD $350–$500/week', 'Free staff shuttle from Banff. Public Roam bus available.', ARRAY['Free season pass', 'SkiBig3 access', 'On-mountain accommodation', 'Staff meals', 'Pro deals']::text[],
  'Mad Trapper''s Saloon on-mountain. Banff (20min) for full nightlife.', ARRAY['Snowshoeing', 'Backcountry skiing', 'Hot springs (Banff)', 'Cross-country skiing']::text[], 'On-mountain first aid. Banff Mineral Springs Hospital (20min).', 'Minimal on-mountain. Banff has full services.',
  'International workers based in Banff. Large WHV community shared with Lake Louise and Norquay.',
  -18, -6, 'high', 0
) ON CONFLICT DO NOTHING;

-- ── NAKISKA SKI AREA (AB) — legacy_id='62' ─────────────────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  '62', 'Nakiska Ski Area',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'Site of the 1988 Calgary Winter Olympics alpine events, located in Kananaskis Country just 45 minutes from Calgary. A smaller, family-friendly resort popular with locals and race training programs.', 50.9442, -115.1508,
  'Alberta', 'Kananaskis Village', 'https://www.skinakiska.com', 'https://images.unsplash.com/photo-1520443240718-fce21901db79?w=1600&q=80',
  400, 71, 16, 29, 20, 6,
  735, 1525, 2260, 6, '{"gondolas":0,"chairlifts":4,"surface_lifts":2}'::jsonb,
  250, '2025-12-06', '2026-04-06',
  ARRAY['Resorts of the Canadian Rockies (Nakiska)', 'Kananaskis Mountain Lodge', 'Local hospitality']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'F&B Staff', 'Guest Services', 'Snowmaker']::text[], '200–350', ARRAY['English']::text[],
  'Working Holiday Visa (IEC). Smaller employer — fewer sponsored positions.', 'Hiring September–November.',
  false, 0, 'N/A — workers live in Canmore (25km) or Calgary',
  'CAD $300–$450/week (Canmore-based)', 'Drive required. Canmore (25km). Calgary (83km).', ARRAY['Free season pass', 'Staff discounts', 'Pro deals']::text[],
  'Minimal on-mountain. Canmore has excellent pubs and restaurants.', ARRAY['Hiking in Kananaskis', 'Cross-country skiing', 'Snowshoeing', 'Wildlife viewing']::text[], 'Canmore General Hospital (25km). Calgary hospitals (1hr).', 'Nothing on-mountain. Canmore and Calgary for all services.',
  'Small seasonal workforce. Mostly Canadian locals from Calgary and Canmore.',
  -16, -5, 'moderate', 30
) ON CONFLICT DO NOTHING;

-- ── MARMOT BASIN / JASPER (AB) — legacy_id='63' ────────────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  '63', 'Marmot Basin',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'Jasper National Park''s ski resort, offering uncrowded slopes with stunning Rocky Mountain scenery. Marmot Basin is the most northerly large ski area in Alberta, known for its dry powder and laid-back atmosphere. The town of Jasper is the base.', 52.8053, -117.6006,
  'Alberta', 'Jasper', 'https://www.skimarmot.com', 'https://images.unsplash.com/photo-1610394295702-00b39272459d?w=1600&q=80',
  688, 91, 28, 35, 20, 8,
  914, 1698, 2612, 7, '{"gondolas":0,"chairlifts":5,"surface_lifts":2}'::jsonb,
  400, '2025-11-16', '2026-04-26',
  ARRAY['Marmot Basin', 'Fairmont Jasper Park Lodge', 'Jasper hotels and restaurants', 'Parks Canada']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Staff', 'F&B Staff', 'Retail Sales', 'Guest Services']::text[], '400–600', ARRAY['English']::text[],
  'Working Holiday Visa (IEC). Fairmont and Parks Canada offer LMIA positions.', 'Hiring begins August–September.',
  true, 300, 'CAD $500–$900/month',
  'CAD $300–$450/week', 'Shuttle from Jasper to Marmot Basin (20min). SunDog Tours.', ARRAY['Free season pass', 'Staff meal discounts', 'Pro deals', 'National park perks']::text[],
  'Jasper town pubs — Downstream, The D''ed Dog Bar & Hound, Pete''s On Patricia.', ARRAY['Ice skating', 'Snowshoeing', 'Cross-country skiing', 'Wildlife viewing (elk, bighorn sheep)', 'Maligne Canyon ice walk', 'Dark sky stargazing']::text[], 'Jasper Healthcare Centre. Nearest major hospital: Hinton (80km) or Edmonton (4hr).', 'Jasper town has essentials — grocery, gas, restaurants, gear shops. Smaller than Banff.',
  'Growing international community. Jasper is smaller and more intimate than Banff. Strong Parks Canada culture.',
  -18, -6, 'high', 0
) ON CONFLICT DO NOTHING;

-- ── MONT-TREMBLANT (QC) — legacy_id='64' ───────────────────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  '64', 'Mont-Tremblant',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'Eastern Canada''s premier ski resort, featuring a colourful pedestrian village modelled after Quebec City. Located in the Laurentian Mountains north of Montreal, Tremblant is a Vail Resorts property with a distinctly French-Canadian character.', 46.2096, -74.5854,
  'Quebec', 'Mont-Tremblant Village', 'https://www.tremblant.ca', 'https://images.unsplash.com/photo-1548873903-5fc219569c50?w=1600&q=80',
  305, 102, 18, 32, 32, 20,
  645, 230, 875, 14, '{"gondolas":1,"chairlifts":9,"surface_lifts":4}'::jsonb,
  394, '2025-11-22', '2026-04-19',
  ARRAY['Alterra Mountain Company / Tremblant', 'Fairmont Tremblant', 'Casino de Mont-Tremblant', 'Village restaurants and shops']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Staff', 'F&B Staff', 'Casino Staff', 'Retail Sales', 'Guest Services']::text[], '1,500–2,500', ARRAY['French', 'English']::text[],
  'Working Holiday Visa (IEC). Quebec has additional immigration requirements — French proficiency strongly preferred. Some employers provide LMIA support.', 'Hiring begins September. French-speaking applicants have priority.',
  true, 800, 'CAD $500–$900/month shared',
  'CAD $350–$500/week', 'Free resort shuttle within village. Montreal (130km) accessible by car.', ARRAY['Free or discounted season pass', 'Ikon Pass access', 'Staff meal discounts', 'Pro deals', 'Casino employee perks']::text[],
  'Le P''tit Caribou (legendary Tremblant nightclub), Microbrasserie La Diable, Fairmont lobby bar. Vibrant après and nightlife.', ARRAY['Cross-country skiing', 'Snowshoeing', 'Dog sledding', 'Fat biking', 'Spa visits']::text[], 'CLSC des Laurentides health centre. Saint-Jérôme hospital (60km). Mont-Tremblant medical clinics.', 'Full pedestrian village with shops, restaurants, grocery stores. Saint-Jovite (nearby) for more options.',
  'Bilingual (French/English). International workers welcome but French is essential for front-of-house roles. European and Latin American workers.',
  -18, -7, 'moderate', 50
) ON CONFLICT DO NOTHING;

-- ── LE MASSIF DE CHARLEVOIX (QC) — legacy_id='65' ──────────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  '65', 'Le Massif de Charlevoix',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'The highest vertical drop east of the Rockies, with stunning views of the St. Lawrence River. Le Massif is a boutique resort in the UNESCO Charlevoix Biosphere Reserve with a uniquely French-Canadian cultural experience. Owned by Group Le Massif.', 47.2756, -70.6303,
  'Quebec', 'Baie-Saint-Paul', 'https://www.lemassif.com', 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?w=1600&q=80',
  200, 53, 9, 16, 19, 9,
  770, 30, 800, 5, '{"gondolas":0,"chairlifts":3,"surface_lifts":2}'::jsonb,
  650, '2025-12-06', '2026-04-13',
  ARRAY['Le Massif Inc.', 'Hôtel & Spa Le Germain Charlevoix', 'Baie-Saint-Paul restaurants']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Staff', 'F&B Staff', 'Guest Services']::text[], '300–500', ARRAY['French', 'English']::text[],
  'Working Holiday Visa (IEC). French is almost essential in Charlevoix.', 'Hiring September–November.',
  true, 150, 'CAD $400–$700/month',
  'CAD $280–$400/week', 'Train de Charlevoix (scenic railway). Quebec City (95km).', ARRAY['Free season pass', 'Staff meals', 'Pro deals']::text[],
  'Baie-Saint-Paul has charming bistros and bars. Quieter than Tremblant.', ARRAY['Cross-country skiing', 'Snowmobiling', 'Whale watching (seasonal)', 'Art galleries']::text[], 'Baie-Saint-Paul medical clinic. Quebec City hospitals (95km).', 'Baie-Saint-Paul is a small but charming art town with essentials.',
  'Predominantly French-Canadian. Small international presence. Deeply Québécois culture.',
  -20, -8, 'high', 20
) ON CONFLICT DO NOTHING;

-- ── MONT-SAINTE-ANNE (QC) — legacy_id='66' ─────────────────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  '66', 'Mont-Sainte-Anne',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'One of Eastern Canada''s largest resorts, just 30 minutes from Quebec City. Mont-Sainte-Anne offers extensive night skiing, world-class cross-country trails, and easy access to one of North America''s most historic cities. Part of the Resorts of the Canadian Rockies family.', 47.0764, -70.9050,
  'Quebec', 'Beaupré', 'https://www.mont-sainte-anne.com', 'https://images.unsplash.com/photo-1606666334434-4c24739144a5?w=1600&q=80',
  200, 71, 15, 28, 22, 6,
  625, 175, 800, 8, '{"gondolas":1,"chairlifts":4,"surface_lifts":3}'::jsonb,
  500, '2025-11-22', '2026-04-19',
  ARRAY['Resorts of the Canadian Rockies', 'Chateau Mont-Sainte-Anne', 'Base area restaurants']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Staff', 'F&B Staff', 'Night Skiing Operations', 'Guest Services']::text[], '400–600', ARRAY['French', 'English']::text[],
  'Working Holiday Visa (IEC). French important for guest-facing roles.', 'Hiring September–November.',
  true, 200, 'CAD $400–$700/month',
  'CAD $280–$400/week', 'Shuttle to Quebec City. Car recommended.', ARRAY['Free season pass', 'Night skiing access', 'Staff meals', 'Quebec City proximity']::text[],
  'Base lodge après. Quebec City (30min) has incredible nightlife and culture.', ARRAY['Night skiing', 'Cross-country skiing (world-class)', 'Snowshoeing', 'Fat biking', 'Quebec City sightseeing']::text[], 'Beaupré medical clinic. Quebec City hospitals (30min).', 'Beaupré has basics. Quebec City for everything else.',
  'Mostly French-Canadian. Quebec City provides cultural richness. Small international contingent.',
  -20, -8, 'moderate', 60
) ON CONFLICT DO NOTHING;

-- ── STONEHAM MOUNTAIN RESORT (QC) — legacy_id='67' ─────────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  '67', 'Stoneham Mountain Resort',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'Quebec City''s closest ski resort, just 20 minutes north. Stoneham is known for its excellent night skiing, terrain parks, and accessibility. A popular resort for both locals and seasonal workers who want to live in Quebec City.', 46.9294, -71.3578,
  'Quebec', 'Stoneham-et-Tewkesbury', 'https://www.ski-stoneham.com', 'https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=1600&q=80',
  150, 42, 9, 13, 15, 5,
  420, 250, 670, 8, '{"gondolas":0,"chairlifts":4,"surface_lifts":4}'::jsonb,
  450, '2025-11-28', '2026-04-06',
  ARRAY['Resorts of the Canadian Rockies', 'Base area restaurants and bars']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'F&B Staff', 'Terrain Park Crew', 'Night Operations', 'Guest Services']::text[], '200–400', ARRAY['French', 'English']::text[],
  'Working Holiday Visa (IEC). French essential.', 'Hiring October–November.',
  false, 0, 'N/A — workers live in Quebec City (20min)',
  'CAD $280–$400/week (Quebec City-based)', 'Car recommended. Quebec City bus system nearby.', ARRAY['Free season pass', 'Night skiing access', 'Staff meals']::text[],
  'Bar on base area. Quebec City has world-class nightlife — Grande Allée, Saint-Roch district.', ARRAY['Night skiing', 'Terrain parks', 'Cross-country skiing', 'Quebec City festivals']::text[], 'Quebec City hospitals (20min). Stoneham medical clinic.', 'Stoneham village has basics. Quebec City for everything.',
  'Mostly French-Canadian. Quebec City base means access to a vibrant, historic city.',
  -20, -8, 'moderate', 65
) ON CONFLICT DO NOTHING;

-- ── BLUE MOUNTAIN RESORT (ON) — legacy_id='68' ─────────────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  '68', 'Blue Mountain Resort',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'Ontario''s largest ski resort, located on the shores of Georgian Bay near Collingwood. Blue Mountain is a major four-season destination with a vibrant village, extensive snowmaking, and accessibility from Toronto (2.5hr). Owned by Alterra Mountain Company.', 44.5064, -80.3147,
  'Ontario', 'Collingwood', 'https://www.bluemountain.ca', 'https://images.unsplash.com/photo-1565992441121-4367c2967103?w=1600&q=80',
  100, 43, 10, 18, 12, 3,
  220, 180, 400, 15, '{"gondolas":0,"chairlifts":7,"surface_lifts":8}'::jsonb,
  300, '2025-12-06', '2026-03-29',
  ARRAY['Alterra Mountain Company', 'Blue Mountain Village hotels', 'Scandinave Spa', 'Village restaurants and shops']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Staff', 'F&B Staff', 'Retail Sales', 'Spa Staff', 'Guest Services', 'Snowmaker']::text[], '1,000–1,800', ARRAY['English']::text[],
  'Working Holiday Visa (IEC). Large employer with structured HR.', 'Hiring August–October. Blue Mountain recruits early.',
  true, 500, 'CAD $500–$800/month shared',
  'CAD $300–$450/week', 'Resort shuttle within village. Collingwood (10min). Toronto (2.5hr drive, no direct transit).', ARRAY['Free season pass', 'Ikon Pass access', 'Staff discounts', 'Spa access', 'Staff events']::text[],
  'The Firehall, Jozo''s Bar, Copper Blues. Blue Mountain Village has a busy après scene.', ARRAY['Snowshoeing', 'Tubing', 'Ridge Runner Mountain Coaster', 'Scandinave Spa', 'Cross-country skiing']::text[], 'Collingwood General & Marine Hospital (10km). Pharmacies in village and Collingwood.', 'Blue Mountain Village has shops and restaurants. Collingwood for full services.',
  'Growing international community. Popular with WHV workers from Australia, UK, Ireland. Toronto proximity attracts diverse workers.',
  -12, -3, 'low', 95
) ON CONFLICT DO NOTHING;

-- ── ASESSIPPI SKI AREA (MB) — legacy_id='69' ───────────────
INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  '69', 'Asessippi Ski Area',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'Manitoba''s premier ski area, located in Asessippi Provincial Park in the Shell River Valley. A small but spirited resort that proves you can ski on the prairies. Popular with Manitoba and Saskatchewan locals.', 51.1567, -101.5678,
  'Manitoba', 'Russell', 'https://www.asessippi.com', 'https://images.unsplash.com/photo-1582641637614-3f446aa083fa?w=1600&q=80',
  40, 25, 8, 9, 6, 2,
  150, 490, 640, 4, '{"gondolas":0,"chairlifts":2,"surface_lifts":2}'::jsonb,
  150, '2025-12-13', '2026-03-22',
  ARRAY['Asessippi Ski Area & Resort', 'On-site lodge']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'F&B Staff', 'Rental Shop Staff', 'Guest Services']::text[], '50–100', ARRAY['English']::text[],
  'Working Holiday Visa (IEC) accepted but positions are limited.', 'Hiring October–November.',
  true, 30, 'CAD $300–$500/month (on-site basic)',
  'CAD $200–$300/week', 'Car essential. Russell (20km). Nearest city: Brandon (150km).', ARRAY['Free season pass', 'Staff accommodation', 'Meals']::text[],
  'Lodge lounge after skiing. Very quiet — this is rural Manitoba.', ARRAY['Cross-country skiing', 'Snowshoeing', 'Snowmobiling', 'Ice fishing']::text[], 'Russell Health Centre. Brandon Regional Health Centre (150km).', 'Russell has basic services. Brandon for larger needs.',
  'Minimal international presence. Mostly local Canadian workers from Manitoba and Saskatchewan.',
  -25, -12, 'moderate', 70
) ON CONFLICT DO NOTHING;

-- ═══ NEARBY TOWNS ══════════════════════════════════════════

-- Sun Peaks Village
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description, population_permanent, population_seasonal, website, staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options, public_transport_to_resort, parking_availability, distance_to_airport, road_conditions, weekly_cost_estimate, supermarkets, eating_out, local_employers, extra_job_opportunities, bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals, medical_facilities, emergency_services, vibe_atmosphere, international_workforce, social_life, avg_winter_temp, snowfall_in_town, summer_appeal, best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES ('Sun Peaks Village', 'sun-peaks-village', 'Canada', 'British Columbia', 50.8837, -119.9003, 'A European-style ski village at the base of Sun Peaks Resort. The village IS the resort — everything is walkable, and most workers live in on-mountain staff housing or nearby condos.', 600, 3000, 'https://www.sunpeaksresort.com', true, 'CAD $200–$350/week shared', 'Moderate — employer housing helps significantly.', 'Staff housing, shared condos, hostel in Kamloops.', 'Village is ski-in/ski-out. Kamloops (45min drive) for larger services.', 'Free village parking. Car useful for Kamloops runs.', 'Kamloops Airport ~50km (45min).', 'Tod Mountain Road is well-maintained but winding. Winter tyres required.', 'CAD $300–$450/week', 'Small village store. Kamloops for full grocery shopping.', 'CAD $12–$25.', 'Sun Peaks Resort, Grand Hotel, village restaurants and shops.', 'Kamloops has additional hospitality and retail opportunities.', 'Morrisey''s Pub, Bottoms Bar. Relaxed village après — less hectic than Whistler.', 'Voyageur Bistro, Mountain High Pizza Pie, Tod Mountain Café.', 'Sun Peaks fitness facilities.', 'Small village basics — ski hire, gift shops.', 'Sun Peaks Canadian Cheese Rolling Festival (summer), snow events.', 'Sun Peaks Health Centre. Kamloops Royal Inland Hospital (45min).', 'RCMP, fire, ambulance available.', 'Friendly small-village community. Everyone knows everyone by mid-season. Quieter and more intimate than larger resorts.', 'Growing international presence — Australian, British, Japanese. More Canadian-dominated than Whistler.', 'Pub nights, staff parties, powder day celebrations, Kamloops trips.', '-12°C to -3°C', 'Good snowfall at village elevation (1,200m).', 'Golf, mountain biking, hiking. Sun Peaks is a four-season resort.', 'Late October to November for December start.', 'Sun Peaks Seasonal Workers Facebook group.', 'Kamloops day trips are essential for big shops. The village atmosphere is special — enjoy the intimacy.', 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1600&q=80');
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='57' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='sun-peaks-village' LIMIT 1), 0, true);

-- Kelowna (Big White)
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description, population_permanent, population_seasonal, website, staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options, public_transport_to_resort, parking_availability, distance_to_airport, road_conditions, weekly_cost_estimate, supermarkets, eating_out, local_employers, extra_job_opportunities, bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals, medical_facilities, emergency_services, vibe_atmosphere, international_workforce, social_life, avg_winter_temp, snowfall_in_town, summer_appeal, best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES ('Kelowna', 'kelowna', 'Canada', 'British Columbia', 49.8880, -119.4960, 'The Okanagan''s largest city and the base for Big White. Kelowna offers lake life, wineries, and full city amenities. Many Big White workers live here and commute up the mountain (56km).', 145000, 160000, 'https://www.tourismkelowna.com', true, 'CAD $250–$400/week shared', 'Moderate — a real city with more housing options.', 'Shared houses, Airbnb, hostels, basement suites.', 'Big White shuttle service. 56km drive (50min).', 'City parking. Free at Big White village.', 'Kelowna International Airport (YLW) — in the city.', 'Highway 33 to Big White is well-maintained but mountain road — winter tyres essential.', 'CAD $350–$500/week', 'Save-On-Foods, Superstore, Costco. Full city selection.', 'CAD $12–$25. Good restaurant scene for the Okanagan.', 'Big White, Kelowna hotels, restaurants, wineries, retail.', 'Massive — Kelowna has a full city economy. Wineries, hospitality, healthcare, tech.', 'Downtown Kelowna bars and pubs. Good nightlife for a mid-size city.', 'RauDZ Regional Table, Waterfront Wines, Cactus Club, breweries.', 'Multiple gyms, rec centres, yoga studios.', 'Full city services — everything you need.', 'Kelowna Craft Beer Week, Sun Peaks wine festivals, Okanagan events.', 'Kelowna General Hospital. Walk-in clinics.', 'Full RCMP, fire, ambulance.', 'City living with mountain access. Okanagan lifestyle — lakes, wine, sunshine. Best of both worlds.', 'Large Australian community at Big White. International workers in Kelowna too.', 'City nightlife, lake activities, winery tours, downtown bars.', '-5°C to 2°C (milder than mountain)', 'Light snow in the city. Big White gets 750cm+ annually.', 'Okanagan summers are legendary — lake beaches, vineyards, cycling, festivals.', 'October to November.', 'Big White Workers Facebook group, Kelowna Newcomers.', 'Living in Kelowna means city amenities but you need reliable transport to Big White. The Okanagan summer is worth staying for.', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80');
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='58' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='kelowna' LIMIT 1), 56, true);

-- Vernon (Silver Star)
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description, population_permanent, population_seasonal, website, staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options, public_transport_to_resort, parking_availability, distance_to_airport, road_conditions, weekly_cost_estimate, supermarkets, eating_out, local_employers, extra_job_opportunities, bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals, medical_facilities, emergency_services, vibe_atmosphere, international_workforce, social_life, avg_winter_temp, snowfall_in_town, summer_appeal, best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES ('Vernon', 'vernon', 'Canada', 'British Columbia', 50.2670, -119.2720, 'A friendly North Okanagan city at the base of Silver Star. Vernon offers lakeside living, orchards, and small-city charm. Most Silver Star workers who don''t live on-mountain base themselves here.', 42000, 46000, 'https://www.tourismvernon.com', true, 'CAD $200–$350/week shared', 'Low to moderate — affordable for BC.', 'Shared houses, basement suites, Airbnb.', 'Silver Star shuttle (limited). 22km drive (25min).', 'City parking. Free at Silver Star.', 'Kelowna Airport ~60km (45min).', 'Silver Star Road well-maintained. Winter tyres required.', 'CAD $300–$400/week', 'Save-On-Foods, Superstore, Real Canadian Wholesale.', 'CAD $10–$20.', 'Silver Star, Vernon hotels, restaurants, orchards.', 'Agricultural work, hospitality, retail.', 'Vernon has a few pubs — Range Lounge, Marten Brew Pub.', 'Intermezzo, The Italian Kitchen, Ratio Coffee.', 'Vernon Recreation Complex (pool, gym, arena).', 'Full small-city services.', 'Vernon Winter Carnival (historic), Frostbite Music Festival.', 'Vernon Jubilee Hospital. Walk-in clinics.', 'Full services.', 'Relaxed small-city vibes. Friendly locals. More affordable than Kelowna.', 'Smaller international presence. Growing WHV workers at Silver Star.', 'Pub nights, lake activities, Vernon Winter Carnival.', '-8°C to 0°C', 'Moderate snowfall in the city.', 'Three lakes, orchards, cycling. Beautiful Okanagan summers.', 'October to November.', 'Silver Star Workers group.', 'Vernon is genuinely affordable by BC standards. The Epic Pass from Silver Star (Vail Resorts) is incredible value.', 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1600&q=80');
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='59' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='vernon' LIMIT 1), 22, true);

-- Lake Louise Village
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description, population_permanent, population_seasonal, website, staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options, public_transport_to_resort, parking_availability, distance_to_airport, road_conditions, weekly_cost_estimate, supermarkets, eating_out, local_employers, extra_job_opportunities, bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals, medical_facilities, emergency_services, vibe_atmosphere, international_workforce, social_life, avg_winter_temp, snowfall_in_town, summer_appeal, best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES ('Lake Louise Village', 'lake-louise-village', 'Canada', 'Alberta', 51.4253, -116.1773, 'A tiny hamlet in Banff National Park — little more than the Fairmont Chateau, a few hotels, and a gas station. Most workers live in staff housing here or commute from Banff (45min). The scenery is jaw-dropping.', 700, 2000, 'https://www.banfflakelouise.com', true, 'CAD $200–$350/week (staff housing)', 'Very high — staff housing essential. Almost no private rentals.', 'Employer staff housing (Fairmont, resort). Banff for alternatives.', 'Free Roam bus to Banff. Resort shuttle to ski area.', 'Limited village parking. Resort has free parking.', 'Calgary International Airport ~185km (2hr).', 'Trans-Canada Highway. Well-maintained. Can be icy.', 'CAD $300–$450/week (with staff housing)', 'Lake Louise Village Market (small). Banff for full shopping.', 'CAD $15–$30. Limited but quality options.', 'Lake Louise Ski Resort, Fairmont Chateau, Lake Louise Inn, Parks Canada.', 'Banff (45min) has extensive hospitality industry.', 'Lake Louise Lodge bar. Banff for real nightlife.', 'Lake Louise Station Restaurant, Chateau dining, Lake Louise Village Grill.', 'Fairmont gym (staff access). Banff rec centre.', 'Tiny — gas station, small general store.', 'Lake Louise Winterstart festival, SkiBig3 events.', 'Lake Louise Medical Clinic. Banff Mineral Springs Hospital (45min).', 'RCMP, Parks Canada wardens.', 'Stunningly beautiful but isolated. Workers form tight bonds. Like living inside a postcard.', 'Very international — Fairmont employs workers from 40+ countries. WHV workers from Australia, UK, Japan, Europe.', 'Staff housing community, Banff weekend trips, skating on the lake, wildlife encounters.', '-18°C to -5°C. Cold!', 'Regular snowfall.', 'Lake Louise itself is a world-famous summer destination — canoeing, hiking, glacier walks.', 'September for November start.', 'Lake Louise Seasonal Workers group.', 'Staff housing is your lifeline — there''s nowhere else to live. The Roam bus to Banff is free and essential for social life.', 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1600&q=80');
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='60' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='lake-louise-village' LIMIT 1), 0, true);
-- Also link Lake Louise to Banff
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='60' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='banff' LIMIT 1), 57, false) ON CONFLICT DO NOTHING;

-- Link Sunshine Village to Banff
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='61' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='banff' LIMIT 1), 8, true) ON CONFLICT DO NOTHING;

-- Canmore (Nakiska)
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description, population_permanent, population_seasonal, website, staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options, public_transport_to_resort, parking_availability, distance_to_airport, road_conditions, weekly_cost_estimate, supermarkets, eating_out, local_employers, extra_job_opportunities, bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals, medical_facilities, emergency_services, vibe_atmosphere, international_workforce, social_life, avg_winter_temp, snowfall_in_town, summer_appeal, best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES ('Canmore', 'canmore', 'Canada', 'Alberta', 51.0884, -115.3479, 'A vibrant mountain town just outside Banff National Park, 20 minutes from the park gates. Canmore is more affordable than Banff with a strong local community, excellent dining, and world-class outdoor recreation. Popular with workers at Nakiska, Sunshine, and Lake Louise.', 14000, 18000, 'https://www.canmore.ca', true, 'CAD $250–$400/week shared', 'High — Canmore has a housing crunch but more options than Banff.', 'Shared houses, basement suites, Airbnb.', 'Car recommended. Nakiska (25km), Banff (25km), Sunshine (30km).', 'Town parking. Free at Nakiska.', 'Calgary International Airport ~110km (1hr).', 'Trans-Canada Highway. Well-maintained.', 'CAD $350–$500/week', 'Save-On-Foods, Safeway.', 'CAD $12–$28. Excellent restaurant scene.', 'Nakiska, Canmore hotels, restaurants, outdoor companies.', 'Strong local economy — outdoor recreation, tourism, arts, remote workers.', 'The Drake, Grizzly Paw Brewing, Rose & Crown. Good pub scene.', 'Crazyweed Kitchen, The Iron Goat, Rocky Mountain Flatbread, Grizzly Paw.', 'Elevation Place (world-class rec centre with climbing wall, pool, gym).', 'Full town amenities. Good outdoor gear shops.', 'Canmore Folk Festival, Ice Climbing Festival, mountain events.', 'Canmore General Hospital. Calgary hospitals accessible.', 'Full RCMP, fire, ambulance.', 'Real mountain town with genuine community. More local and grounded than Banff. Artists, athletes, outdoor enthusiasts.', 'International but less transient than Banff. Some seasonal workers, many long-term residents.', 'Brewery scene, climbing, trail running, Nordic skiing. Active outdoor community.', '-14°C to -3°C', 'Regular snowfall.', 'Incredible — hiking, climbing, mountain biking, paddling. Year-round outdoor paradise.', 'September to October.', 'Canmore Community groups.', 'Canmore is the savvy alternative to Banff — real town, better restaurants, cheaper rent, still minutes from the parks. Elevation Place is world-class.', 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1600&q=80');
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='62' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='canmore' LIMIT 1), 25, true);

-- Jasper
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description, population_permanent, population_seasonal, website, staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options, public_transport_to_resort, parking_availability, distance_to_airport, road_conditions, weekly_cost_estimate, supermarkets, eating_out, local_employers, extra_job_opportunities, bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals, medical_facilities, emergency_services, vibe_atmosphere, international_workforce, social_life, avg_winter_temp, snowfall_in_town, summer_appeal, best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES ('Jasper', 'jasper', 'Canada', 'Alberta', 52.8737, -118.0814, 'A charming national park town surrounded by the Canadian Rockies, and the base for Marmot Basin. Smaller and more laid-back than Banff, Jasper offers a genuine mountain community, dark sky preserve status, and incredible wildlife. Recovering beautifully after the 2024 wildfires.', 4600, 8000, 'https://www.jasper.travel', true, 'CAD $250–$400/week shared', 'High — small town with limited rental stock. Employer housing helps.', 'Staff housing (Fairmont, Marmot Basin), shared rentals, hostels.', 'Marmot Basin shuttle (20min). Town is walkable.', 'Free town parking. Marmot Basin has free parking.', 'Edmonton International Airport ~370km (4hr). Hinton Airport (small) ~80km.', 'Yellowhead Highway. Well-maintained but remote. Can be icy.', 'CAD $300–$450/week', 'Robinson''s IGA, small shops.', 'CAD $12–$25. Good for the size.', 'Marmot Basin, Fairmont Jasper Park Lodge, Jasper hotels and restaurants, Parks Canada.', 'Parks Canada, outdoor guiding, summer tourism.', 'Downstream Restaurant & Lounge, D''ed Dog Bar, Pete''s On Patricia. Intimate pub scene.', 'Evil Dave''s Grill, Fiddle River, Raven Bistro, Bear''s Paw Bakery.', 'Jasper Fitness & Aquatic Centre.', 'Small town essentials — grocery, gas, gear shops, pharmacy.', 'Jasper in January festival, Dark Sky Festival, Jasper Pride.', 'Jasper Healthcare Centre. Hinton Hospital (80km). Edmonton for major care.', 'RCMP, fire, ambulance, Parks Canada wardens.', 'Intimate mountain town with deep national park culture. More genuine and less touristy than Banff. Wildlife in your backyard.', 'Growing international community. Fairmont brings workers from around the world. WHV workers from Australia, UK, Japan.', 'Pub culture, wildlife watching, stargazing (Dark Sky Preserve), hot springs at Miette.', '-18°C to -6°C. Cold but dry.', 'Moderate snowfall in town.', 'Spectacular — Maligne Lake, hiking, rafting, cycling. Jasper''s summer rivals Banff.', 'September for November start.', 'Jasper Seasonal Workers group.', 'The Dark Sky Preserve means the stargazing is unreal. Miette Hot Springs are a must. Jasper is smaller and friendlier than Banff — embrace it.', 'https://images.unsplash.com/photo-1610394295702-00b39272459d?w=1600&q=80');
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='63' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='jasper' LIMIT 1), 7, true);

-- Mont-Tremblant Village
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description, population_permanent, population_seasonal, website, staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options, public_transport_to_resort, parking_availability, distance_to_airport, road_conditions, weekly_cost_estimate, supermarkets, eating_out, local_employers, extra_job_opportunities, bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals, medical_facilities, emergency_services, vibe_atmosphere, international_workforce, social_life, avg_winter_temp, snowfall_in_town, summer_appeal, best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES ('Mont-Tremblant Village', 'mont-tremblant-village', 'Canada', 'Quebec', 46.2096, -74.5854, 'A colourful pedestrian village at the base of Mont-Tremblant, modelled after Quebec City. The village IS the resort — shops, restaurants, and nightlife are all walkable from the slopes. The most vibrant resort village in Eastern Canada.', 10000, 20000, 'https://www.tremblant.ca', true, 'CAD $250–$400/week shared', 'High — popular resort village. Start searching early.', 'Staff housing, shared condos, Saint-Jovite (nearby town) rentals.', 'Free resort shuttle. Village is ski-in/ski-out.', 'Village parking (paid). Free at some outlying lots.', 'Montreal-Trudeau Airport ~140km (1.5hr).', 'Autoroute 15 to Route 117. Well-maintained.', 'CAD $350–$500/week', 'IGA in Saint-Jovite (5min). Village convenience stores.', 'CAD $12–$30. Excellent dining scene.', 'Tremblant resort, Fairmont, Casino, village restaurants and shops.', 'Montreal weekend trips. Saint-Jovite hospitality.', 'Le P''tit Caribou (legendary nightclub), Microbrasserie La Diable, Café d''Époque. Vibrant nightlife.', 'La Forge, Coco Pazzo, La Diable, Patrick Bermand, Crêperie Catherine.', 'Aquaclub La Source (pool, gym, spa). Resort fitness.', 'Full village — shops, banks, ski hire, boutiques.', 'Tremblant Blues Festival, Ironman, Festi Jazz, Wanderlust yoga festival.', 'CLSC des Laurentides. Saint-Jérôme hospital (60km).', 'Full services.', 'Quebec charm meets resort energy. French-Canadian culture with international flair. The nightlife at Le P''tit Caribou is legendary.', 'Bilingual (French/English). European, Latin American, and Asian workers. French is important for guest-facing roles.', 'Le P''tit Caribou nights, village strolls, Montreal weekend trips, casino visits.', '-18°C to -7°C', 'Good snowfall.', 'Incredible four-season resort — hiking, golf, mountain biking, festivals.', 'October for November start.', 'Tremblant Seasonal Workers Facebook group.', 'Learn French — even basic phrases go far. Le P''tit Caribou is one of Canada''s best après bars. Montreal is close enough for weekend adventures.', 'https://images.unsplash.com/photo-1548873903-5fc219569c50?w=1600&q=80');
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='64' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='mont-tremblant-village' LIMIT 1), 0, true);

-- Baie-Saint-Paul (Le Massif)
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description, population_permanent, population_seasonal, website, staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options, public_transport_to_resort, parking_availability, distance_to_airport, road_conditions, weekly_cost_estimate, supermarkets, eating_out, local_employers, extra_job_opportunities, bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals, medical_facilities, emergency_services, vibe_atmosphere, international_workforce, social_life, avg_winter_temp, snowfall_in_town, summer_appeal, best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES ('Baie-Saint-Paul', 'baie-saint-paul', 'Canada', 'Quebec', 47.4407, -70.4989, 'A picturesque art town in the Charlevoix region, perched where the Gouffre River meets the St. Lawrence. Baie-Saint-Paul is the cultural heart of Charlevoix — galleries, artisan shops, and French-Canadian charm. Base town for Le Massif.', 7300, 9000, 'https://www.tourisme-charlevoix.com', true, 'CAD $180–$300/week shared', 'Low to moderate — affordable small town.', 'Shared apartments, B&Bs, gîtes.', 'Le Massif shuttle. 10km drive.', 'Town and resort parking available.', 'Quebec City Jean Lesage Airport ~95km (1hr).', 'Route 138 along the St. Lawrence. Scenic but can be icy.', 'CAD $280–$380/week', 'Metro, small local shops.', 'CAD $10–$22. Charming bistros and bakeries.', 'Le Massif, Hôtel & Spa Le Germain, local restaurants and galleries.', 'Art scene, summer tourism, hospitality.', 'Le Saint-Pub, local bars. Quiet but charming.', 'Le Mouton Noir, Café des Artistes, local boulangeries.', 'Small community facilities.', 'Art galleries, artisan shops, basics.', 'Rêves d''Automne (autumn festival), Charlevoix arts events.', 'CLSC Charlevoix. Quebec City hospitals (95km).', 'Police, fire, ambulance.', 'Artistic, French-Canadian, deeply cultural. UNESCO Biosphere Reserve setting. One of Quebec''s most beautiful small towns.', 'Predominantly French-Canadian. Very few international workers. Deep immersion in Québécois culture.', 'Art gallery visits, bistro dining, St. Lawrence river views, quiet evenings.', '-18°C to -8°C', 'Good snowfall.', 'Stunning fall foliage, whale watching, cycling Route Verte.', 'November for December start.', 'Charlevoix community groups.', 'French is essentially mandatory in Charlevoix. The artistic atmosphere is unique in Canadian ski towns. The St. Lawrence views from Le Massif are world-class.', 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?w=1600&q=80');
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='65' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='baie-saint-paul' LIMIT 1), 10, true);

-- Beaupré (Mont-Sainte-Anne)
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description, population_permanent, population_seasonal, website, staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options, public_transport_to_resort, parking_availability, distance_to_airport, road_conditions, weekly_cost_estimate, supermarkets, eating_out, local_employers, extra_job_opportunities, bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals, medical_facilities, emergency_services, vibe_atmosphere, international_workforce, social_life, avg_winter_temp, snowfall_in_town, summer_appeal, best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES ('Beaupré', 'beaupre', 'Canada', 'Quebec', 47.0444, -70.8956, 'A small town at the base of Mont-Sainte-Anne, just 30 minutes from Quebec City. Beaupré gives you resort proximity with the ability to enjoy one of North America''s most historic cities on your days off.', 3500, 5000, 'https://www.mont-sainte-anne.com', true, 'CAD $180–$280/week shared', 'Low — affordable small town.', 'Shared apartments, chalets, Quebec City rentals.', 'Mont-Sainte-Anne shuttle. Quebec City 30min by car.', 'Free parking at resort and town.', 'Quebec City Jean Lesage Airport ~50km (35min).', 'Route 138. Well-maintained.', 'CAD $280–$380/week', 'Small local shops. Quebec City for full shopping.', 'CAD $10–$18.', 'Mont-Sainte-Anne, Château Mont-Sainte-Anne, local hospitality.', 'Quebec City has enormous hospitality and tourism economy.', 'Resort base après. Quebec City (30min) for incredible nightlife.', 'Local restaurants, casse-croûtes (snack bars).', 'Limited locally. Quebec City for fitness.', 'Small town basics.', 'Quebec Winter Carnival (in the city), night skiing events.', 'Beaupré clinic. Quebec City hospitals (30min).', 'Full services available.', 'Small resort-adjacent town with Quebec City as your playground. Best of both worlds — mountain life and historic city.', 'Mostly French-Canadian. Quebec City brings international diversity.', 'Quebec City nightlife, Old Quebec exploration, Winter Carnival, resort staff community.', '-18°C to -8°C', 'Good snowfall.', 'Quebec City summer festivals, cycling, Montmorency Falls.', 'October to November.', 'MSA seasonal worker groups.', 'Live in Beaupré for convenience or Quebec City for lifestyle — both work. The Quebec Winter Carnival is one of the world''s greatest winter festivals.', 'https://images.unsplash.com/photo-1606666334434-4c24739144a5?w=1600&q=80');
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='66' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='beaupre' LIMIT 1), 5, true);

-- Quebec City (Stoneham)
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description, population_permanent, population_seasonal, website, staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options, public_transport_to_resort, parking_availability, distance_to_airport, road_conditions, weekly_cost_estimate, supermarkets, eating_out, local_employers, extra_job_opportunities, bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals, medical_facilities, emergency_services, vibe_atmosphere, international_workforce, social_life, avg_winter_temp, snowfall_in_town, summer_appeal, best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES ('Quebec City', 'quebec-city', 'Canada', 'Quebec', 46.8139, -71.2080, 'The only walled city in North America, UNESCO World Heritage listed. Quebec City is the base for both Stoneham and Mont-Sainte-Anne — a world-class historic city with incredible culture, cuisine, and winter festivals, all within 30 minutes of skiing.', 550000, 560000, 'https://www.quebec-cite.com', false, 'CAD $200–$350/week shared in the city', 'Low — large city housing market.', 'Apartments, shared houses, student housing.', 'Car to Stoneham (20min). RTC city bus system.', 'City parking. Free at Stoneham.', 'Quebec City Jean Lesage Airport — in the city.', 'Autoroute Laurentienne to Stoneham. Well-maintained.', 'CAD $300–$450/week', 'IGA, Metro, Maxi, Costco. Full city selection.', 'CAD $10–$25. World-class food scene — poutine capital of the world.', 'Stoneham, Mont-Sainte-Anne, Quebec City hospitality, tourism.', 'Enormous — full city economy. Tourism, government, universities, tech.', 'Grande Allée, Saint-Roch district, Rue Saint-Jean. Legendary nightlife for a city this size.', 'Chez Ashton (poutine), Le Chic Shack, Légende, Restaurant Initiale (Michelin-quality). Incredible food.', 'Multiple gyms, PEPS (Laval University sports centre), pools.', 'Full city services — everything imaginable.', 'Quebec Winter Carnival (one of the world''s biggest), Festival d''Été (summer music), New France Festival.', 'CHU de Québec (major hospital network). Laval University medical centre.', 'Full city services.', 'Living in a UNESCO city while skiing 20 minutes away. French-Canadian culture at its finest. Historic, culinary, cultural paradise.', 'Mostly French-Canadian. International students at Laval University. Some WHV workers.', 'City nightlife, Winter Carnival, Old Quebec exploration, poutine tours, cultural events.', '-16°C to -6°C', 'Heavy snowfall — one of Canada''s snowiest cities.', 'Festival d''Été (biggest music festival in Canada), Plaines d''Abraham, cycling, river activities.', 'October to November.', 'Quebec City expat and community groups.', 'Quebec City + skiing is an unbeatable combination. The Winter Carnival in February is a must. French fluency makes everything easier and richer.', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80');
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='67' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='quebec-city' LIMIT 1), 20, true);

-- Collingwood (Blue Mountain)
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description, population_permanent, population_seasonal, website, staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options, public_transport_to_resort, parking_availability, distance_to_airport, road_conditions, weekly_cost_estimate, supermarkets, eating_out, local_employers, extra_job_opportunities, bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals, medical_facilities, emergency_services, vibe_atmosphere, international_workforce, social_life, avg_winter_temp, snowfall_in_town, summer_appeal, best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES ('Collingwood', 'collingwood', 'Canada', 'Ontario', 44.5012, -80.2169, 'A charming Georgian Bay town that has transformed from a shipbuilding centre into Ontario''s outdoor recreation capital. Collingwood is the base for Blue Mountain Resort and has excellent dining, shopping, and waterfront lifestyle.', 24000, 30000, 'https://www.collingwood.ca', true, 'CAD $250–$400/week shared', 'Moderate — more options than pure resort towns.', 'Shared houses, apartments, Airbnb.', 'Blue Mountain shuttle. 10min drive.', 'Town and resort parking available.', 'Toronto Pearson Airport ~180km (2hr). Collingwood Airport (small).', 'Highway 26. Well-maintained. Lake-effect snow possible.', 'CAD $300–$450/week', 'Sobeys, Metro, Giant Tiger. Good selection.', 'CAD $12–$25. Excellent restaurant scene.', 'Blue Mountain Resort (Alterra), Scandinave Spa, hotels, restaurants.', 'Strong local economy — tourism, retail, healthcare, real estate.', 'Collingwood Downtown bars, The Eddie, Northwinds Brewery. Good scene.', 'Tesoro, The Huron Club, Azzurra Trattoria, Northwinds Brewery.', 'Collingwood YMCA, private gyms.', 'Full town amenities — downtown shopping, services, banks.', 'Elvis Festival (huge!), Winter Festival, Collingwood Music Festival.', 'Collingwood General & Marine Hospital. Barrie hospital (50min).', 'Full services.', 'Ontario''s outdoor playground. Friendly, growing town with genuine character. Georgian Bay waterfront is beautiful.', 'Growing international community from Blue Mountain. WHV workers from Australia, UK, Ireland. Toronto proximity brings diversity.', 'Downtown bars, Blue Mountain Village nightlife, Georgian Bay activities, Toronto weekend trips.', '-10°C to -2°C', 'Significant lake-effect snowfall from Georgian Bay.', 'Georgian Bay beaches, sailing, cycling, hiking, festivals. Beautiful summers.', 'October for November start.', 'Blue Mountain Workers group, Collingwood Community.', 'Collingwood gives you a real Ontario town experience. The Elvis Festival in July is genuinely massive. Georgian Bay summer is stunning.', 'https://images.unsplash.com/photo-1565992441121-4367c2967103?w=1600&q=80');
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='68' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='collingwood' LIMIT 1), 10, true);

-- Russell (Asessippi)
INSERT INTO nearby_towns (name, slug, country, state_region, latitude, longitude, description, population_permanent, population_seasonal, website, staff_housing_available, avg_rent_weekly, housing_demand, temporary_stay_options, public_transport_to_resort, parking_availability, distance_to_airport, road_conditions, weekly_cost_estimate, supermarkets, eating_out, local_employers, extra_job_opportunities, bars_nightlife, restaurants_cafes, gyms_fitness, shops_services, events_festivals, medical_facilities, emergency_services, vibe_atmosphere, international_workforce, social_life, avg_winter_temp, snowfall_in_town, summer_appeal, best_time_to_arrive, community_groups, insider_tips, hero_image_url)
VALUES ('Russell', 'russell', 'Canada', 'Manitoba', 50.7731, -101.2869, 'A small agricultural town on the Manitoba prairies, serving as the nearest service centre to Asessippi Ski Area. Russell is quintessential small-town Canada — friendly, affordable, and remote.', 1600, 1700, 'https://www.russellmb.com', false, 'CAD $120–$200/week', 'Very low — affordable prairie living.', 'Limited — some rental houses, Asessippi on-site lodge.', 'Car essential. No public transit.', 'Free parking everywhere.', 'Brandon Airport ~150km (1.5hr). Winnipeg Airport ~400km (4hr).', 'Manitoba highways well-maintained but flat and exposed to wind/snow.', 'CAD $200–$300/week', 'Co-op, small grocery stores.', 'CAD $8–$15. Limited but affordable.', 'Asessippi Ski Area, local farms, Russell businesses.', 'Agricultural work, small-town services.', 'Russell Hotel bar. Very quiet.', 'Small-town diners and cafés.', 'Russell Recreation Complex.', 'Basic services — gas, pharmacy, hardware.', 'Beef & Barley Festival, local rodeos.', 'Russell Health Centre. Brandon Regional (150km).', 'RCMP, fire, ambulance.', 'True rural Canada. Extremely friendly locals. Very quiet and remote. Ideal for those seeking solitude and affordability.', 'Almost entirely Canadian. Very small international presence.', 'Community events, outdoor activities, small-town socialising.', '-25°C to -12°C. Seriously cold.', 'Moderate prairie snowfall.', 'Lake of the Prairies nearby. Farming culture. Quiet summers.', 'November for December start.', 'Russell community.', 'This is remote prairie Canada — be prepared for serious cold and limited services. But the people are incredibly welcoming and the cost of living is negligible.', 'https://images.unsplash.com/photo-1582641637614-3f446aa083fa?w=1600&q=80');
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary) VALUES ((SELECT id FROM resorts WHERE legacy_id='69' LIMIT 1), (SELECT id FROM nearby_towns WHERE slug='russell' LIMIT 1), 20, true);

-- ============================================================
-- Migration 00012: Seed Regions & Resorts
-- ============================================================
-- Inserts all platform regions and resorts into Supabase.
-- Adds legacy_id column for backward compatibility with URL routes.

-- Add legacy_id column for mapping old string IDs to UUIDs
ALTER TABLE public.resorts ADD COLUMN IF NOT EXISTS legacy_id text;
CREATE INDEX IF NOT EXISTS idx_resorts_legacy_id ON public.resorts(legacy_id);

-- Also add legacy_id to regions
ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS legacy_id text;

-- ── Seed Regions ────────────────────────────────────────────
INSERT INTO public.regions (name, country, description, legacy_id)
  VALUES ('The Alps', 'Europe', 'Home to world-renowned resorts across France, Switzerland, Austria, and Italy.', '1')
  ON CONFLICT DO NOTHING;

INSERT INTO public.regions (name, country, description, legacy_id)
  VALUES ('Rocky Mountains', 'North America', 'Stretching from Canada to New Mexico, featuring legendary resorts like Whistler, Vail, and Aspen.', '2')
  ON CONFLICT DO NOTHING;

INSERT INTO public.regions (name, country, description, legacy_id)
  VALUES ('Japanese Alps', 'Japan', 'Famous for deep powder snow and unique cultural experiences in Hokkaido and Honshu.', '3')
  ON CONFLICT DO NOTHING;

INSERT INTO public.regions (name, country, description, legacy_id)
  VALUES ('Scandinavian Mountains', 'Europe', 'Norway and Sweden offer stunning fjord-side skiing and the magic of the Northern Lights.', '4')
  ON CONFLICT DO NOTHING;

INSERT INTO public.regions (name, country, description, legacy_id)
  VALUES ('Andes', 'South America', 'Chile and Argentina provide Southern Hemisphere ski seasons from June to October.', '5')
  ON CONFLICT DO NOTHING;

INSERT INTO public.regions (name, country, description, legacy_id)
  VALUES ('Southern Alps', 'New Zealand', 'Breathtaking scenery and uncrowded slopes in the heart of New Zealand''s South Island.', '6')
  ON CONFLICT DO NOTHING;

INSERT INTO public.regions (name, country, description, legacy_id)
  VALUES ('Caucasus Mountains', 'Georgia / Russia', 'Emerging ski destinations with affordable resorts and dramatic mountain terrain.', '7')
  ON CONFLICT DO NOTHING;

INSERT INTO public.regions (name, country, description, legacy_id)
  VALUES ('Pyrenees', 'Europe', 'The border range between France and Spain, offering diverse skiing in a warm climate.', '8')
  ON CONFLICT DO NOTHING;

INSERT INTO public.regions (name, country, description, legacy_id)
  VALUES ('Snowy Mountains', 'Australia', 'Australia''s alpine region in New South Wales and Victoria, offering a unique Southern Hemisphere ski season.', '9')
  ON CONFLICT DO NOTHING;

INSERT INTO public.regions (name, country, description, legacy_id)
  VALUES ('Eastern US Mountains', 'USA', 'The Green Mountains, White Mountains, and Appalachian ranges of the northeastern United States.', '10')
  ON CONFLICT DO NOTHING;

-- ── Seed Resorts ────────────────────────────────────────────
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
  '1', 'Whistler Blackcomb',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'North America''s largest ski resort, offering over 8,000 acres of terrain across two mountains. Located in British Columbia''s Coast Mountains, Whistler Blackcomb is renowned for its massive vertical drop, diverse terrain, and vibrant village atmosphere. Co-hosted the 2010 Winter Olympics alpine events.', 50.1163, -122.9574,
  'British Columbia', 'Whistler Village', 'https://www.whistlerblackcomb.com', 'https://images.unsplash.com/photo-1731445289819-ed2efbdb9d83?w=1200&q=80',
  3307, 200, 36, 55, 76, 33,
  1609, 653, 2284, 37, '{"gondolas":3,"chairlifts":16,"surface_lifts":18}'::jsonb,
  1189, '2025-11-22', '2026-05-25',
  ARRAY['Vail Resorts (resort operations)', 'Fairmont Chateau Whistler', 'Four Seasons Resort', 'Whistler Village restaurants & bars', 'Whistler Ski School']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Retail Sales Associate', 'Guest Services', 'Snowmaker', 'Grooming Operator']::text[], '3,000–5,000', ARRAY['English']::text[],
  'International workers typically require a Working Holiday Visa (IEC) for Canada. Australian, UK, French, Irish, and many other nationalities are eligible. Some employers offer LMIA-backed work permits for specialized roles.', 'Major employers begin hiring in July–August. Positions fill through September–October. Late applicants may still find roles in November.',
  true, 2000, 'CAD $750–$1,200/month shared',
  'CAD $350–$500 (housing, food, transport)', 'Free village shuttles. Regional bus to Squamish & Vancouver (2 hrs). Whistler Transit covers surrounding areas.', ARRAY['Free or discounted season pass', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', 'Gym access at some properties']::text[],
  'Legendary après-ski culture. Popular spots include GLC, Merlin''s, Longhorn Saloon, and Garfinkel''s. Lively nightlife with clubs and live music throughout the village.', ARRAY['Snowshoeing', 'Cross-country skiing', 'Ice skating', 'Bungee jumping', 'Ziplining', 'Snowmobiling', 'Hot springs (nearby Scandinave Spa)']::text[], 'Whistler Health Care Centre with 24/7 emergency. Squamish General Hospital 45 min south. Pharmacies in the village.', 'Full-service village with grocery stores (IGA, Nesters), banks, gear shops, liquor stores, and equipment rental.',
  'Very large — thousands of international workers each season, primarily from Australia, UK, Japan, and Europe. Extremely multicultural.',
  -8, 0, 'high', 10
) ON CONFLICT DO NOTHING;

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
  '11', 'Banff / Lake Louise',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'Set within Banff National Park, this trio of resorts — Mt. Norquay, Sunshine Village, and Lake Louise — offers stunning Canadian Rockies scenery, reliable snow, and a charming mountain town.', 51.4254, -116.1773,
  'Alberta', 'Banff', 'https://www.skilouise.com', 'https://images.unsplash.com/photo-1610906592995-1852b86452b9?w=1200&q=80',
  1700, 164, 25, 45, 58, 36,
  991, 1646, 2637, 26, '{"gondolas":1,"chairlifts":17,"surface_lifts":8}'::jsonb,
  914, '2025-11-08', '2026-05-18',
  ARRAY['Banff Sunshine Village (resort operations)', 'Lake Louise Ski Resort (resort operations)', 'Mt. Norquay (resort operations)', 'Fairmont Banff Springs Hotel', 'Fairmont Chateau Lake Louise', 'Banff Hospitality Collective (restaurants & bars)', 'Pursuit (Banff Gondola, attractions)']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Retail Sales Associate', 'Guest Services', 'Snowmaker', 'Hotel Front Desk']::text[], '2,500–4,000', ARRAY['English']::text[],
  'International workers typically require a Working Holiday Visa (IEC) for Canada. Australian, UK, French, Irish, and many other nationalities are eligible. Some employers offer LMIA-backed work permits for specialized roles.', 'Major employers begin hiring in July–August. Positions fill through September–October. Late applicants may still find roles in November. Sunshine Village and Lake Louise both run dedicated seasonal hiring campaigns.',
  true, 1500, 'CAD $600–$1,000/month shared',
  'CAD $300–$450 (housing, food, transport)', 'Roam Transit runs free and paid routes throughout Banff and to Lake Louise. Sunshine Village shuttle from Banff. Greyhound/Rider Express to Calgary (1.5 hrs).', ARRAY['Free or discounted season pass (Ikon Pass for some employers)', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', 'Access to Banff Upper Hot Springs']::text[],
  'Lively après-ski culture in the town of Banff. Popular spots include the Elk & Oarsman, Wild Bill''s Legendary Saloon, High Rollers, Magpie & Stump, and Tommy''s Neighbourhood Pub. Lake Louise has the Lodge of the Ten Peaks base lodge.', ARRAY['Snowshoeing', 'Cross-country skiing', 'Ice skating on Lake Louise', 'Ice walks at Johnston Canyon', 'Hot springs (Banff Upper Hot Springs)', 'Snowmobiling', 'Dog sledding', 'Fat biking']::text[], 'Banff Mineral Springs Hospital with 24/7 emergency department. Pharmacies in town (Shoppers Drug Mart). Canmore Hospital 20 min east. Calgary hospitals 1.5 hrs.', 'Full-service town with grocery stores (IGA, Safeway in Canmore), banks, gear shops (Rude Boys, Monod Sports), liquor stores, and equipment rental.',
  'Very large — thousands of international workers each season, primarily from Australia, UK, Japan, and Europe. Banff is one of Canada''s top working holiday destinations.',
  -18, -5, 'high', 15
) ON CONFLICT DO NOTHING;

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
  '15', 'Revelstoke',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'Canada', 'Home to North America''s greatest vertical drop at 1,713 metres. Revelstoke is a powder paradise with uncrowded slopes, deep snowfall, and a tight-knit mountain community.', 51, -118.1606,
  'British Columbia', 'Revelstoke', 'https://www.revelstokemountainresort.com', 'https://images.unsplash.com/photo-1610394295702-00b39272459d?w=1200&q=80',
  1263, 69, 7, 19, 26, 17,
  1713, 512, 2225, 7, '{"gondolas":1,"chairlifts":4,"surface_lifts":2}'::jsonb,
  1049, '2025-12-06', '2026-04-12',
  ARRAY['Revelstoke Mountain Resort (resort operations)', 'Sutton Place Hotel Revelstoke', 'Hillcrest Hotel', 'Revelstoke town restaurants & bars', 'CMH Heli-Skiing (nearby)']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Hotel Housekeeping', 'Guest Services', 'Snowmaker', 'Rental Shop Technician']::text[], '600–1,000', ARRAY['English']::text[],
  'International workers typically require a Working Holiday Visa (IEC) for Canada. Australian, UK, French, Irish, and many other nationalities are eligible. Some employers offer LMIA-backed work permits for specialized roles.', 'Hiring begins in September–October. Positions fill through November. Smaller resort so positions are more limited — apply early.',
  true, 400, 'CAD $600–$900/month shared',
  'CAD $250–$400 (housing, food, transport)', 'Free resort shuttle from Revelstoke town to the mountain. BC Transit local bus. Greyhound/Rider Express to Kelowna (3 hrs) and Calgary (4.5 hrs). No train service currently.', ARRAY['Free or discounted season pass', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', 'Tight-knit community vibe']::text[],
  'Low-key but fun. The Village Idiot is the go-to après bar. The Last Drop is a local favourite. Craft beer at Mt. Begbie Brewing. Woolsey Creek for dining. River City Pub for late nights.', ARRAY['Snowmobiling', 'Cross-country skiing (Mt. Macpherson trails)', 'Snowshoeing', 'Hot springs (Halcyon Hot Springs, Canyon Hot Springs nearby)', 'Ice climbing', 'Heli-skiing', 'Fat biking']::text[], 'Queen Victoria Hospital in Revelstoke with emergency department. Pharmacies in town (Pharmasave). Larger hospitals in Kamloops or Kelowna (2–3 hrs).', 'Small but well-equipped town with grocery stores (Save-On-Foods, Southside Market), banks, gear shops, liquor store, and equipment rental.',
  'Moderate — growing international worker community, primarily Australian and European. Smaller and more local-feeling than Whistler or Banff.',
  -12, -3, 'high', 5
) ON CONFLICT DO NOTHING;

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
  '5', 'Vail',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'USA', 'One of the largest ski resorts in the US, with legendary back bowls and 5,317 acres of groomed runs and terrain. Vail''s European-style village and extensive terrain make it a top destination for seasonal workers.', 39.6403, -106.3742,
  'Colorado', 'Vail Village', 'https://www.vail.com', 'https://images.unsplash.com/photo-1548873903-5fc219569c50?w=1200&q=80',
  2140, 195, 36, 53, 64, 42,
  1052, 2457, 3527, 31, '{"gondolas":1,"chairlifts":25,"surface_lifts":5}'::jsonb,
  889, '2025-11-15', '2026-04-20',
  ARRAY['Vail Resorts (resort operations)', 'The Sebastian – Vail', 'Four Seasons Resort Vail', 'Vail Marriott Mountain Resort', 'The Lodge at Vail', 'Vail Village restaurants & bars', 'Vail Ski & Snowboard School']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Retail Sales Associate', 'Guest Services', 'Snowmaker', 'Grooming Operator']::text[], '3,000–5,000', ARRAY['English']::text[],
  'International workers typically use J-1 Exchange Visitor Visa (seasonal work) or H-2B temporary worker visa. J-1 requires a sponsor agency (e.g., CIEE, InterExchange). US citizens and permanent residents can work directly.', 'Vail Resorts begins hiring in August–September for the winter season. Job fairs held in September–October. J-1 visa applicants should begin the process 3–6 months in advance.',
  true, 1800, 'USD $500–$900/month shared',
  'USD $350–$500 (housing, food, transport)', 'Free Vail Transit bus system within Vail. ECO Transit connects Vail to other Eagle County towns (Minturn, Avon, Edwards). Eagle County Regional Airport 35 min. Denver 2 hrs via I-70.', ARRAY['Free Epic Pass (all Vail Resorts properties)', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', '401(k) and benefits for eligible employees']::text[],
  'World-class après-ski. Los Amigos at the base area is iconic. Red Lion is a Vail institution. The George, Vendetta''s, Garfinkel''s, and Pepi''s Bar are all popular. Lively nightlife in Vail Village and Lionshead.', ARRAY['Snowshoeing', 'Cross-country skiing', 'Ice skating (Alderhof Rink)', 'Snowmobiling', 'Tubing (Adventure Ridge)', 'Fat biking', 'Scenic gondola rides']::text[], 'Vail Health Hospital with 24/7 emergency department, a top-rated mountain hospital. The Steadman Clinic (world-renowned orthopaedic). Multiple pharmacies in Vail Village.', 'Full-service village with grocery stores (City Market in nearby Minturn/Avon), banks, luxury retail, gear shops, liquor stores, and equipment rental. Costco in Avon.',
  'Large — significant J-1 visa worker population from South America (Argentina, Chile, Peru), Europe, and Australia. International staff make up a substantial portion of seasonal workforce.',
  -15, -2, 'high', 15
) ON CONFLICT DO NOTHING;

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
  '16', 'Aspen Snowmass',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'USA', 'Four interconnected mountains — Aspen Mountain, Aspen Highlands, Buttermilk, and Snowmass — in one of the most glamorous ski towns in the world. Diverse terrain from beginner to expert.', 39.1911, -106.8175,
  'Colorado', 'Aspen', 'https://www.aspensnowmass.com', 'https://images.unsplash.com/photo-1618774659391-7e75004a11b7?w=1200&q=80',
  2180, 362, 54, 108, 128, 72,
  1343, 2422, 3813, 41, '{"gondolas":2,"chairlifts":30,"surface_lifts":9}'::jsonb,
  762, '2025-11-27', '2026-04-19',
  ARRAY['Aspen Skiing Company (resort operations)', 'The Little Nell Hotel', 'The St. Regis Aspen Resort', 'The Limelight Hotel', 'Aspen Hospitality (restaurants & lodging)', 'Aspen Ski & Snowboard School']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Retail Sales Associate', 'Guest Services', 'Snowmaker', 'Ski Patrol', 'Valet / Bell Staff']::text[], '3,500–5,500', ARRAY['English', 'Spanish']::text[],
  'International workers typically use J-1 Exchange Visitor Visa (seasonal work) or H-2B temporary worker visa. J-1 requires a sponsor agency. Aspen Skiing Company is a major J-1 employer.', 'Aspen Skiing Company begins hiring in August. Job fairs in September. Most positions filled by early November. J-1 visa applicants should begin the process 3–6 months in advance.',
  true, 1200, 'USD $600–$1,100/month shared',
  'USD $400–$600 (housing, food, transport). Aspen is one of the most expensive ski towns in the US.', 'Free RFTA (Roaring Fork Transportation Authority) buses throughout Aspen and to Snowmass. Free in-town Aspen shuttles. RFTA bus to Glenwood Springs (1 hr). Aspen/Pitkin County Airport with commercial flights.', ARRAY['Free Aspen Skiing Company season pass (all 4 mountains)', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', 'Employee housing program', 'Wellness benefits']::text[],
  'Glamorous après-ski scene. Ajax Tavern at the base of Aspen Mountain is legendary. Escobar, The J-Bar at Hotel Jerome, 39 Degrees (at the Sky Hotel), and Zane''s Tavern. Snowmass has Venga Venga and The Collective.', ARRAY['Snowshoeing', 'Cross-country skiing (Aspen Nordic Center)', 'Ice skating (Silver Circle Ice Rink)', 'Snowmobiling', 'Paragliding', 'Fat biking', 'Hot springs (Glenwood Hot Springs, 45 min)']::text[], 'Aspen Valley Hospital with 24/7 emergency department. Multiple pharmacies (City Market Pharmacy, Aspen Drug). Orthopaedic specialists available locally.', 'Upscale shopping in Aspen core (luxury boutiques). Clark''s Market and City Market for groceries. Banks, gear shops (Ute Mountaineer, Four Mountain Sports), liquor stores.',
  'Large — significant international workforce, especially from South America (Argentina, Brazil, Chile), Australia, and Europe. Spanish-speaking community is substantial.',
  -17, -3, 'high', 12
) ON CONFLICT DO NOTHING;

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
  '17', 'Breckenridge',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'USA', 'A historic mining town turned world-class ski resort with five peaks and one of the highest chairlifts in North America. Known for its vibrant Main Street, lively après scene, and excellent terrain parks.', 39.4817, -106.0384,
  'Colorado', 'Breckenridge', 'https://www.breckenridge.com', 'https://images.unsplash.com/photo-1606666334434-4c24739144a5?w=1200&q=80',
  1186, 187, 21, 55, 67, 44,
  1036, 2926, 3962, 35, '{"gondolas":1,"chairlifts":24,"surface_lifts":10}'::jsonb,
  838, '2025-11-07', '2026-05-25',
  ARRAY['Vail Resorts (resort operations)', 'Grand Colorado on Peak 8', 'One Ski Hill Place', 'Main Street restaurants & bars', 'Breckenridge Ski & Ride School', 'Beaver Run Resort & Conference Center']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Retail Sales Associate', 'Guest Services', 'Terrain Park Crew', 'Snowmaker']::text[], '2,500–4,000', ARRAY['English']::text[],
  'International workers typically use J-1 Exchange Visitor Visa (seasonal work) or H-2B temporary worker visa. J-1 requires a sponsor agency (e.g., CIEE, InterExchange). Vail Resorts is a major J-1 employer.', 'Vail Resorts begins hiring in August–September. Job fairs held in Summit County in September. Positions fill quickly — one of the most popular resort towns for seasonal work.',
  true, 1200, 'USD $500–$900/month shared',
  'USD $350–$500 (housing, food, transport)', 'Free Summit Stage bus throughout Summit County (Breckenridge, Frisco, Dillon, Silverthorne, Keystone, Copper Mountain). Free in-town Breck Free Ride bus. Denver 2 hrs via I-70.', ARRAY['Free Epic Pass (all Vail Resorts properties)', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', '401(k) and benefits for eligible employees']::text[],
  'One of Colorado''s best après scenes. Breckenridge Brewery is a local icon. The Gold Pan Saloon (oldest bar west of the Mississippi), Downstairs at Eric''s, Cecilia''s, Kenosha Steakhouse, and Broken Compass Brewing.', ARRAY['Snowshoeing', 'Cross-country skiing (Breckenridge Nordic Center)', 'Ice skating (Stephen C. West Ice Arena)', 'Snowmobiling', 'Dog sledding', 'Tubing', 'Fat biking', 'Brewery tours']::text[], 'Breckenridge medical clinic with urgent care. St. Anthony Summit Medical Center in Frisco (15 min) with 24/7 emergency. Pharmacies on Main Street (City Market Pharmacy).', 'Well-stocked Main Street with grocery stores (City Market), banks, gear shops (Christy Sports, Carvers), liquor stores, and boutique shopping. Outlets at Silverthorne (20 min).',
  'Very large — one of the top J-1 visa destinations in the US. Large communities from South America, Eastern Europe, and Australia. Very multicultural seasonal workforce.',
  -16, -3, 'high', 20
) ON CONFLICT DO NOTHING;

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
  '18', 'Jackson Hole',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'USA', 'Renowned for its extreme terrain, 4,139-foot continuous vertical rise, and the iconic Corbet''s Couloir. Jackson Hole attracts expert skiers from around the world and borders Grand Teton National Park.', 43.5877, -110.8279,
  'Wyoming', 'Teton Village / Jackson', 'https://www.jacksonhole.com', 'https://images.unsplash.com/photo-1606666334400-8c0cbe58cbd8?w=1200&q=80',
  1012, 133, 13, 40, 50, 30,
  1262, 1924, 3185, 15, '{"gondolas":1,"chairlifts":12,"surface_lifts":2}'::jsonb,
  1143, '2025-12-06', '2026-04-12',
  ARRAY['Jackson Hole Mountain Resort (resort operations)', 'Four Seasons Resort Jackson Hole', 'Hotel Terra Jackson Hole', 'Snake River Lodge & Spa', 'Town of Jackson restaurants & bars', 'Jackson Hole Ski & Snowboard School']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Guest Services', 'Ski Patrol', 'Snowmaker', 'Grooming Operator']::text[], '2,000–3,500', ARRAY['English']::text[],
  'International workers typically use J-1 Exchange Visitor Visa (seasonal work) or H-2B temporary worker visa. J-1 requires a sponsor agency. Jackson Hole Mountain Resort hires J-1 workers each season. No state income tax in Wyoming.', 'Hiring begins in August–September. Jackson Hole Mountain Resort holds job fairs in October. Housing is extremely competitive — secure it early.',
  true, 800, 'USD $600–$1,100/month shared',
  'USD $400–$550 (housing, food, transport). Jackson is an expensive town.', 'Free START Bus system throughout Jackson, Teton Village, and surrounding areas. Jackson Hole Airport (JAC) is the only US airport inside a national park — 20 min to town.', ARRAY['Free or discounted season pass', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', 'No state income tax', 'Access to Grand Teton & Yellowstone National Parks']::text[],
  'Laid-back but fun après-ski. The Mangy Moose in Teton Village is legendary. Handle Bar at Four Seasons. In town: Million Dollar Cowboy Bar (iconic saddle barstools), The Rose, Bin22, and Snake River Brewing.', ARRAY['Snowshoeing in Grand Teton National Park', 'Cross-country skiing', 'Snowmobiling in Yellowstone', 'Wildlife safaris (elk, moose, bison)', 'Dog sledding', 'Ice climbing', 'Hot springs (Granite Hot Springs)', 'Fat biking']::text[], 'St. John''s Health hospital in Jackson with 24/7 emergency department. Multiple pharmacies in town (Walgreens, Albertsons Pharmacy). Mountain clinic at Teton Village.', 'Full-service town of Jackson with grocery stores (Albertsons, Jackson Whole Grocer), banks, gear shops (Teton Mountaineering, Hoback Sports), liquor stores, and boutique shopping.',
  'Moderate to large — significant J-1 and H-2B worker populations, primarily from South America, Eastern Europe, and Oceania.',
  -18, -4, 'high', 8
) ON CONFLICT DO NOTHING;

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
  '19', 'Park City',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'USA', 'The largest ski resort in the United States with over 7,300 acres of terrain. Park City is a former silver mining town just 35 minutes from Salt Lake City, making it one of the most accessible major resorts.', 40.6461, -111.498,
  'Utah', 'Park City', 'https://www.parkcitymountain.com', 'https://images.unsplash.com/photo-1698323200139-c14df11612ac?w=1200&q=80',
  2954, 341, 44, 104, 119, 74,
  953, 2080, 3048, 41, '{"gondolas":1,"chairlifts":32,"surface_lifts":8}'::jsonb,
  914, '2025-11-22', '2026-04-12',
  ARRAY['Vail Resorts (resort operations)', 'Deer Valley Resort (nearby, Alterra)', 'Montage Deer Valley', 'Waldorf Astoria Park City', 'Park City Main Street restaurants & bars', 'Park City Ski & Snowboard School']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Retail Sales Associate', 'Guest Services', 'Snowmaker', 'Grooming Operator']::text[], '3,500–5,500', ARRAY['English']::text[],
  'International workers typically use J-1 Exchange Visitor Visa (seasonal work) or H-2B temporary worker visa. J-1 requires a sponsor agency. Vail Resorts and Deer Valley are major J-1 employers.', 'Major employers begin hiring in August–September. Sundance Film Festival (January) creates additional short-term opportunities. Housing is competitive — start early.',
  true, 1500, 'USD $550–$950/month shared',
  'USD $350–$500 (housing, food, transport)', 'Free Park City Transit bus system throughout town and to resort bases. UTA bus to Salt Lake City (35 min). Salt Lake City International Airport 40 min.', ARRAY['Free Epic Pass (all Vail Resorts properties)', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', 'Sundance Film Festival access for locals', 'Proximity to Salt Lake City amenities']::text[],
  'Vibrant après-ski and nightlife. No Name Saloon & Grill on Main Street is the iconic spot. High West Distillery & Saloon, Spur Bar & Grill, O''Shucks, and The Cabin. Main Street is lively year-round.', ARRAY['Snowshoeing', 'Cross-country skiing (White Pine Touring)', 'Ice skating', 'Snowmobiling', 'Tubing (Gorgoza Park)', 'Bobsled experience (Utah Olympic Park)', 'Hot air ballooning', 'Olympic venue tours']::text[], 'Park City Hospital (Intermountain Healthcare) with 24/7 emergency. Multiple pharmacies (Walgreens, Rite Aid). Major hospitals in Salt Lake City 35 min away.', 'Full-service town with grocery stores (Freshies Market, Smith''s, Whole Foods in Kimball Junction), banks, gear shops (Jans Mountain Outfitters, Cole Sport), outlet malls at Kimball Junction.',
  'Very large — one of the largest J-1 visa destinations in the US. Large South American, Eastern European, and Oceanian communities. Proximity to SLC makes it accessible.',
  -13, -1, 'high', 18
) ON CONFLICT DO NOTHING;

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
  '20', 'Big Sky',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'USA', 'Montana''s premier destination with the ''Biggest Skiing in America'' — 5,800 acres across four mountains. Known for uncrowded slopes, the iconic Lone Mountain, and a western frontier atmosphere.', 45.2833, -111.4014,
  'Montana', 'Big Sky', 'https://www.bigskyresort.com', 'https://images.unsplash.com/photo-1582641637614-3f446aa083fa?w=1200&q=80',
  2347, 317, 47, 95, 107, 68,
  1361, 2072, 3403, 39, '{"gondolas":0,"chairlifts":27,"surface_lifts":12}'::jsonb,
  1016, '2025-11-27', '2026-04-19',
  ARRAY['Big Sky Resort (Boyne Resorts, resort operations)', 'The Lodge at Big Sky', 'Huntley Lodge', 'Montage Big Sky', 'Lone Mountain Ranch', 'Big Sky Town Center restaurants & bars']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Guest Services', 'Snowmaker', 'Grooming Operator', 'Ski Patrol']::text[], '2,000–3,000', ARRAY['English']::text[],
  'International workers typically use J-1 Exchange Visitor Visa (seasonal work) or H-2B temporary worker visa. J-1 requires a sponsor agency. Big Sky Resort participates in the J-1 program.', 'Hiring begins in September. Most positions filled by November. Employee housing is available but limited — apply early to secure a spot.',
  true, 900, 'USD $450–$800/month shared',
  'USD $300–$450 (housing, food, transport)', 'Skyline Bus provides free local transit within Big Sky. LINK Express bus to Bozeman (1 hr). Bozeman Yellowstone International Airport 50 min. Limited public transport — a car is helpful.', ARRAY['Free or discounted Ikon Pass', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', 'Access to Yellowstone National Park (nearby)']::text[],
  'Low-key Western après vibe. Lone Mountain Ranch has events. The Rocks Tasting Room and Westward Social are local go-tos. Chet''s Bar & Grill and the Carabiner Lounge at the mountain. In Bozeman: Bridger Brewing and a lively downtown scene.', ARRAY['Snowshoeing', 'Cross-country skiing (Lone Mountain Ranch)', 'Snowmobiling', 'Dog sledding', 'Wildlife viewing', 'Zipline tours', 'Yellowstone winter tours', 'Fat biking']::text[], 'Big Sky Medical Center with emergency and urgent care. Bozeman Health Deaconess Hospital (1 hr) for major emergencies. Pharmacy in Big Sky Town Center.', 'Big Sky Town Center has a grocery store (Roxy''s Market, Hungry Moose Market), banks, gear shops, and basic services. Bozeman (1 hr) has full retail including Costco.',
  'Moderate — growing J-1 visa community. Primarily American seasonal workers with some South American and European staff.',
  -16, -4, 'high', 10
) ON CONFLICT DO NOTHING;

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
  '21', 'Steamboat Springs',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'USA', 'Famous for its trademarked ''Champagne Powder'' snow, cowboy culture, and natural hot springs. Steamboat blends authentic Western heritage with world-class skiing across 165 trails.', 40.457, -106.8045,
  'Colorado', 'Steamboat Springs', 'https://www.steamboat.com', 'https://images.unsplash.com/photo-1589496145106-2af25f7c8c1d?w=1200&q=80',
  1215, 169, 24, 56, 58, 31,
  1106, 2103, 3221, 18, '{"gondolas":1,"chairlifts":14,"surface_lifts":3}'::jsonb,
  838, '2025-11-22', '2026-04-12',
  ARRAY['Steamboat Ski & Resort Corporation (Alterra Mountain Company)', 'Steamboat Grand Resort Hotel', 'The Lodge at Steamboat', 'Sheraton Steamboat Resort Villas', 'Steamboat Springs restaurants & bars', 'Steamboat Ski & Sport School']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Retail Sales Associate', 'Guest Services', 'Snowmaker', 'Hot Springs Attendant']::text[], '2,000–3,500', ARRAY['English']::text[],
  'International workers typically use J-1 Exchange Visitor Visa (seasonal work) or H-2B temporary worker visa. J-1 requires a sponsor agency. Steamboat participates in J-1 hiring programs.', 'Hiring begins in August–September. Steamboat hosts job fairs in September–October. Positions fill through November. Good availability of affordable housing compared to some Colorado resorts.',
  true, 1000, 'USD $500–$850/month shared',
  'USD $300–$450 (housing, food, transport)', 'Free Steamboat Springs Transit (SST) bus throughout town and to the ski area. Yampa Valley Regional Airport (HDN) 25 min with seasonal flights. Denver 3 hrs.', ARRAY['Free or discounted Ikon Pass', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', 'Free access to Old Town Hot Springs for some employers']::text[],
  'Authentic Western après-ski. T-Bar at Steamboat base area is the classic. Schmiggity''s Live Music & Dancing for nightlife. Mahogany Ridge Brewery & Grill, Old Town Pub, The Tap House. Laid-back cowboy culture meets ski-town energy.', ARRAY['Hot springs (Old Town Hot Springs, Strawberry Park Hot Springs)', 'Snowshoeing', 'Cross-country skiing (Steamboat Touring Center)', 'Tubing', 'Snowmobiling', 'Fat biking', 'Dog sledding', 'Ice fishing']::text[], 'UCHealth Yampa Valley Medical Center with 24/7 emergency department. Multiple pharmacies in town (City Market Pharmacy, Walgreens). Dental and specialist clinics available.', 'Full-service mountain town with grocery stores (City Market, Safeway), banks, gear shops (Christy Sports, Straightline), liquor stores, and western wear shops.',
  'Moderate to large — growing J-1 visa community. Strong South American worker presence. More of an authentic American ski town feel.',
  -17, -3, 'high', 15
) ON CONFLICT DO NOTHING;

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
  '22', 'Stowe',
  (SELECT id FROM public.regions WHERE legacy_id = '10' LIMIT 1),
  'USA', 'Vermont''s most famous ski resort, blending New England charm with challenging terrain on Mt. Mansfield, the state''s highest peak. Known as the ''Ski Capital of the East.''', 44.5303, -72.7814,
  'Vermont', 'Stowe', 'https://www.stowe.com', 'https://images.unsplash.com/photo-1696912161244-f3774bcb4964?w=1200&q=80',
  199, 116, 29, 36, 35, 16,
  723, 390, 1116, 13, '{"gondolas":1,"chairlifts":9,"surface_lifts":3}'::jsonb,
  762, '2025-11-22', '2026-04-19',
  ARRAY['Vail Resorts (resort operations)', 'Stowe Mountain Lodge (Destination Hotels)', 'The Lodge at Spruce Peak', 'Trapp Family Lodge', 'Topnotch Resort', 'Stowe village restaurants & shops', 'Stowe Ski & Snowboard School']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Retail Sales Associate', 'Guest Services', 'Snowmaker', 'Grooming Operator']::text[], '1,500–2,500', ARRAY['English']::text[],
  'International workers typically use J-1 Exchange Visitor Visa (seasonal work) or H-2B temporary worker visa. J-1 requires a sponsor agency. Vermont resorts have a smaller but active J-1 program.', 'Hiring begins in September. Positions fill through October–November. Stowe''s smaller scale means fewer but more community-oriented positions.',
  true, 500, 'USD $500–$800/month shared',
  'USD $300–$450 (housing, food, transport)', 'Free Stowe Mountain Road Shuttle from the village to the mountain. Green Mountain Transit (GMT) bus service. Burlington International Airport 45 min. Limited public transit — a car is helpful.', ARRAY['Free Epic Pass (all Vail Resorts properties)', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', 'Vermont craft beer culture']::text[],
  'Charming New England après-ski. The Matterhorn (legendary live music bar in Stowe since 1960s). Doc Ponds, The Bench, Cork Wine Bar, and Prohibition Pig for craft beer and BBQ. Trapp Family Lodge Bierhall for Austrian-style après.', ARRAY['Cross-country skiing (Trapp Family Lodge, Stowe Mountain Resort)', 'Snowshoeing', 'Ice skating', 'Snowmobiling', 'Ice climbing (Smugglers'' Notch)', 'Dog sledding', 'Fat biking', 'Brewery tours (Alchemist, von Trapp Brewing)']::text[], 'Copley Hospital in Morrisville (15 min) with emergency services. UVM Medical Center in Burlington (45 min). Pharmacies in Stowe village.', 'Quaint village with grocery stores (Shaw''s, Stowe Mercantile), banks, ski shops (Pinnacle Ski & Sports, AJ''s Ski & Sports), and New England boutiques along Mountain Road.',
  'Small to moderate — fewer international workers than Western resorts. Some J-1 visa workers, primarily from South America and Europe. More of a domestic seasonal workforce.',
  -18, -4, 'medium', 35
) ON CONFLICT DO NOTHING;

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
  '23', 'Telluride',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'USA', 'Nestled in a box canyon in the San Juan Mountains, Telluride is a former mining town with dramatic scenery, a free gondola connecting town to Mountain Village, and some of Colorado''s most challenging terrain.', 37.9375, -107.8123,
  'Colorado', 'Telluride', 'https://www.tellurideskiresort.com', 'https://images.unsplash.com/photo-1696912161455-6e948f3572c5?w=1200&q=80',
  810, 148, 23, 36, 53, 36,
  1260, 2659, 3831, 18, '{"gondolas":2,"chairlifts":14,"surface_lifts":2}'::jsonb,
  838, '2025-11-27', '2026-04-05',
  ARRAY['Telluride Ski & Golf Company (resort operations)', 'The Madeline Hotel & Residences', 'Hotel Telluride', 'The Peaks Resort & Spa', 'Telluride town restaurants & bars', 'Telluride Ski & Snowboard School']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Guest Services', 'Snowmaker', 'Grooming Operator', 'Spa Attendant']::text[], '1,500–2,500', ARRAY['English']::text[],
  'International workers typically use J-1 Exchange Visitor Visa (seasonal work) or H-2B temporary worker visa. J-1 requires a sponsor agency. Telluride Ski & Golf participates in J-1 programs.', 'Hiring begins in September. Positions fill through October–November. Telluride''s remote location means housing is critical — the town has a dedicated housing authority to assist workers.',
  true, 600, 'USD $550–$950/month shared',
  'USD $350–$500 (housing, food, transport)', 'Free Galloping Goose transit throughout Telluride and Mountain Village. Free gondola connecting town to Mountain Village (13 min). Telluride Regional Airport (TEX) with limited flights. Montrose Airport 65 min.', ARRAY['Free or discounted season pass (Ikon Pass)', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', 'Free gondola between town and Mountain Village', 'Access to festivals (Telluride Film Festival, Bluegrass Festival - summer)']::text[],
  'Intimate but lively après-ski. There Bar (base of Chair 4) is the classic ski-off spot. The New Sheridan Bar (historic hotel bar), Last Dollar Saloon, Smuggler Union, and Brown Dog Pizza. Mountain Village has Tracks Café and Black Iron Kitchen.', ARRAY['Snowshoeing', 'Cross-country skiing', 'Ice climbing (Bridal Veil Falls)', 'Snowmobiling', 'Hot springs (Orvis Hot Springs, Dunton Hot Springs nearby)', 'Fat biking', 'Heli-skiing']::text[], 'Telluride Medical Center with emergency and urgent care. Montrose Memorial Hospital (65 min) for major emergencies. Pharmacy in town (Telluride Pharmacy).', 'Small but well-stocked town with grocery (Clark''s Market, Village Market), banks, gear shops (Bootdoctors, Telluride Sports), liquor store, and boutique shopping on Main Street.',
  'Small to moderate — tight-knit international community. Some J-1 workers from South America and Europe. Town has a strong local culture and welcomes seasonal staff.',
  -17, -3, 'high', 12
) ON CONFLICT DO NOTHING;

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
  '24', 'Sun Valley',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'USA', 'America''s first destination ski resort, founded in 1936. Sun Valley''s Bald Mountain is famous for perfectly groomed runs and consistent dry snow. A low-key, uncrowded alternative to larger resorts.', 43.6977, -114.3514,
  'Idaho', 'Ketchum / Sun Valley', 'https://www.sunvalley.com', 'https://images.unsplash.com/photo-1709506531620-6195c890ef10?w=1200&q=80',
  900, 121, 36, 42, 30, 13,
  1036, 1752, 2789, 18, '{"gondolas":1,"chairlifts":13,"surface_lifts":4}'::jsonb,
  508, '2025-11-27', '2026-04-19',
  ARRAY['Sun Valley Resort (resort operations)', 'Sun Valley Lodge', 'Sun Valley Inn', 'Limelight Hotel Ketchum', 'Ketchum restaurants & bars', 'Sun Valley Ski & Snowboard School']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Guest Services', 'Snowmaker', 'Grooming Operator', 'Hotel Front Desk']::text[], '1,200–2,000', ARRAY['English']::text[],
  'International workers typically use J-1 Exchange Visitor Visa (seasonal work) or H-2B temporary worker visa. J-1 requires a sponsor agency. Sun Valley Resort participates in J-1 visa hiring.', 'Hiring begins in September–October. Sun Valley Resort holds job fairs in early fall. Smaller resort community — positions fill moderately quickly.',
  true, 500, 'USD $450–$800/month shared',
  'USD $300–$450 (housing, food, transport)', 'Free Mountain Rides public transit throughout Ketchum, Sun Valley, and Hailey. Friedman Memorial Airport (SUN) in Hailey, 15 min south. Boise 2.5 hrs.', ARRAY['Free or discounted season pass', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', 'Access to Sun Valley Lodge amenities (pool, ice rink)']::text[],
  'Low-key, upscale après. The Duchin Lounge at Sun Valley Lodge is classic. Whiskey Jacques'' in Ketchum is the dive bar institution. Sawtooth Brewery taproom, The Casino (historic bar), and Grumpy''s for burgers. Pioneer Saloon for steak dinners.', ARRAY['Cross-country skiing (Sun Valley Nordic Center, miles of groomed trails)', 'Snowshoeing', 'Ice skating (Sun Valley Lodge outdoor rink)', 'Snowmobiling', 'Fat biking', 'Hot springs (Frenchman''s Bend, Russian John)']::text[], 'St. Luke''s Wood River Medical Center in Ketchum with 24/7 emergency. Pharmacies in town (Atkinsons'' Pharmacy). Larger hospital facilities in Twin Falls (1.5 hrs) or Boise (2.5 hrs).', 'Well-stocked Ketchum with grocery stores (Atkinsons'' Market, Giacobbi Square), banks, gear shops (Sturtevants, Backwoods Mountain Sports), and boutique shopping.',
  'Small to moderate — some J-1 visa workers but smaller international community than major Colorado resorts. Strong local community with welcoming atmosphere.',
  -14, -2, 'medium', 30
) ON CONFLICT DO NOTHING;

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
  '25', 'Mammoth Mountain',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'USA', 'California''s highest ski resort with one of the longest seasons in North America. Mammoth receives massive snowfall and offers stunning views of the Eastern Sierra. A popular destination for Southern California workers.', 37.6308, -119.0326,
  'California', 'Mammoth Lakes', 'https://www.mammothmountain.com', 'https://images.unsplash.com/photo-1647966233050-a4b640d89fc6?w=1200&q=80',
  1416, 175, 25, 40, 67, 43,
  945, 2424, 3369, 28, '{"gondolas":2,"chairlifts":20,"surface_lifts":6}'::jsonb,
  1016, '2025-11-08', '2026-06-01',
  ARRAY['Alterra Mountain Company (resort operations)', 'The Village at Mammoth', 'Mammoth Mountain Inn', 'Westin Monache Resort', 'Mammoth Lakes restaurants & bars', 'Mammoth Mountain Ski & Snowboard School']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Retail Sales Associate', 'Guest Services', 'Snowmaker', 'Grooming Operator']::text[], '2,000–3,500', ARRAY['English', 'Spanish']::text[],
  'International workers typically use J-1 Exchange Visitor Visa (seasonal work) or H-2B temporary worker visa. J-1 requires a sponsor agency. Mammoth Mountain/Alterra is a major J-1 employer.', 'Hiring begins in August–September. Mammoth has one of the longest seasons (Nov–June in good years), so early- and late-season positions are available. Job fairs in September.',
  true, 800, 'USD $500–$900/month shared',
  'USD $300–$450 (housing, food, transport)', 'Free Mammoth Transit (Orange, Red, Blue, Yellow lines) throughout town and to the mountain. Eastern Sierra Transit to Bishop and Reno. Mammoth Yosemite Airport (MMH) with limited seasonal flights. Reno 3 hrs, LA 5 hrs.', ARRAY['Free or discounted Ikon Pass', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', 'Extended season means longer employment', 'Hot springs access nearby']::text[],
  'California-casual après-ski. Clocktower Cellar is the legendary dive bar. Lakanuki (tiki bar), Mammoth Brewing Company, Liberty Sports Bar & Grill, and 53 Kitchen & Cocktails. The Village at Mammoth has several spots. Yodler at the base.', ARRAY['Hot springs (Wild Willy''s, Travertine, Benton Hot Springs)', 'Snowshoeing', 'Cross-country skiing (Tamarack Cross-Country Ski Center)', 'Snowmobiling', 'Ice skating', 'Backcountry touring', 'Stargazing (Eastern Sierra dark skies)']::text[], 'Mammoth Hospital with 24/7 emergency department and orthopaedic clinic. Pharmacies in town (Rite Aid, Vons Pharmacy). Northern Inyo Hospital in Bishop (45 min).', 'Full-service town of Mammoth Lakes with grocery stores (Vons, Grocery Outlet), banks, gear shops (Footloose Sports, Wave Rave, Kittredge Sports), liquor stores, and the Village shopping area.',
  'Moderate to large — significant J-1 visa community, especially from South America (Argentina, Chile) and Australia. Large Latino/Hispanic community. California-diverse workforce.',
  -12, 0, 'high', 15
) ON CONFLICT DO NOTHING;

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
  '26', 'Crested Butte',
  (SELECT id FROM public.regions WHERE legacy_id = '2' LIMIT 1),
  'USA', 'A former coal mining town turned funky ski village, Crested Butte is known for its extreme terrain, colourful Victorian architecture, and tight-knit community. Often called ''Colorado''s last great ski town.''', 38.8991, -106.9653,
  'Colorado', 'Crested Butte', 'https://www.skicb.com', 'https://images.unsplash.com/photo-1707045611662-d3e7cee046b9?w=1200&q=80',
  612, 121, 17, 31, 41, 32,
  896, 2775, 3707, 16, '{"gondolas":0,"chairlifts":12,"surface_lifts":4}'::jsonb,
  762, '2025-11-27', '2026-04-05',
  ARRAY['Vail Resorts (resort operations)', 'The Grand Lodge Crested Butte', 'The Elevation Hotel & Spa', 'Crested Butte Mountain Resort base area', 'Elk Avenue restaurants & bars', 'Crested Butte Ski & Ride School']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Guest Services', 'Snowmaker', 'Grooming Operator', 'Retail Sales Associate']::text[], '1,000–1,800', ARRAY['English']::text[],
  'International workers typically use J-1 Exchange Visitor Visa (seasonal work) or H-2B temporary worker visa. J-1 requires a sponsor agency (e.g., CIEE, InterExchange). Vail Resorts participates in J-1 programs.', 'Hiring begins in September. Positions fill through October–November. Crested Butte''s remoteness means fewer applicants — good odds for seasonal jobs. Limited housing so apply early.',
  true, 400, 'USD $450–$800/month shared',
  'USD $300–$450 (housing, food, transport)', 'Free Mountain Express bus between Crested Butte town and Mt. Crested Butte. Free town shuttle. Gunnison–Crested Butte Regional Airport (GUC) 30 min with limited flights. Denver 4 hrs.', ARRAY['Free Epic Pass (all Vail Resorts properties)', 'Staff meal discounts', 'Pro deals on gear', 'Staff events & parties', 'Tight-knit community', 'Vibrant arts and culture scene']::text[],
  'Funky, local-driven après-ski on Elk Avenue. The Brick Oven is a hangout. Talk of the Town, Kochevar''s Saloon (historic bar), The Eldo Brewery, Dogwood Cocktail Cabin, and Bonez tequila bar. Small-town vibe with big personality.', ARRAY['Cross-country skiing (Crested Butte Nordic Center)', 'Snowshoeing', 'Fat biking (Crested Butte is the birthplace of mountain biking)', 'Snowmobiling', 'Ice skating', 'Backcountry skiing', 'Dog sledding']::text[], 'Gunnison Valley Hospital (30 min in Gunnison) with 24/7 emergency. Crested Butte Medical Clinic for urgent care. Pharmacy in town. Nearest major hospital in Montrose (1.5 hrs).', 'Small, charming Elk Avenue with grocery (Clark''s Market), banks, gear shops (The Alpineer, Crested Butte Sports), liquor store, and colourful local boutiques. Gunnison (30 min) has more retail options.',
  'Small — tight-knit but limited international community. Some J-1 workers but primarily domestic seasonal staff. Very welcoming locals. Known for a strong sense of community.',
  -18, -4, 'high', 10
) ON CONFLICT DO NOTHING;

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
  '2', 'Chamonix Mont-Blanc',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'France', 'A legendary alpine destination at the base of Mont Blanc, Europe''s highest peak. Known for extreme off-piste terrain, the Vallée Blanche descent, and a town steeped in mountaineering history. Chamonix hosted the first Winter Olympics in 1924.', 45.9237, 6.8694,
  'Haute-Savoie', 'Chamonix', 'https://www.chamonix.com', 'https://images.unsplash.com/photo-1701358232769-998897181fba?w=1200&q=80',
  600, 69, 17, 22, 20, 10,
  2807, 1035, 3842, 47, '{"gondolas":6,"chairlifts":18,"surface_lifts":23}'::jsonb,
  870, '2025-12-01', '2026-04-30',
  ARRAY['Compagnie du Mont-Blanc (lifts & operations)', 'Hotels & chalets (Hameau Albert 1er, Le Morgane)', 'ESF Chamonix (ski school)', 'Restaurants & bars', 'Mountain guide companies']::text[], ARRAY['Ski/Snowboard Instructor', 'Chalet Host', 'Hotel Receptionist', 'Kitchen Staff / Chef', 'Bar Staff', 'Lift Operator', 'Nanny / Childcare', 'Transfer Driver']::text[], '1,500–3,000', ARRAY['French', 'English']::text[],
  'EU/EEA citizens can work freely. UK citizens need a long-stay visa since Brexit. Australians, Canadians, and others may apply for a Working Holiday Visa (PVT) for France.', 'Hiring typically runs August–November. French-speaking candidates have a significant advantage. Ski instructor roles require local certifications.',
  true, 500, '€500–€900/month shared',
  '€300–€450 (housing, food, transport)', 'Free Chamonix Bus network throughout the valley. SNCF train to nearby towns. Geneva Airport 1 hr by shuttle.', ARRAY['Discounted or free ski pass for resort employees', 'Staff meals at many hotels', 'Pro deals on equipment']::text[],
  'Authentic Alpine après-ski. MBC (Micro Brasserie de Chamonix), Chambre Neuf, Elevation 1904 bar. Live music venues and an active club scene for a small mountain town.', ARRAY['Mountaineering', 'Ice climbing', 'Paragliding', 'Snowshoeing', 'Cross-country skiing', 'Swimming (indoor complex)']::text[], 'Hôpital de Chamonix with emergency services. Multiple pharmacies and doctors in town.', 'Well-stocked Carrefour and Casino supermarkets, banks, outdoor gear shops (Snell Sports), bakeries.',
  'Large — significant British, Scandinavian, and Australian seasonal worker population alongside French locals.',
  -10, 2, 'high', 15
) ON CONFLICT DO NOTHING;

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
  '27', 'Val d''Isère',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'France', 'One of France''s most prestigious ski resorts, linked with Tignes to form the vast Espace Killy ski area with 300km of runs. Known for challenging terrain, reliable high-altitude snow, and a lively resort village. Regular host of FIS Alpine World Cup races on the famous Face de Bellevarde.', 45.4485, 6.9806,
  'Savoie', 'Val d''Isère', 'https://www.valdisere.com', 'https://images.unsplash.com/photo-1636581563868-d5322a0360f7?w=1200&q=80',
  1500, 153, 23, 61, 46, 23,
  1900, 1850, 3456, 73, '{"gondolas":4,"chairlifts":36,"surface_lifts":33}'::jsonb,
  700, '2025-11-29', '2026-05-03',
  ARRAY['STVI (Société des Téléphériques de Val d''Isère — lift operations)', 'Hôtel Le Blizzard', 'Hôtel Aigle des Neiges', 'Club Med Val d''Isère', 'ESF Val d''Isère (ski school)', 'Oxygène Ski School', 'Dick''s Tea Bar (legendary nightclub)', 'La Folie Douce Val d''Isère']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Resort Representative (tour operators)', 'Chalet Host', 'Ski Technician', 'Snowmaker / Pisteur']::text[], '2,000–3,500', ARRAY['French', 'English']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. UK, Australian, New Zealand, and Canadian citizens aged 18–30 (35 for some) can apply for a Working Holiday Visa (PVT) for France. Non-EU citizens otherwise need employer-sponsored work permits.', 'Major employers and tour operators begin recruiting in June–August for the winter season. ESF and ski schools recruit qualified instructors from September. Late positions available into November.',
  true, 1200, 'EUR €400–€700/month shared',
  'EUR €250–€400 (housing, food, transport)', 'Free navette (shuttle bus) throughout Val d''Isère and to Tignes. SNCF train to Bourg-Saint-Maurice (30 min by bus). Lyon Airport 3 hrs, Geneva Airport 3.5 hrs by shuttle.', ARRAY['Discounted or free season pass (employer-dependent)', 'Staff meals at hotels/restaurants', 'Pro deals on ski gear', 'Ski school discounts for staff families', 'End-of-season staff parties']::text[],
  'Legendary après-ski scene. La Folie Douce (on-mountain party venue) is iconic. In the village: Dick''s Tea Bar (institution since 1979), Bananas nightclub, Café Face, Petit Danois, and Le Salon des Fous. Lively bar scene along the main street.', ARRAY['Off-piste skiing and touring', 'Snowshoeing', 'Ice climbing', 'Ice driving on frozen lake', 'Cross-country skiing', 'Paragliding', 'Swimming (Centre Aquasportif)']::text[], 'Cabinet Médical de Val d''Isère with doctors and emergency care. Pharmacies in the resort centre. Nearest hospital: Centre Hospitalier de Bourg-Saint-Maurice (30 min).', 'Sherpa supermarket, bakeries, banks, ATMs, post office, ski rental shops (Intersport, Sport 2000), and boutiques along the main street. Weekly market.',
  'Large — significant British, Scandinavian, and Australian seasonal worker population. English widely spoken. Strong tour operator presence (Crystal, Inghams, Ski Total).',
  -10, 0, 'high', 35
) ON CONFLICT DO NOTHING;

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
  '28', 'Val Thorens',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'France', 'Europe''s highest ski resort at 2,300m, part of Les 3 Vallées — the world''s largest linked ski area with 600km of pistes. Guaranteed snow from November to May thanks to altitude and north-facing slopes. A purpose-built resort with ski-in/ski-out convenience.', 45.2983, 6.5803,
  'Savoie', 'Val Thorens', 'https://www.valthorens.com', 'https://images.unsplash.com/photo-1673965918877-82154906042b?w=1200&q=80',
  2400, 166, 28, 67, 50, 21,
  1430, 2300, 3230, 32, '{"gondolas":3,"chairlifts":17,"surface_lifts":12}'::jsonb,
  600, '2025-11-22', '2026-05-10',
  ARRAY['SETAM (Société d''Exploitation des Téléphériques — lift company)', 'Club Med Val Thorens Sensations', 'Hôtel Pashmina Le Refuge', 'Hôtel Le Val Thorens', 'ESF Val Thorens (ski school)', 'Prosneige Ski School', 'La Folie Douce Val Thorens', 'Malaysia Bar']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Resort Representative', 'Chalet Host', 'Rental Shop Technician', 'Nightclub Staff']::text[], '1,500–2,500', ARRAY['French', 'English']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. UK, Australian, New Zealand, and Canadian citizens aged 18–30 (35 for some) can apply for a Working Holiday Visa (PVT) for France. Non-EU citizens otherwise need employer-sponsored work permits.', 'Club Med and hotel chains begin hiring in June–July. Ski schools recruit from August–September. Bar and restaurant jobs often filled September–November.',
  true, 800, 'EUR €350–€600/month shared',
  'EUR €200–€350 (housing, food, transport)', 'Free shuttle buses within the resort. Bus service to Moûtiers SNCF station (45 min). Lyon Airport 2.5 hrs, Geneva Airport 3 hrs by transfer.', ARRAY['Discounted or free season pass', 'Staff meals at employer venues', 'Pro deals on gear', 'Access to resort sports facilities', 'End-of-season events']::text[],
  'Lively party resort. La Folie Douce is the legendary on-mountain après venue. In the resort: Malaysia Bar (iconic), Le Frog, 360 Bar, Underground nightclub, and O''Connell''s Irish Pub. The compact resort means everything is walkable.', ARRAY['Off-piste and backcountry skiing', 'Snowshoeing', 'Ice diving (Lac du Lou)', 'Toboggan run (6km — longest in France)', 'Cross-country skiing', 'Paragliding', 'Indoor sports centre']::text[], 'Cabinet Médical de Val Thorens with doctors on-site. Pharmacy in the resort centre. Nearest hospital: Centre Hospitalier de Moûtiers (45 min by bus).', 'Sherpa supermarket, bakeries, tabac/newsagent, ski rental shops (Intersport, Skimium), ATMs, post office. Compact resort centre with all essentials.',
  'Large — very popular with British and Scandinavian seasonal workers. Strong tour operator presence. English commonly spoken alongside French.',
  -12, -2, 'high', 30
) ON CONFLICT DO NOTHING;

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
  '29', 'Méribel',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'France', 'The heart of Les 3 Vallées, Méribel is a family-friendly resort with traditional chalet-style architecture enforced by planning regulations. Central access to 600km of interconnected skiing. Hosted ice hockey and figure skating during the 1992 Albertville Winter Olympics.', 45.3967, 6.5658,
  'Savoie', 'Méribel', 'https://www.meribel.net', 'https://images.unsplash.com/photo-1548873903-d93dc8c9723e?w=1200&q=80',
  2400, 150, 30, 60, 42, 18,
  1450, 1400, 2952, 51, '{"gondolas":4,"chairlifts":24,"surface_lifts":23}'::jsonb,
  500, '2025-12-06', '2026-04-19',
  ARRAY['Méribel Alpina (lift company)', 'Hôtel Le Grand Coeur & Spa', 'Hôtel Allodis', 'Le Cœur de Cristal', 'ESF Méribel (ski school)', 'Snow Systems Ski School', 'Rond Point des Pistes (iconic bar)', 'UK tour operators (Ski Total, Mark Warner, Scott Dunn)']::text[], ARRAY['Chalet Host / Cook', 'Ski/Snowboard Instructor', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Nanny / Childcare', 'Resort Representative', 'Ski Technician', 'Maintenance Worker']::text[], '1,500–2,500', ARRAY['French', 'English']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. UK, Australian, New Zealand, and Canadian citizens aged 18–30 (35 for some) can apply for a Working Holiday Visa (PVT) for France. Non-EU citizens otherwise need employer-sponsored work permits.', 'UK tour operators recruit from May–July for chalet hosts and reps. Hotels hire July–September. Ski schools recruit September–October. Méribel is one of the best French resorts for English-speaking work due to high British clientele.',
  true, 1000, 'EUR €400–€700/month shared',
  'EUR €250–€400 (housing, food, transport)', 'Free resort shuttle buses throughout Méribel, Méribel-Mottaret, and Méribel Village. Bus to Moûtiers SNCF station (30 min). Geneva Airport 2.5 hrs, Lyon Airport 2.5 hrs.', ARRAY['Discounted or free season pass', 'Staff meals (chalets provide food)', 'Accommodation often included with chalet jobs', 'Pro deals on gear', 'Use of Olympic Centre facilities (pool, ice rink)']::text[],
  'The Rond Point des Pistes (known as ''Ronnie'') is one of the Alps'' most famous après bars — a sun-drenched terrace mid-mountain. In the village: Le Poste de Secours, Jack''s Bar, Barometer, O''Sullivans pub, and Scott''s Bar. Good nightlife for a family resort.', ARRAY['Ice skating (Olympic Ice Rink)', 'Swimming (Olympic Centre pool)', 'Snowshoeing', 'Cross-country skiing', 'Paragliding', 'Toboggan run', 'Spa and wellness (Forme d''O centre)']::text[], 'Medical centre in Méribel with doctors and physiotherapists. Pharmacy in the resort. Nearest hospital: Centre Hospitalier de Moûtiers (30 min).', 'Spar and Sherpa supermarkets, bakeries, banks, ATMs, post office, gear rental shops, and various boutiques. Both Méribel Centre and Méribel-Mottaret have essential services.',
  'Very large — Méribel has the highest concentration of British seasonal workers of any French resort. Extremely English-friendly. Strong Australian and New Zealand presence too.',
  -8, 1, 'high', 40
) ON CONFLICT DO NOTHING;

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
  '30', 'Courchevel',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'France', 'The most upscale resort in Les 3 Vallées, split across five villages at different altitudes (Le Praz 1300, Courchevel Village 1550, Moriond 1650, Courchevel 1850, and Courchevel Altitude 2000). Courchevel 1850 is famous for luxury hotels, Michelin-starred restaurants, and its own altiport for private planes.', 45.4155, 6.6348,
  'Savoie', 'Courchevel', 'https://www.courchevel.com', 'https://images.unsplash.com/photo-1548873903-a7e6aaea6495?w=1200&q=80',
  2400, 150, 30, 60, 40, 20,
  1450, 1300, 2738, 58, '{"gondolas":6,"chairlifts":28,"surface_lifts":24}'::jsonb,
  500, '2025-12-06', '2026-04-19',
  ARRAY['S3V (Société des 3 Vallées — lift operations)', 'L''Apogée Courchevel (Oetker Collection)', 'Hôtel Le K2 Palace', 'Cheval Blanc Courchevel (LVMH)', 'Les Airelles', 'Le Chabichou (Michelin-starred)', 'ESF Courchevel (ski school)', 'New Generation Ski School', 'UK tour operators (Scott Dunn, Consensio, Bramble Ski)']::text[], ARRAY['Chalet Host / Cook (luxury level)', 'Ski/Snowboard Instructor', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Sommelier / Wine Service', 'Bartender / Server', 'Spa Therapist', 'Concierge', 'Nanny / Private Childcare', 'Ski Technician']::text[], '2,500–4,000', ARRAY['French', 'English', 'Russian']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. UK, Australian, New Zealand, and Canadian citizens aged 18–30 (35 for some) can apply for a Working Holiday Visa (PVT) for France. Non-EU citizens otherwise need employer-sponsored work permits. Luxury hotels may sponsor visas for highly skilled staff.', 'Luxury hotels begin recruiting as early as May. Tour operators hire June–August. Ski schools September–October. Russian-speaking and multilingual candidates are in high demand.',
  true, 1500, 'EUR €450–€800/month shared',
  'EUR €300–€500 (housing, food, transport — expensive resort)', 'Free shuttle buses between all five villages. Bus to Moûtiers SNCF station (40 min). Courchevel Altiport for private aviation. Lyon Airport 2.5 hrs, Geneva Airport 2.5 hrs.', ARRAY['Discounted or free season pass', 'Staff meals at luxury hotels', 'Accommodation often included at palace-level hotels', 'Pro deals on gear', 'Tips can be substantial in luxury hospitality']::text[],
  'More refined than party resorts, befitting the luxury clientele. Le Mangeoire wine bar, La Table du Lana, Le Tremplin (piste-side terrace), Kalico nightclub, and Les Caves de Courchevel. At 1850: Le Cap Horn, Farinet. Michelin dining at Le 1947 (Cheval Blanc), Le Chabichou, and Baumanière 1850.', ARRAY['Snowshoeing', 'Cross-country skiing (Le Praz Nordic area)', 'Paragliding', 'Ice skating', 'Toboggan runs', 'Spa and wellness centres', 'Indoor climbing wall', 'Olympic ski jumping hill (Le Praz — hosted 1992 Olympics)']::text[], 'Medical centre in Courchevel 1850 with doctors and emergency care. Pharmacies in 1850 and 1650. Nearest hospital: Centre Hospitalier de Moûtiers (40 min).', 'Sherpa supermarket, luxury boutiques (Chanel, Louis Vuitton, Dior in 1850), banks, ATMs, bakeries, ski rental shops, and post office. Range of services varies by village altitude.',
  'Large — significant British, Russian, and Eastern European seasonal workforce. High demand for multilingual staff. Strong luxury hospitality network.',
  -8, 1, 'high', 40
) ON CONFLICT DO NOTHING;

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
  '31', 'Morzine / Avoriaz',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'France', 'Gateway to the massive Portes du Soleil ski area spanning France and Switzerland with 650km of linked pistes across 12 resorts. Morzine is a charming traditional Savoyard village at 1,000m, while Avoriaz is a purpose-built, car-free resort at 1,800m with striking brutalist architecture. Hugely popular with British seasonal workers.', 46.1797, 6.7092,
  'Haute-Savoie', 'Morzine', 'https://www.morzine-avoriaz.com', 'https://images.unsplash.com/photo-1665859223778-25a4e39b259e?w=1200&q=80',
  2600, 196, 34, 79, 56, 27,
  1000, 1000, 2277, 49, '{"gondolas":3,"chairlifts":25,"surface_lifts":21}'::jsonb,
  800, '2025-12-13', '2026-04-19',
  ARRAY['Serma (lift company, Morzine side)', 'Pierre & Vacances/Avoriaz (resort accommodation)', 'Hôtel Le Samoyède', 'Hôtel Le Dahu', 'ESF Morzine / ESF Avoriaz (ski schools)', 'BASS Morzine (British Alpine Ski School)', 'Mint Snowboarding', 'UK tour operators (Inghams, Esprit, Family Ski Company)', 'The Cavern Bar', 'Bec Jaune Brewery']::text[], ARRAY['Chalet Host / Cook', 'Ski/Snowboard Instructor', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Nanny / Childcare', 'Resort Representative', 'Transfer Driver', 'Maintenance Worker']::text[], '2,000–3,000', ARRAY['French', 'English']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. UK, Australian, New Zealand, and Canadian citizens aged 18–30 (35 for some) can apply for a Working Holiday Visa (PVT) for France. Non-EU citizens otherwise need employer-sponsored work permits.', 'Tour operators recruit from May–July. Hotels and bars hire August–October. Ski schools from September. Morzine is the easiest French resort for English speakers to find work due to the huge British community.',
  true, 1000, 'EUR €350–€600/month shared',
  'EUR €200–€350 (housing, food, transport — more affordable than high-altitude resorts)', 'Free shuttle bus in Morzine. Avoriaz is car-free (horse-drawn sleighs and snowcats). Regular bus to Thonon-les-Bains and Cluses SNCF stations. Geneva Airport only 1.5 hrs by transfer — closest major airport to any French resort.', ARRAY['Discounted or free season pass', 'Accommodation often included with chalet jobs', 'Staff meals provided', 'Pro deals on gear', 'Mountain biking in summer (Morzine is a major MTB hub)']::text[],
  'Very lively British-influenced après scene. In Morzine: The Cavern (live music), Bec Jaune Brewery (craft beer), Le Tremplin, Dixie Bar, Café Chaud, L''Opéra, and Tibetan Café. In Avoriaz: Le Yak, Shooters bar, and Le Fantastique. More relaxed than Val Thorens but still plenty of nightlife.', ARRAY['Snowshoeing', 'Cross-country skiing', 'Ice skating (outdoor rink)', 'Swimming (Morzine public pool)', 'Paragliding', 'Dog sledding', 'Aquariaz water park (Avoriaz)', 'Fat biking']::text[], 'Medical centre in Morzine centre with doctors and physiotherapists. Pharmacy in Morzine and Avoriaz. Nearest hospital: Centre Hospitalier du Léman in Thonon-les-Bains (40 min).', 'Spar and Carrefour Montagne supermarkets, bakeries, butchers, banks, ATMs, post office, numerous gear shops and rental outlets. Morzine has a real-town feel with year-round services.',
  'Very large — Morzine has one of the largest British expat/seasonal communities in the French Alps. English is spoken almost everywhere. Large Australian, New Zealand, and South African presence.',
  -6, 2, 'medium', 35
) ON CONFLICT DO NOTHING;

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
  '32', 'Les Arcs / La Plagne',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'France', 'Linked by the Vanoise Express cable car, Les Arcs and La Plagne form Paradiski — 425km of pistes across two major ski areas. La Plagne is the most visited resort in the world by skier visits. Les Arcs has four altitude villages (1600, 1800, 1950, 2000) and is famous for speed skiing and the film ''Les Bronzés font du ski.''', 45.5733, 6.8283,
  'Savoie', 'Bourg-Saint-Maurice', 'https://www.lesarcs.com', 'https://images.unsplash.com/photo-1692869344214-c45779feb9be?w=1200&q=80',
  1700, 258, 44, 103, 77, 34,
  2050, 1200, 3250, 77, '{"gondolas":5,"chairlifts":38,"surface_lifts":34}'::jsonb,
  600, '2025-12-13', '2026-04-26',
  ARRAY['ADS (Arc Développement et Services — Les Arcs lift company)', 'SAP (Société d''Aménagement de La Plagne — La Plagne lifts)', 'Club Med La Plagne 2100', 'Pierre & Vacances (multiple residences)', 'Hôtel Taj-I Mah (Les Arcs 2000)', 'ESF Les Arcs / ESF La Plagne (ski schools)', 'Spirit Ski School', 'UK tour operators (Inghams, Crystal, Esprit)']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel / Residence Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Resort Representative', 'Chalet Host', 'Kids Club Animator', 'Snowmaker / Pisteur']::text[], '3,000–5,000', ARRAY['French', 'English']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. UK, Australian, New Zealand, and Canadian citizens aged 18–30 (35 for some) can apply for a Working Holiday Visa (PVT) for France. Non-EU citizens otherwise need employer-sponsored work permits.', 'Club Med recruits globally from May. Tour operators June–August. Lift company and ski schools August–October. Large volume of seasonal positions across the combined resort.',
  true, 1500, 'EUR €300–€600/month shared',
  'EUR €200–€350 (housing, food, transport)', 'Free shuttle buses within each village. Funicular from Bourg-Saint-Maurice to Arc 1600 (7 min). Eurostar direct to Bourg-Saint-Maurice in winter. SNCF connections via Moûtiers. Lyon Airport 3 hrs, Geneva Airport 3 hrs.', ARRAY['Discounted or free season pass', 'Staff meals at Club Med / hotels', 'Accommodation often included with tour operator roles', 'Pro deals on gear', 'Access to resort swimming pools and fitness centres']::text[],
  'Les Arcs 1800: Red Hot Saloon, Chalet de Luigi. Les Arcs 1950: O''Chaud bar. La Plagne Centre: Saloon Bar, No Name Bar, Mine Bar. La Plagne Bellecôte: Malt & Co. Less wild than Val d''Isère or Val Thorens but still good fun.', ARRAY['Snowshoeing', 'Cross-country skiing', 'Olympic bobsled run (La Plagne — public rides available)', 'Paragliding', 'Ice climbing', 'Dog sledding', 'Speed skiing (Les Arcs — birthplace of the sport)']::text[], 'Medical centres in Les Arcs 1800 and La Plagne Centre with doctors and emergency care. Pharmacies in multiple villages. Nearest hospital: Centre Hospitalier de Bourg-Saint-Maurice (15 min from Les Arcs).', 'Sherpa and Spar supermarkets in multiple villages. Bakeries, ski rental shops, ATMs, tabac. Bourg-Saint-Maurice (valley town) has larger supermarkets (Intermarché) and more services.',
  'Large — significant British and Scandinavian seasonal worker populations in both Les Arcs and La Plagne. Club Med brings international staff from around the world.',
  -10, 0, 'high', 35
) ON CONFLICT DO NOTHING;

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
  '4', 'Zermatt',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'Switzerland', 'Ski beneath the iconic Matterhorn with year-round glacier skiing. Zermatt is one of the highest and most famous ski resorts in Switzerland, offering stunning views, a car-free village, and access to the international Matterhorn ski paradise shared with Cervinia, Italy.', 46.0207, 7.7491,
  'Valais', 'Zermatt', 'https://www.zermatt.ch', 'https://images.unsplash.com/photo-1676048746226-113269dd8084?w=1200&q=80',
  1420, 145, 25, 55, 45, 20,
  2200, 1620, 3883, 52, '{"gondolas":8,"chairlifts":21,"surface_lifts":23}'::jsonb,
  500, '2025-10-01', '2026-05-01',
  ARRAY['Zermatt Bergbahnen AG (lift company)', 'Grand Hotel Zermatterhof', 'The Omnia Hotel', 'Mont Cervin Palace', 'Restaurants & bars in the village']::text[], ARRAY['Hotel Staff (reception, housekeeping)', 'Chef / Kitchen Staff', 'Bartender / Server', 'Ski Instructor', 'Retail Sales', 'Spa Staff']::text[], '2,000–4,000', ARRAY['German', 'English', 'French']::text[],
  'EU/EFTA citizens can work freely. Non-EU citizens face strict Swiss work permit requirements — employer sponsorship is difficult but possible for specialized roles.', 'Hiring begins as early as June for the winter season. Multilingual candidates are strongly preferred.',
  true, 1000, 'CHF 600–1,200/month shared',
  'CHF 400–600 (expensive — Switzerland cost of living)', 'Car-free village — electric taxis and buses only. Matterhorn Gotthard Bahn train to Visp (1 hr) connects to Swiss rail network. Zurich/Geneva airports 3–4 hrs.', ARRAY['Discounted season pass', 'Staff meals at hotels', 'Accommodation sometimes included']::text[],
  'Upscale après-ski at Hennu Stall, Elsie''s Wine & Champagne Bar, and Papperla Pub. More relaxed than party resorts — Zermatt skews luxury.', ARRAY['Glacier hiking', 'Ice climbing', 'Snowshoeing', 'Tobogganing', 'Gorner Gorge walks']::text[], 'Spital Zermatt (clinic with emergency services). Visp hospital 1 hr by train.', 'Coop and Migros supermarkets, banks, gear shops, bakeries. Everything within the pedestrian village.',
  'Moderate — significant Portuguese and seasonal European workforce. Growing number of Anglophone workers.',
  -12, -2, 'high', 30
) ON CONFLICT DO NOTHING;

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
  '33', 'Verbier',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'Switzerland', 'Part of the 4 Vallées ski area with 410km of pistes, Verbier is known for its steep off-piste terrain (especially the legendary Mont Fort itineraries and the Bec des Rosses — venue for the Freeride World Tour finals), sun-drenched south-facing slopes, and vibrant party scene. One of Switzerland''s most popular resorts for young seasonal workers.', 46.0967, 7.2283,
  'Valais', 'Verbier', 'https://www.verbier.ch', 'https://images.unsplash.com/photo-1676048746230-0c11ed158c78?w=1200&q=80',
  1650, 192, 20, 72, 68, 32,
  1893, 1500, 3330, 82, '{"gondolas":6,"chairlifts":28,"surface_lifts":48}'::jsonb,
  500, '2025-11-22', '2026-04-27',
  ARRAY['Téléverbier (lift company)', 'W Verbier Hotel', 'Hôtel Montpelier', 'Hôtel Nendaz 4 Vallées', 'European Snowsport Verbier (ski school)', 'Altitude Ski School', 'Warren Smith Ski Academy', 'Pub Mont Fort (iconic bar)', 'Chalet companies (Ski Verbier, Verbier Exclusive)']::text[], ARRAY['Ski/Snowboard Instructor', 'Chalet Host / Cook', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Nanny / Childcare', 'Ski Technician', 'Resort Representative', 'Snowmaker / Pisteur']::text[], '1,500–2,500', ARRAY['French', 'English']::text[],
  'EU/EFTA citizens can work freely. Non-EU citizens require a Swiss L-permit (short-stay permit for seasonal work up to 12 months), which requires employer sponsorship. Swiss work permits are notoriously competitive and limited in number. UK citizens post-Brexit need L-permits. Some employers in hospitality can secure permits for qualified staff.', 'Ski schools and chalet companies begin recruiting June–August. Hotels from July–September. Bar and nightlife positions from September. Verbier is very popular with English-speaking workers.',
  true, 900, 'CHF 700–1,200/month shared',
  'CHF 400–600 (expensive — Swiss cost of living)', 'Free ski bus within Verbier and to Le Châble. Le Châble has a train station on the Saint-Bernard Express line connecting to Martigny (30 min) and the Swiss rail network. Geneva Airport 2 hrs by car/transfer.', ARRAY['Discounted season pass', 'Staff meals at hotels/chalets', 'Accommodation sometimes included with chalet jobs', 'Pro deals on gear', 'Tips at high-end chalets']::text[],
  'Verbier is famous for its après-ski and nightlife, rivalling St. Anton. Pub Mont Fort (legendary terrace on the piste) is the iconic après spot. In the village: Fer à Cheval, Rouge Bar, Crock No Name, Le Farinet nightclub, Casbah Club. T-Bar on the mountain. Verbier attracts a young, international party crowd.', ARRAY['Freeride skiing and backcountry touring', 'Snowshoeing', 'Ice climbing', 'Paragliding', 'Cross-country skiing', 'Spa and wellness', 'Helicopter skiing']::text[], 'Centre Médical de Verbier with doctors and emergency care. Pharmacy in the resort centre. Nearest hospital: Hôpital du Valais at Martigny (45 min) or Sion (1 hr).', 'Migros and Denner supermarkets, bakeries, banks, ATMs, post office, ski rental shops, and boutiques. Le Châble (valley station) has a Migros and additional services.',
  'Very large — Verbier has one of the largest British and international seasonal worker communities in Switzerland. Very English-friendly. Strong Australian, Swedish, and New Zealand presence.',
  -10, -1, 'high', 25
) ON CONFLICT DO NOTHING;

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
  '34', 'St. Moritz',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'Switzerland', 'The birthplace of Alpine winter tourism and host of two Winter Olympics (1928 and 1948). St. Moritz is synonymous with luxury, boasting a champagne climate with 300+ days of sunshine per year. Home to the famous Cresta Run bobsled track, White Turf horse races on the frozen lake, and the Engadin cross-country skiing marathon. Skiing spans Corviglia, Corvatsch, and Diavolezza areas.', 46.4908, 9.8355,
  'Graubünden', 'St. Moritz', 'https://www.stmoritz.com', 'https://images.unsplash.com/photo-1644335785854-2acd1f649fc0?w=1200&q=80',
  880, 88, 12, 36, 28, 12,
  1469, 1822, 3303, 56, '{"gondolas":5,"chairlifts":18,"surface_lifts":33}'::jsonb,
  450, '2025-11-15', '2026-04-13',
  ARRAY['Engadin St. Moritz Mountains AG (lift company)', 'Badrutt''s Palace Hotel', 'Kulm Hotel St. Moritz', 'Suvretta House', 'Carlton Hotel St. Moritz', 'Kempinski Grand Hotel des Bains', 'Swiss Ski and Snowboard School St. Moritz', 'Restaurants & bars in Dorf and Bad']::text[], ARRAY['Hotel Receptionist / Concierge', 'Housekeeping', 'Chef / Kitchen Staff (fine dining)', 'Sommelier / Wine Service', 'Bartender / Server', 'Spa Therapist', 'Ski Instructor', 'Retail Sales (luxury boutiques)', 'Maintenance / Engineering']::text[], '2,000–3,500', ARRAY['German', 'English', 'Italian']::text[],
  'EU/EFTA citizens can work freely. Non-EU citizens require a Swiss L-permit (short-stay permit for seasonal work up to 12 months), which requires employer sponsorship. Luxury palace hotels may sponsor permits for experienced hospitality professionals. UK citizens post-Brexit need L-permits.', 'Palace hotels begin recruiting in June–July for winter season. Ski schools from August. Multilingual candidates (German/English/Italian plus French or Russian) are in very high demand.',
  true, 1200, 'CHF 800–1,400/month shared',
  'CHF 450–700 (very expensive — one of Switzerland''s priciest locations)', 'Engadin Bus network within St. Moritz and the Upper Engadin valley. Rhaetian Railway (Rhätische Bahn) — the scenic Bernina Express and Glacier Express routes pass through. Zurich Airport 3.5 hrs by train. Engadin Airport for private aviation.', ARRAY['Discounted season pass', 'Staff meals at palace hotels', 'Accommodation sometimes included at top hotels', 'Tips in luxury hospitality can be significant', 'Access to hotel spa/fitness facilities']::text[],
  'Elegant rather than rowdy. Roo Bar (Badrutt''s Palace) is one of the most exclusive après-ski bars in the Alps. Bobby''s Pub for a more casual pint. Dracula Club (legendary private members'' nightclub founded by Gunter Sachs). La Marmite Food Festival in January. King''s Club at Badrutt''s Palace for nightlife. Muottas Muragl sunset terrace.', ARRAY['Cresta Run (bobsled — SMTC members)', 'Olympic Bob Run (public rides available)', 'Cross-country skiing (Engadin — 200km of trails)', 'Ice skating (frozen lake)', 'Snowshoeing', 'Horse-drawn sleigh rides', 'Snow polo and cricket on frozen lake', 'White Turf horse racing (February)', 'Spa and wellness (Ovaverva public pool & spa)']::text[], 'Spital Oberengadin (hospital) in Samedan, 5 min from St. Moritz, with 24/7 emergency services. Multiple doctors'' practices and pharmacies in St. Moritz Dorf and Bad.', 'Coop and Volg supermarkets. Luxury boutiques along Via Serlas (Cartier, Bulgari, Prada, Louis Vuitton). Banks, ATMs, post office, gear shops. Full-service town with year-round amenities.',
  'Moderate — significant Portuguese, Italian, and Eastern European seasonal workforce. Growing number of English-speaking workers. Less backpacker-oriented than Verbier; more career hospitality professionals.',
  -15, -3, 'high', 40
) ON CONFLICT DO NOTHING;

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
  '35', 'St. Anton am Arlberg',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'Austria', 'The birthplace of alpine skiing, St. Anton is part of the Ski Arlberg area — Austria''s largest interconnected ski region with 305km of marked runs and 200km of off-piste routes linking St. Anton, Lech, Zürs, Stuben, and Warth-Schröcken. Legendary for its challenging terrain, deep powder, and arguably the most famous après-ski scene in the world.', 47.1292, 10.2683,
  'Tyrol', 'St. Anton', 'https://www.stantonamarlberg.com', 'https://images.unsplash.com/photo-1635721980613-684353ae88dd?w=1200&q=80',
  1220, 131, 15, 47, 46, 23,
  1507, 1304, 2811, 88, '{"gondolas":4,"chairlifts":47,"surface_lifts":37}'::jsonb,
  700, '2025-12-05', '2026-04-26',
  ARRAY['Arlberger Bergbahnen (lift company)', 'Hotel Hospiz Alm', 'Hotel Schwarzer Adler', 'Hotel Arlberg', 'Ski School Arlberg (oldest ski school in the world)', 'Skischule St. Anton', 'MooserWirt (iconic après bar)', 'Krazy Kanguruh (après bar)', 'Hotel Galzig']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'DJ / Entertainment', 'Ski Technician', 'Snowmaker / Pisteur', 'Retail Sales']::text[], '2,000–3,500', ARRAY['German', 'English']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Austrian seasonal worker permit (Saisonnier), which requires employer sponsorship and is quota-limited. Austria has bilateral agreements with some countries for seasonal work. UK citizens post-Brexit require work permits.', 'Hotels and lift companies begin hiring in July–August. Ski schools from August–September. Bar and restaurant positions from September–November. German language skills give a significant advantage.',
  true, 1500, 'EUR €300–€550/month shared',
  'EUR €200–€350 (housing, food, transport)', 'St. Anton has a train station on the Arlberg railway line (ÖBB) with direct connections to Innsbruck (75 min), Zurich (3 hrs), and Vienna. Free ski bus between villages in the Ski Arlberg area. Innsbruck Airport 1.5 hrs.', ARRAY['Discounted or free season pass', 'Staff meals at hotels', 'Accommodation often provided or subsidised by employer', 'Pro deals on gear', 'Tips at bars can be very good']::text[],
  'Arguably the world''s most famous après-ski scene. MooserWirt is the legendary après bar — standing on tables in ski boots from 3pm. Krazy Kanguruh (on the piste) is equally iconic. In the village: Piccadilly pub, Scotty''s Bar, Bar Cuba, Kandahar Bar, Griabli underground club, and Posthörnchen nightclub. The après culture is a core part of the St. Anton experience.', ARRAY['Off-piste and backcountry skiing', 'Snowshoeing', 'Cross-country skiing (Verwall valley)', 'Tobogganing', 'Ice climbing', 'Winter hiking', 'Swimming (Arlberg WellCom leisure centre)']::text[], 'Ärztezentrum St. Anton (medical centre) with doctors and emergency care. Pharmacy in the village. Nearest hospital: Krankenhaus Zams (30 min) or Landeskrankenhaus Innsbruck (75 min).', 'Spar and MPreis supermarkets, bakeries, banks, ATMs, post office, gear shops (Strolz flagship store — famous for custom ski boots), and various boutiques along the pedestrian zone.',
  'Very large — St. Anton attracts thousands of international seasonal workers each year, particularly from the UK, Scandinavia, Australia, and Germany. Very English-friendly. One of the most international Austrian resorts.',
  -10, 0, 'high', 25
) ON CONFLICT DO NOTHING;

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
  '36', 'Kitzbühel',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'Austria', 'A medieval walled town and one of Austria''s most famous resorts. Home to the legendary Hahnenkamm Streif downhill race — the most dangerous and prestigious course in World Cup alpine skiing, held every January. Beautiful pastel-coloured historic town centre with upscale shopping and dining. The skiing spans Kitzbühel, Kirchberg, and surrounding areas with 170km of runs.', 47.4467, 12.3919,
  'Tyrol', 'Kitzbühel', 'https://www.kitzbuehel.com', 'https://images.unsplash.com/photo-1548075263-f345eba55f65?w=1200&q=80',
  680, 170, 25, 68, 51, 26,
  1200, 800, 2000, 57, '{"gondolas":6,"chairlifts":25,"surface_lifts":26}'::jsonb,
  500, '2025-10-25', '2026-04-13',
  ARRAY['Bergbahn AG Kitzbühel (lift company)', 'Grand Tirolia Hotel', 'Hotel Zur Tenne', 'A-ROSA Kitzbühel', 'Hotel Schwarzer Adler', 'Skischule Rote Teufel (Red Devils ski school)', 'Element3 Ski School', 'Londoner Pub (famous après bar)', 'Kitzbühel Country Club']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Spa Therapist', 'Retail Sales', 'Ski Technician', 'Events Staff (Hahnenkamm race week)']::text[], '1,500–2,500', ARRAY['German', 'English']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Austrian seasonal worker permit (Saisonnier), which requires employer sponsorship and is quota-limited. UK citizens post-Brexit require work permits.', 'Hotels begin recruiting July–August. Ski schools from August–September. Bar and restaurant work from September–October. Hahnenkamm race week (late January) creates additional short-term work opportunities.',
  true, 1000, 'EUR €350–€600/month shared',
  'EUR €250–€400 (housing, food, transport)', 'Kitzbühel has a train station on the ÖBB line with connections to Innsbruck (1 hr), Salzburg (2.5 hrs), and Munich (2 hrs). Free ski bus between Kitzbühel, Kirchberg, and surrounding villages. Innsbruck Airport 1.5 hrs, Salzburg Airport 2 hrs.', ARRAY['Discounted season pass', 'Staff meals at hotels', 'Accommodation often provided or subsidised', 'Pro deals on gear', 'Access to Aquarena swimming pool']::text[],
  'Stylish après scene befitting the upscale town. The Londoner pub is a Kitzbühel institution for après drinks. Stanglwirt (celebrity hangout during Hahnenkamm week, 10 min out of town). Highways Bar, Pavillon, Praxmair Café, Stamperl Bar. Hahnenkamm race week in January is the social event of the Austrian ski season — massive parties and celebrity sightings.', ARRAY['Tobogganing', 'Cross-country skiing (extensive Loipen network)', 'Ice skating', 'Winter hiking (cleared paths)', 'Swimming (Aquarena centre)', 'Curling', 'Horse-drawn sleigh rides', 'Casino Kitzbühel']::text[], 'Krankenhaus St. Johann in Tirol (hospital, 10 km). Multiple doctors'' practices and pharmacies in Kitzbühel town centre. Mountain rescue (Bergrettung) well-established.', 'Spar and MPreis supermarkets. Upscale boutiques in the medieval town centre (Vorderstadt pedestrian zone). Banks, ATMs, bakeries, post office, gear shops. Full year-round town with all services.',
  'Moderate — mostly German-speaking seasonal workers from Germany and Austria. Growing British and Scandinavian presence. Less backpacker-oriented than St. Anton; more upscale hospitality focus.',
  -8, 1, 'medium', 60
) ON CONFLICT DO NOTHING;

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
  '37', 'Ischgl',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'Austria', 'Linked with Samnaun in Switzerland, Ischgl is known as the ''Ibiza of the Alps'' for its legendary après-ski parties and end-of-season concerts featuring major international acts (past performers: Elton John, Robbie Williams, Tina Turner). The Silvretta Arena offers 239km of runs with reliable snow and extensive duty-free shopping across the Swiss border in Samnaun.', 47.0167, 10.2833,
  'Tyrol', 'Ischgl', 'https://www.ischgl.com', 'https://images.unsplash.com/photo-1640093339706-3d40d8f0a4ab?w=1200&q=80',
  920, 145, 20, 58, 44, 23,
  1360, 1400, 2872, 45, '{"gondolas":3,"chairlifts":24,"surface_lifts":18}'::jsonb,
  600, '2025-11-27', '2026-05-01',
  ARRAY['Silvrettaseilbahn AG (lift company)', 'Hotel Trofana Royal (5-star)', 'Hotel Madlein', 'Hotel Elisabeth', 'Skischule Ischgl', 'Kuhstall (iconic après bar)', 'Trofana Alm', 'Pacha Ischgl (nightclub)', 'Duty-free shops in Samnaun']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'DJ / Entertainment', 'Ski Technician', 'Retail Sales (duty-free)', 'Snowmaker / Pisteur']::text[], '1,500–2,500', ARRAY['German', 'English']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Austrian seasonal worker permit (Saisonnier), which requires employer sponsorship and is quota-limited. UK citizens post-Brexit require work permits.', 'Hotels and the lift company begin recruiting in July–August. Bars and nightclubs from August–September. Ski schools from September. German language strongly preferred but English-only positions exist in hospitality.',
  true, 800, 'EUR €300–€500/month shared (often employer-provided)',
  'EUR €200–€350 (housing, food, transport)', 'Free ski bus within Ischgl and to neighbouring villages (Galtür, Kappl, See). Nearest train station: Landeck-Zams (30 min by bus). Innsbruck Airport 1.5 hrs. Zurich Airport 3 hrs.', ARRAY['Discounted or free season pass', 'Staff meals at hotels', 'Accommodation often provided by employer', 'Pro deals on gear', 'Duty-free shopping in Samnaun (alcohol, tobacco, perfume)']::text[],
  'World-class party scene — Ischgl takes its nightlife as seriously as its skiing. Kuhstall is the iconic après bar, packed from 3pm. Trofana Alm, Schatzi Bar, Niki''s Stadl, Fire & Ice bar. Pacha nightclub (linked to the Ibiza brand). The season-opening ''Top of the Mountain'' concert and closing concert draw 20,000+ people. Free concerts throughout the season at Idalp.', ARRAY['Duty-free shopping in Samnaun (Switzerland)', 'Snowshoeing', 'Cross-country skiing', 'Tobogganing', 'Ice skating', 'Winter hiking', 'Silvretta Spa (Trofana Royal)']::text[], 'Ärztezentrum Ischgl (medical centre) with doctors and emergency services. Pharmacy in the village. Nearest hospital: Krankenhaus Zams (30 min).', 'Spar supermarket, bakeries, banks, ATMs, gear shops, and boutiques in Ischgl. Duty-free shops in Samnaun across the Swiss border (ski over for cheap alcohol, perfume, electronics).',
  'Moderate — predominantly German and Austrian seasonal workforce with growing numbers of Eastern European workers. Smaller English-speaking community than St. Anton but positions available for English speakers in hospitality.',
  -10, -1, 'high', 40
) ON CONFLICT DO NOTHING;

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
  '38', 'Sölden',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'Austria', 'Austria''s premier glacier resort with two glacier ski areas above 3,000m (Rettenbach and Tiefenbach glaciers) and one of the longest seasons in the Alps. Famous as a James Bond filming location (Spectre — the ice Q restaurant at Gaislachkogl). Hosts the opening FIS Alpine World Cup race of each season in late October. Part of the Ötztal valley.', 46.9656, 10.8758,
  'Tyrol', 'Sölden', 'https://www.soelden.com', 'https://images.unsplash.com/photo-1681719940438-2363caac70ad?w=1200&q=80',
  600, 144, 20, 58, 44, 22,
  1870, 1350, 3340, 31, '{"gondolas":4,"chairlifts":15,"surface_lifts":12}'::jsonb,
  500, '2025-10-17', '2026-05-03',
  ARRAY['Bergbahnen Sölden (Ötztal Tourismus — lift company)', 'Hotel Das Central', 'Hotel Bergland', 'Hotel Stefan', 'Skischule Sölden-Hochsölden', 'Yellow Power Ski School', 'ice Q restaurant (Gaislachkogl summit)', 'Bierhimml (après bar)', 'Fire & Ice (bar/nightclub)']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'DJ / Entertainment', 'Ski Technician', 'Snowmaker / Pisteur', 'Events Staff (World Cup race)']::text[], '1,500–2,500', ARRAY['German', 'English']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Austrian seasonal worker permit (Saisonnier), which requires employer sponsorship and is quota-limited. UK citizens post-Brexit require work permits.', 'Lift company and hotels begin recruiting July–August for the early October glacier opening. Ski schools from August. Bar and restaurant positions from September–October. The early season (October) requires staff before most other Austrian resorts.',
  true, 900, 'EUR €280–€500/month shared (often employer-provided)',
  'EUR €200–€350 (housing, food, transport)', 'Free ski bus within Sölden and the Ötztal valley. Bus to Ötztal Bahnhof train station (45 min) connecting to the Innsbruck–Bregenz ÖBB line. Innsbruck Airport 1.5 hrs.', ARRAY['Discounted or free season pass', 'Staff meals at hotels/restaurants', 'Accommodation often provided by employer', 'Pro deals on gear', 'Access to Freizeit Arena (pool, sauna, gym)']::text[],
  'Boisterous Austrian après scene. Bierhimml (on the Giggijoch piste) is the main après venue — live music from 2pm. In the village: Fire & Ice (bar/nightclub), Philipp Bar, Marco''s Schirmbar, Almrausch, and Katapult. Electric Mountain Festival brings DJs to the glacier. The James Bond 007 Elements museum and ice Q restaurant on the Gaislachkogl are unique attractions.', ARRAY['Glacier skiing (Rettenbach & Tiefenbach)', 'Snowshoeing', 'Cross-country skiing', 'Ice skating', 'Tobogganing', 'Winter hiking', 'Swimming (Freizeit Arena leisure centre)', '007 Elements museum visit', 'Aqua Dome thermal spa (Längenfeld, 15 min)']::text[], 'Ärztezentrum Sölden (medical centre) with doctors and emergency care. Pharmacy in the village. Nearest hospital: Krankenhaus Zams (50 min) or Landeskrankenhaus Innsbruck (1.5 hrs).', 'Spar and MPreis supermarkets, bakeries, banks, ATMs, gear shops, post office. Sölden is a proper valley town with year-round services. Innsbruck for major shopping (1.5 hrs).',
  'Moderate — mostly German and Austrian seasonal workers. Growing international community, particularly Dutch, Scandinavian, and British. English widely understood in tourist-facing roles.',
  -12, -2, 'high', 35
) ON CONFLICT DO NOTHING;

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
  '39', 'Mayrhofen',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'Austria', 'Located at the head of the Zillertal valley, Mayrhofen is known for the extreme Harakiri piste (Austria''s steepest groomed run at 78% gradient), the Hintertux Glacier for year-round skiing, and the annual Snowbombing music festival — Europe''s biggest snow and music festival. The Penken and Ahorn ski areas offer 142km of runs with a further 60km at Hintertux.', 47.1592, 11.8617,
  'Tyrol', 'Mayrhofen', 'https://www.mayrhofen.at', 'https://images.unsplash.com/photo-1710197094645-f3c606391039?w=1200&q=80',
  551, 142, 18, 57, 43, 24,
  1820, 630, 2500, 58, '{"gondolas":4,"chairlifts":26,"surface_lifts":28}'::jsonb,
  500, '2025-12-06', '2026-04-13',
  ARRAY['Mayrhofner Bergbahnen (lift company)', 'Hotel Strass', 'Hotel Neuhaus', 'Elisabeth Hotel', 'Sporthotel Manni', 'Skischule Mayrhofen Total', 'SMT Mayrhofen (Ski & Snowboard School)', 'Bruck''n Stadl (après bar)', 'Ice Bar Mayrhofen']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'DJ / Entertainment (Snowbombing)', 'Ski Technician', 'Retail Sales', 'Snowmaker / Pisteur']::text[], '1,200–2,000', ARRAY['German', 'English']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Austrian seasonal worker permit (Saisonnier), which requires employer sponsorship and is quota-limited. UK citizens post-Brexit require work permits.', 'Hotels begin recruiting July–August. Ski schools from August–September. Bars and restaurants from September–October. Snowbombing festival week (April) creates additional short-term work opportunities.',
  true, 700, 'EUR €250–€450/month shared (often employer-provided)',
  'EUR €180–€320 (housing, food, transport — more affordable than bigger resorts)', 'Zillertalbahn narrow-gauge railway runs from Mayrhofen to Jenbach (1 hr), connecting to ÖBB mainline (Innsbruck 1.5 hrs). Free ski bus throughout the Zillertal valley. Innsbruck Airport 1.5 hrs.', ARRAY['Discounted or free season pass (Zillertaler Superskipass covers entire valley)', 'Staff meals at hotels', 'Accommodation often provided by employer', 'Pro deals on gear', 'Snowbombing festival access for resort workers']::text[],
  'Lively British and young-crowd-oriented après scene. Bruck''n Stadl is the main après bar with live music and DJs. Ice Bar (outdoor bar made of ice). Scotland Yard pub, Yeti Bar, Mo''s Bar, Speak Easy. Snowbombing festival in April transforms the resort with street parties, igloo raves, enchanted forest parties, and international DJ sets — unique in the Alps.', ARRAY['Hintertux Glacier (year-round skiing, 15 min away)', 'Snowshoeing', 'Tobogganing', 'Ice skating', 'Winter hiking', 'Swimming (Erlebnisbad Mayrhofen pool)', 'Paragliding', 'Nature Ice Palace (Hintertux Glacier)']::text[], 'Ärztezentrum Mayrhofen (medical centre) with doctors and emergency care. Pharmacy in the village. Nearest hospital: Bezirkskrankenhaus Schwaz (40 min).', 'Spar and MPreis supermarkets, bakeries, banks, ATMs, post office, gear shops, and various local shops. Mayrhofen is a proper Tyrolean village with year-round services.',
  'Large — Mayrhofen is very popular with British, Dutch, and Scandinavian seasonal workers. The Snowbombing connection means a strong UK presence. English widely spoken.',
  -8, 1, 'high', 45
) ON CONFLICT DO NOTHING;

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
  '40', 'Livigno',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'Italy', 'A duty-free resort town (since 1910, by Napoleonic decree) high in the Italian Alps near the Swiss border at 1,816m. Known for excellent snow reliability, world-class terrain parks (Mottolino and Carosello 3000), and budget-friendly shopping. Hosted freestyle skiing and snowboard events at the 2026 Milan-Cortina Winter Olympics.', 46.5389, 10.1358,
  'Lombardy', 'Livigno', 'https://www.livigno.eu', 'https://images.unsplash.com/photo-1710197232572-13e1ace07d16?w=1200&q=80',
  470, 115, 20, 46, 34, 15,
  1092, 1816, 2798, 30, '{"gondolas":3,"chairlifts":14,"surface_lifts":13}'::jsonb,
  550, '2025-11-29', '2026-04-19',
  ARRAY['APT Livigno (tourism board / lift management)', 'Mottolino Fun Mountain (lift/park operations)', 'Carosello 3000 (lift operations)', 'Hotel Lac Salin Spa & Mountain Resort', 'Hotel Touring', 'Scuola Italiana Sci Livigno (ski school)', 'Centrale Ski School', 'Duty-free shops (perfume, electronics, alcohol)', 'Kosmo nightclub']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Retail Sales (duty-free shops)', 'Ski Technician', 'Terrain Park Crew', 'Snowmaker / Pisteur']::text[], '1,200–2,000', ARRAY['Italian', 'English']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship. Italy has seasonal work quotas (decreto flussi). UK citizens post-Brexit require work permits.', 'Hotels and ski schools begin recruiting August–September. Shops and bars from September–October. Italian language is a strong advantage but English-only positions exist, especially in ski schools and international-facing roles.',
  true, 600, 'EUR €300–€500/month shared',
  'EUR €150–€300 (housing, food, transport — duty-free makes Livigno affordable)', 'Free ski bus throughout Livigno. Bus to Bormio (40 min) and Tirano train station (1.5 hrs, connecting to Bernina Express). Milan Malpensa Airport 3.5 hrs. Innsbruck Airport 3 hrs. Access via Munt La Schera tunnel (from Switzerland) or Foscagno Pass.', ARRAY['Discounted or free season pass', 'Staff meals at hotels/restaurants', 'Duty-free shopping (alcohol, tobacco, perfume, electronics at reduced prices)', 'Pro deals on gear', 'Access to Aquagranda Active You! (pool, spa, fitness)']::text[],
  'Fun, youthful après scene. Mottolino''s Tea del Vidal is the main on-mountain après spot (DJs and dancing on the terrace). In town: Kosmo nightclub (Livigno''s main club), Stalet Pub, Daphne''s, Marco''s Pub, and Helvetia Bar. The duty-free status means cheap drinks compared to other Alpine resorts.', ARRAY['Terrain park riding (Mottolino — one of Europe''s best parks)', 'Cross-country skiing (extensive trails)', 'Snowshoeing', 'Fat biking', 'Dog sledding', 'Ice skating', 'Swimming (Aquagranda Active You! centre)', 'Duty-free shopping']::text[], 'Ambulatorio Medico Livigno (medical centre) with doctors. Pharmacy in the town centre. Nearest hospital: Ospedale di Sondalo (1 hr) or Ospedale di Bormio (40 min for emergencies).', 'Multiple duty-free shops selling electronics, perfume, alcohol, tobacco at reduced prices. Eurospin and Conad supermarkets, bakeries, banks, ATMs, post office, gear shops. The duty-free shopping is a major draw.',
  'Moderate — growing international community, particularly Eastern European workers. Italian remains the dominant language. Smaller English-speaking community than French or Austrian resorts but increasing due to 2026 Olympics profile.',
  -12, -2, 'high', 50
) ON CONFLICT DO NOTHING;

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
  '41', 'Cortina d''Ampezzo',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'Italy', 'The ''Queen of the Dolomites'' and host of the 1956 Winter Olympics. Cortina is a glamorous Italian resort surrounded by UNESCO World Heritage Dolomite peaks with stunning vertical rock walls. Co-hosted the 2026 Winter Olympics with Milan (alpine skiing events). Part of the Dolomiti Superski area, the world''s largest ski carousel. Five separate ski areas: Tofana, Faloria-Cristallo, Cinque Torri/Lagazuoi, Misurina, and San Vito.', 46.5369, 12.1356,
  'Veneto', 'Cortina d''Ampezzo', 'https://www.dolomitisuperski.com', 'https://images.unsplash.com/photo-1715534098660-2978255e70b7?w=1200&q=80',
  520, 120, 18, 48, 36, 18,
  1680, 1224, 2932, 38, '{"gondolas":4,"chairlifts":18,"surface_lifts":16}'::jsonb,
  430, '2025-11-29', '2026-04-05',
  ARRAY['Cortina Skyline (new linked lift system for 2026 Olympics)', 'Cristallo, a Luxury Collection Resort & Spa', 'Grand Hotel Savoia', 'Hotel de la Poste', 'Rosapetra Spa Resort', 'Scuola Sci Cortina (ski school)', 'Scuola Sci Azzurra Cortina', 'Corso Italia boutiques and restaurants']::text[], ARRAY['Ski/Snowboard Instructor', 'Hotel Receptionist / Concierge', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Spa Therapist', 'Retail Sales (luxury boutiques)', 'Lift Operator', 'Ski Technician', 'Events Staff (Olympics legacy events)']::text[], '1,500–2,500', ARRAY['Italian', 'English', 'German']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship. UK citizens post-Brexit require work permits. The 2026 Olympics legacy has increased international hiring.', 'Hotels begin recruiting July–August. Ski schools from September. Shops and restaurants from October. Italian and German language skills are valuable as Cortina is in the Ladin-speaking Dolomites region.',
  true, 800, 'EUR €350–€600/month shared',
  'EUR €250–€400 (housing, food, transport — upscale resort)', 'Local bus service within Cortina. SAD/DBA bus to Dobbiaco train station (1 hr, connecting to Brenner/Innsbruck). Cortina Express bus to Venice (2.5 hrs). Venice Marco Polo Airport 2.5 hrs. New Olympic infrastructure has improved transport links.', ARRAY['Discounted Dolomiti Superski pass (covers 1,200km of runs)', 'Staff meals at hotels', 'Accommodation sometimes provided', 'Pro deals on gear', 'Tips in luxury hospitality']::text[],
  'More refined, Italian-style après. The passeggiata (evening stroll) along Corso Italia is the social event. Enoteca Cortina for wine and cicchetti. Hotel de la Poste bar (historic meeting point). VIP Club nightclub. El Zoco wine bar. Birreria Vienna for craft beer. Des Alpes terrace. Cortina''s après is about style and socialising, not wild parties.', ARRAY['Snowshoeing in the Dolomites', 'Cross-country skiing (Fiames Nordic area)', 'Ice climbing', 'Winter hiking (Dolomite trails)', 'Ice skating (Olympic Stadium)', 'Tobogganing', 'Spa and wellness', 'Via Ferrata (some accessible in winter with guides)']::text[], 'Ospedale di Cortina (Codivilla-Putti hospital) with emergency department — well-equipped due to resort status. Multiple pharmacies and doctors'' practices on Corso Italia.', 'Luxury boutiques along Corso Italia (Moncler, Brunello Cucinelli, Benetton). Conad and Despar supermarkets, bakeries, banks, ATMs, post office, gear shops. Full-service town with year-round amenities.',
  'Moderate — predominantly Italian seasonal workforce with German-speaking staff from South Tyrol. Growing international presence post-Olympics. Less English-dominant than French/Austrian resorts.',
  -10, 0, 'medium', 70
) ON CONFLICT DO NOTHING;

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
  '42', 'Cervinia',
  (SELECT id FROM public.regions WHERE legacy_id = '1' LIMIT 1),
  'Italy', 'The Italian side of the Matterhorn (Monte Cervino), linked to Zermatt via the highest ski lifts in Europe reaching 3,883m at the Klein Matterhorn. Cervinia offers wide, sunny, south-facing pistes ideal for intermediates, reliable high-altitude snow, and a significantly more affordable alternative to its Swiss neighbour. Part of the Matterhorn Ski Paradise with 360km of linked runs.', 45.9333, 7.6333,
  'Aosta Valley', 'Breuil-Cervinia', 'https://www.cervinia.it', 'https://images.unsplash.com/photo-1759313591414-a96b5dfa020c?w=1200&q=80',
  770, 73, 10, 29, 22, 12,
  1480, 2050, 3480, 23, '{"gondolas":3,"chairlifts":10,"surface_lifts":10}'::jsonb,
  500, '2025-10-25', '2026-05-03',
  ARRAY['Cervino SpA (lift company)', 'Hotel Hermitage Relais & Châteaux', 'Grand Hotel des Guides', 'Hotel Excelsior Planet', 'Saint-Hubertus Resort', 'Scuola Sci del Cervino (ski school)', 'Scuola Sci Breuil-Cervinia', 'Restaurants along Via Carrel']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Ski Technician', 'Snowmaker / Pisteur', 'Retail Sales', 'Mountain Guide']::text[], '800–1,500', ARRAY['Italian', 'English', 'French']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship. The Aosta Valley is bilingual (Italian/French). UK citizens post-Brexit require work permits.', 'Hotels and lift company begin recruiting August–September. Ski schools from September. Restaurants and bars from October. French language is useful as Aosta Valley is bilingual. Italian essential for most positions.',
  true, 500, 'EUR €250–€450/month shared',
  'EUR €180–€300 (housing, food, transport — more affordable than Zermatt across the border)', 'Local bus within Breuil-Cervinia. Bus to Châtillon (40 min), connecting to the Aosta–Turin railway. Turin Airport 2 hrs, Milan Malpensa Airport 2.5 hrs. Geneva Airport 3 hrs.', ARRAY['Discounted season pass (Matterhorn Ski Paradise — ski to Zermatt)', 'Staff meals at hotels', 'Accommodation sometimes provided', 'Pro deals on gear', 'Access to cross-border skiing into Switzerland']::text[],
  'Relaxed Italian-style après with good food and wine. Copa Pan bar is the main on-mountain après spot. In the village: Yeti Bar, Dragon Bar, Pub The Goat, and Hostellerie des Guides bar. More about lingering over aperitivo and local wines than wild parties. Excellent restaurants: La Brenva, Le Samovar, Ristorante Wood.', ARRAY['Cross-border skiing to Zermatt', 'Summer glacier skiing (Plateau Rosa)', 'Snowshoeing', 'Ice climbing', 'Cross-country skiing', 'Heli-skiing (Monte Rosa area)', 'Winter hiking', 'Spa and wellness']::text[], 'Guardia Medica Turistica Cervinia (tourist medical service). Pharmacy in the village. Nearest hospital: Ospedale Umberto Parini in Aosta (1 hr).', 'Small Despar supermarket, bakeries, banks, ATMs, gear rental shops, and boutiques along Via Carrel. Limited compared to larger resorts — Aosta (1 hr) for larger shopping.',
  'Small to moderate — predominantly Italian seasonal workforce with some French speakers from the Aosta Valley bilingual tradition. Small but growing international community. Less English-dominant than other major resorts.',
  -12, -2, 'high', 30
) ON CONFLICT DO NOTHING;

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
  '3', 'Niseko United',
  (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
  'Japan', 'Japan''s most international resort, famous for consistent deep powder snow. Located on Hokkaido, Niseko receives an average of 15 metres of snowfall annually, making it one of the snowiest resorts on Earth.', 42.8625, 140.6987,
  'Hokkaido', 'Kutchan / Hirafu', 'https://www.nisekounited.com', 'https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1200&q=80',
  887, 30, 8, 10, 8, 4,
  994, 260, 1308, 38, '{"gondolas":1,"chairlifts":27,"surface_lifts":10}'::jsonb,
  1500, '2025-12-01', '2026-05-06',
  ARRAY['Niseko Village (resort operations)', 'Hilton Niseko Village', 'The Vale Niseko', 'Hirafu restaurants & bars', 'Tour operators']::text[], ARRAY['Ski/Snowboard Instructor', 'Hotel Front Desk', 'Restaurant Server', 'Bar Staff', 'Housekeeping', 'Shuttle Driver', 'Kids Club Staff']::text[], '1,000–2,000', ARRAY['English', 'Japanese']::text[],
  'Working Holiday Visa available for Australian, Canadian, UK, and many other nationalities. Employer-sponsored visas possible for some roles.', 'Hiring begins August–September. Strong demand for bilingual (English/Japanese) staff.',
  true, 800, '¥40,000–¥70,000/month shared',
  '¥25,000–¥40,000 (housing, food, transport)', 'Local shuttle buses between Niseko villages. Bus to New Chitose Airport (3 hrs). JR train from Kutchan.', ARRAY['Discounted season pass', 'Staff meals at some employers', 'Onsen (hot spring) access']::text[],
  'Hirafu village has a lively scene with izakayas, bars, and international restaurants. Popular spots include Taco Bar, Half Note, and Wild Bill''s.', ARRAY['Onsen (hot springs)', 'Snowshoeing', 'Backcountry touring', 'Night skiing']::text[], 'Kutchan-Kosei General Hospital nearby. Clinics in Hirafu area.', 'Seicomart convenience stores, Kutchan town supermarkets, gear rental shops in Hirafu.',
  'Very large — Niseko has the biggest international seasonal worker community in Japan, dominated by Australians.',
  -14, -4, 'high', 0
) ON CONFLICT DO NOTHING;

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
  '43', 'Hakuba Valley',
  (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
  'Japan', 'Host of the 1998 Winter Olympics alpine and ski jumping events, Hakuba Valley encompasses 10 interconnected resorts in the Northern Japan Alps of Nagano Prefecture. Known for deep powder, dramatic alpine scenery, and a growing international community, Hakuba offers everything from gentle beginner terrain at Hakuba Goryu to expert steeps at Happo-One and Cortina. The valley is one of Japan''s top destinations for international seasonal workers.', 36.6983, 137.8322,
  'Nagano', 'Hakuba', 'https://www.hakubavalley.com', 'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?w=1200&q=80',
  900, 137, 40, 50, 35, 12,
  1071, 760, 1831, 56, '{"gondolas":4,"chairlifts":42,"surface_lifts":10}'::jsonb,
  1100, '2025-12-06', '2026-05-06',
  ARRAY['Hakuba Happo-One Ski Resort (Shirouma Kanko Kaihatsu)', 'Evergreen International Ski School', 'Hakuba Goryu / Hakuba 47 resort operations', 'Hakuba Tokyu Hotel', 'Phoenix Hotel Hakuba', 'Hakuba Springs Hotel', 'Sierra Resort Hakuba', 'Snowbeds Hakuba (accommodation provider)', 'Morino Lodge', 'Local izakayas, bars, and restaurants']::text[], ARRAY['Ski/Snowboard Instructor', 'Hotel Front Desk / Reception', 'Restaurant Server / Kitchen Staff', 'Bar Staff', 'Housekeeping', 'Lift Operator', 'Shuttle Bus Driver', 'Kids Ski School Instructor', 'Rental Shop Technician', 'Guest Relations / Concierge']::text[], '1,500–2,500', ARRAY['Japanese', 'English']::text[],
  'Working Holiday Visa available for citizens of Australia, Canada, UK, New Zealand, France, Germany, South Korea, and many other countries. Valid for 12 months with option to work. Japanese language ability is very helpful for most roles, though English-speaking positions exist in international hotels and ski schools. Employer-sponsored work visas are possible for specialized roles.', 'Major employers and ski schools begin hiring in August–September. English-speaking instructor positions fill early (September–October). Hotel and hospitality roles continue hiring through November. Some walk-in hiring occurs in early December.',
  true, 1200, 'JPY ¥30,000–¥60,000/month shared',
  'JPY ¥15,000–¥25,000 (food, transport, basics)', 'Hakuba Valley shuttle buses between resorts (free with lift pass). JR Oito Line train from Hakuba Station to Matsumoto and Nagano. Highway bus to Nagano Station (1 hr) and direct buses to Narita/Haneda airports. Local taxis available.', ARRAY['Discounted or free season pass', 'Staff meals at some employers', 'Discounted onsen (hot spring) access', 'Pro deals on ski/snowboard gear', 'Subsidized staff housing', 'Free resort shuttle use']::text[],
  'A vibrant and growing après scene centred around Hakuba Happo-One and Echoland. Popular spots include The Pub (Echoland), Hakuba Taproom craft beer bar, Mocking Bird (cocktail bar), Jack''s Sports Bar, and Roots Bar. Traditional izakayas like Sharaku and Mimizuku serve yakitori and local sake. Hakuba''s 13 natural onsen are an essential après experience — Hakuba Happo Onsen and Mimizuku Onsen are local favourites.', ARRAY['Onsen (hot springs)', 'Backcountry touring', 'Snowshoeing', 'Night skiing (at Happo-One and Iwatake)', 'Cross-country skiing', 'Snow monkey viewing (Jigokudani, 1.5 hrs)', 'Ice climbing', 'Winter hiking in Northern Alps']::text[], 'Hakuba Clinic for minor injuries and illness. Hakuba Orthopaedic Clinic for ski injuries. Azumi General Hospital in Ikeda (30 min). Shinshu University Hospital in Matsumoto (1 hr) for major emergencies. National health insurance or travel insurance recommended.', 'A-Coop supermarket in Hakuba village, Lawson and 7-Eleven convenience stores, multiple ski rental shops (Rhythm, Spicy Rentals), gear shops, pharmacies, and ATMs (Japan Post, 77 Bank). Echoland area has restaurants and nightlife.',
  'Large — Hakuba is Japan''s second-largest international ski community after Niseko, with significant populations of Australians, Americans, Canadians, and Europeans. English is widely spoken in the tourism sector.',
  -10, -1, 'high', 5
) ON CONFLICT DO NOTHING;

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
  '44', 'Rusutsu',
  (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
  'Japan', 'One of Hokkaido''s premier powder resorts with three mountains — Mt. Isola, East Mountain, and West Mountain — offering 42km of tree-lined runs and outstanding off-piste terrain. Less crowded than nearby Niseko but receiving the same legendary dry Hokkaido powder. Home to the Westin Rusutsu Resort and a large amusement park complex in summer.', 42.7458, 140.5658,
  'Hokkaido', 'Rusutsu', 'https://rusutsu.com', 'https://images.unsplash.com/photo-1771387293792-29e483a570aa?w=1200&q=80',
  212, 37, 11, 11, 11, 4,
  594, 400, 994, 18, '{"gondolas":1,"chairlifts":14,"surface_lifts":3}'::jsonb,
  1400, '2025-11-29', '2026-04-05',
  ARRAY['Rusutsu Resort (Kamori Kanko — resort operations)', 'The Westin Rusutsu Resort', 'The Vale Rusutsu', 'Rusutsu Resort Hotel & Convention', 'Resort restaurants and retail outlets']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Front Desk / Concierge', 'Restaurant Server / Kitchen Staff', 'Housekeeping', 'Rental Shop Staff', 'Kids Club / Snow School Staff', 'Grooming / Snowmaking Operator', 'Activity Guide']::text[], '500–800', ARRAY['Japanese', 'English']::text[],
  'Working Holiday Visa available for citizens of Australia, Canada, UK, New Zealand, France, Germany, and many other countries. Japanese language ability is very helpful — Rusutsu is less internationalized than Niseko. Employer-sponsored visas possible through Kamori Kanko for specialized positions.', 'Kamori Kanko and Westin begin recruitment in August–September for the winter season. English-speaking instructor roles are in demand. Applications through resort websites or recruitment agencies like SkiStaff Japan.',
  true, 400, 'JPY ¥25,000–¥50,000/month shared (often subsidized by employer)',
  'JPY ¥12,000–¥20,000 (food, transport, basics)', 'Free resort shuttle to/from Rusutsu Resort Hotel. Bus service to Niseko (40 min) and New Chitose Airport (2 hrs). Limited public transport — most staff rely on employer shuttles or shared cars.', ARRAY['Free or heavily discounted season pass', 'Staff meals at resort cafeterias', 'Subsidized staff accommodation', 'Free use of resort onsen and pool facilities', 'Pro deals on ski gear', 'Access to resort amusement facilities']::text[],
  'More low-key than Niseko. The resort hotel complex has several bars and restaurants including the Rusutsu Resort Hotel bar, izakaya-style dining at Kakashi, and the Western-style Octagon Bar. Natural onsen at the resort hotel are a highlight. For livelier nightlife, many staff make the 40-minute trip to Niseko''s Hirafu.', ARRAY['Onsen (resort hotel hot springs)', 'Snowshoeing', 'Snowmobile tours', 'Dog sledding', 'Night skiing', 'Backcountry touring', 'Ice fishing (nearby Lake Toya)']::text[], 'Rusutsu has a resort first-aid clinic. Nearest hospital is Kimobetsu Town Hospital (20 min). Kutchan Kosei General Hospital (40 min) for more serious injuries. National health insurance or travel insurance essential.', 'Resort complex has convenience shops, rental outlets, and souvenir stores. Limited off-resort shopping — nearest Seicomart and supermarkets are in Kimobetsu or Kutchan. Staff often stock up on trips to Niseko or New Chitose area.',
  'Medium — growing international worker population, predominantly Australians, but much smaller and more Japanese-centric than nearby Niseko. Good for those seeking a more authentic Japanese experience.',
  -14, -4, 'high', 0
) ON CONFLICT DO NOTHING;

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
  '45', 'Furano',
  (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
  'Japan', 'A well-kept secret in central Hokkaido, Furano offers ultra-dry light powder, virtually no lift queues, and an authentic Japanese small-town experience. The resort hosted FIS World Cup events in the 1970s–80s and is operated by Prince Hotels. Famous for lavender fields in summer and premium melon farming, Furano town offers a genuine rural Hokkaido lifestyle that draws workers seeking an off-the-beaten-path experience.', 43.3378, 142.3706,
  'Hokkaido', 'Furano', 'https://www.princehotels.co.jp/ski/furano/en/', 'https://images.unsplash.com/photo-1606567595334-d39972c85dbe?w=1200&q=80',
  194, 28, 10, 10, 6, 2,
  964, 245, 1209, 11, '{"gondolas":1,"chairlifts":8,"surface_lifts":2}'::jsonb,
  900, '2025-11-29', '2026-05-06',
  ARRAY['Furano Ski Resort (Prince Hotels & Resorts)', 'New Furano Prince Hotel', 'Furano Natulux Hotel', 'Furano town restaurants, cafés, and pensions', 'Alpine Backpackers (hostel/bar)', 'Local dairy farms (year-round)']::text[], ARRAY['Ski/Snowboard Instructor', 'Hotel Staff (front desk, housekeeping)', 'Lift Operator', 'Restaurant Server / Kitchen Staff', 'Rental Shop Technician', 'Bar Staff', 'Kids Club Instructor', 'Grooming Operator']::text[], '300–600', ARRAY['Japanese', 'English']::text[],
  'Working Holiday Visa available for many nationalities. Japanese language ability is very important in Furano as it is a predominantly Japanese-speaking town with far fewer international visitors than Niseko. Some English-speaking instructor roles exist through Prince Hotels'' ski school.', 'Prince Hotels begins hiring in September–October. Smaller pensions and local businesses hire from October–November. Walk-in applications sometimes accepted at start of season.',
  true, 250, 'JPY ¥20,000–¥45,000/month shared',
  'JPY ¥10,000–¥18,000 (food, transport, basics — Furano is affordable)', 'JR Furano Line train connects to Asahikawa (1.5 hrs) and Sapporo via Takikawa (2.5 hrs). Lavender Bus between Furano Station and ski resort. Town is compact and bikeable/walkable in milder conditions. Bus to New Chitose Airport (3 hrs).', ARRAY['Discounted or free season pass', 'Staff meals at Prince Hotel restaurants', 'Subsidized accommodation', 'Night skiing access', 'Discounted local onsen', 'Access to Ningle Terrace craft village']::text[],
  'Quiet and authentically Japanese. Popular spots include Alpine Backpackers bar (the main international hangout), Downtown Furano izakayas like Kumagera (local game meats) and Furano Robata (charcoal grilled seafood). Furano Wine House for local wines. The town''s Fukiage Onsen (free outdoor hot spring, 30 min drive) is legendary. Furano also has a local winery and cheese factory worth visiting.', ARRAY['Onsen (hot springs — Fukiage, Tokachidake)', 'Night skiing (until 7:30 PM)', 'Backcountry touring (Tokachidake area)', 'Snowshoeing', 'Cross-country skiing', 'Curling (Furano has a dedicated curling facility)', 'Visiting Furano Winery and Cheese Factory']::text[], 'Furano Kyokai Hospital in town centre with emergency department. Several clinics in Furano. Asahikawa Medical University Hospital (1.5 hrs) for major trauma. National health insurance or travel insurance essential.', 'Furano has a proper town centre with Homac hardware store, Co-op supermarket, Tsuruha Drug pharmacy, Lawson and Seicomart convenience stores, and a variety of local shops. More self-sufficient than resort-only destinations.',
  'Small — Furano has a modest but tight-knit international community. Mainly Australians and a few Europeans. Great for those wanting deep immersion in Japanese culture with fewer English speakers around.',
  -18, -6, 'high', 5
) ON CONFLICT DO NOTHING;

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
  '46', 'Nozawa Onsen',
  (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
  'Japan', 'A traditional hot spring village with over 1,300 years of history, combined with a modern ski resort spanning from 565m to 1,650m. Nozawa Onsen is renowned for its 13 free public onsens maintained by the community, charming narrow streets lined with ryokans, and the spectacular Dosojin Fire Festival every January 15th. The ski area offers excellent powder, tree skiing, and long cruising runs with far fewer crowds than Hakuba or Niseko.', 36.9236, 138.6353,
  'Nagano', 'Nozawa Onsen', 'https://www.nozawaski.com', 'https://images.unsplash.com/photo-1767352140607-845a696cc39b?w=1200&q=80',
  297, 36, 12, 13, 8, 3,
  1085, 565, 1650, 20, '{"gondolas":1,"chairlifts":15,"surface_lifts":4}'::jsonb,
  1200, '2025-11-29', '2026-05-06',
  ARRAY['Nozawa Onsen Snow Resort (resort operations)', 'Nozawa Holidays (accommodation & tours)', 'Lodge Nagano', 'Kaiya Nozawa', 'Nozawa Central Apartments', 'Nozawa Onsen Ski School', 'Village ryokans, restaurants, and bars']::text[], ARRAY['Ski/Snowboard Instructor', 'Hotel/Lodge Reception', 'Restaurant Server / Kitchen Staff', 'Bar Staff', 'Housekeeping', 'Transfer Driver', 'Kids Ski School Instructor', 'Guest Relations / Concierge', 'Rental Shop Staff']::text[], '400–700', ARRAY['Japanese', 'English']::text[],
  'Working Holiday Visa available for many nationalities including Australians, Canadians, British, and New Zealanders. Japanese language is very helpful for village life and interacting with local employers. English-speaking roles available in international lodges and ski school.', 'International lodges and ski schools begin hiring in August–September. Local Japanese businesses hire later, October–November. The village community is welcoming but values workers who make an effort with Japanese language.',
  true, 350, 'JPY ¥25,000–¥55,000/month shared',
  'JPY ¥12,000–¥20,000 (food, transport, basics)', 'Nozawa Onsen is accessible by bus from Iiyama Station on the Hokuriku Shinkansen (25 min from village). Shinkansen to Tokyo takes approximately 2 hours. Free village shuttle bus to ski lifts. Limited local buses to surrounding areas.', ARRAY['Discounted season pass', 'Free public onsen access (13 bathhouses)', 'Staff meals at some employers', 'Subsidized accommodation', 'Pro deals on gear', 'Cultural immersion in traditional village life']::text[],
  'Unique blend of traditional and modern. The 13 free public onsens are the heart of après-ski culture — Ogama is the most famous, used for communal egg and vegetable boiling. Popular bars include Stay Bar (international hangout), Kaiya Bar, and Zig Zag Bar. Traditional izakayas along the village streets serve nabe (hot pot), oyaki dumplings, and local sake. The Dosojin Fire Festival in January is one of Japan''s most spectacular fire festivals.', ARRAY['Onsen (13 free public hot springs)', 'Night skiing', 'Snowshoeing', 'Backcountry touring', 'Cross-country skiing', 'Cultural festivals (Dosojin Fire Festival)', 'Temple visits', 'Snow play and sledding areas']::text[], 'Nozawa Onsen has a small village clinic. Iiyama Hospital (25 min by bus) for more serious needs. Nagano City hospitals (1 hr by shinkansen) for major emergencies. National health insurance or travel insurance recommended.', 'Small village shops, Ogama market, a few convenience stores. Limited grocery shopping — many workers stock up in Iiyama. Rental shops and gear stores in the village. Unique craft shops and traditional sweet shops along narrow streets.',
  'Medium — a growing but still modest international community, smaller than Hakuba or Niseko. Predominantly Australian, with some Europeans and North Americans. The village''s traditional character attracts workers seeking a more cultural experience.',
  -10, -2, 'high', 3
) ON CONFLICT DO NOTHING;

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
  '47', 'Myoko Kogen',
  (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
  'Japan', 'One of Japan''s snowiest regions with multiple interconnected resorts clustered around the volcanic Mt. Myoko (2,454m) in Niigata Prefecture. The area includes Akakura Onsen, Akakura Kanko, Suginohara, Ikenotaira, Seki Onsen, and Madarao/Tangram. A favourite among powder enthusiasts seeking affordable, authentic Japanese skiing away from international crowds. The region is steeped in onsen culture with mineral-rich volcanic hot springs.', 36.8697, 138.6533,
  'Niigata', 'Myoko', 'https://www.myoko.tv', 'https://images.unsplash.com/photo-1771707685989-2d424e4ed88a?w=1200&q=80',
  440, 60, 18, 22, 14, 6,
  893, 750, 1643, 26, '{"gondolas":1,"chairlifts":20,"surface_lifts":5}'::jsonb,
  1350, '2025-12-13', '2026-04-19',
  ARRAY['Akakura Kanko Resort Ski Area', 'Myoko Suginohara Ski Resort (Prince Hotels)', 'APA Hotel & Resort Myoko', 'Madarao Mountain Resort', 'Local ryokans and pensions in Akakura Onsen', 'Myoko Snowsports (ski school)', 'Local restaurants and izakayas']::text[], ARRAY['Ski/Snowboard Instructor', 'Hotel / Ryokan Staff', 'Lift Operator', 'Restaurant Server / Kitchen Staff', 'Housekeeping', 'Bar Staff', 'Rental Shop Staff', 'Guest Relations']::text[], '400–700', ARRAY['Japanese', 'English']::text[],
  'Working Holiday Visa available for many nationalities. Japanese language is very helpful as Myoko remains predominantly a Japanese resort with a small but growing international presence. Some English-speaking positions available at international ski schools and lodges.', 'Ski schools and international lodges begin hiring August–September. Japanese ryokans and resorts hire October–November. Myoko is a smaller market — early applications recommended for English-speaking roles.',
  true, 250, 'JPY ¥20,000–¥45,000/month shared',
  'JPY ¥10,000–¥18,000 (food, transport, basics — very affordable)', 'Myoko Kogen Station on the Echigo Tokimeki Railway (formerly JR Shinetsu Line). Shuttle buses between resorts. Bus from Joetsu-Myoko Shinkansen station (20 min). Shinkansen to Tokyo approx. 2 hours. Local buses connect Akakura Onsen and surrounding resort areas.', ARRAY['Discounted season pass', 'Onsen access (volcanic hot springs)', 'Staff meals at some employers', 'Subsidized accommodation', 'Pro deals on gear', 'Night skiing access']::text[],
  'Centred around the charming Akakura Onsen village. Traditional izakayas and ramen shops line the main street. Popular spots include Myoko Coffee (craft coffee and beer), the Akakura Onsen public bathhouses, and various small bars. Seki Onsen at the base of Seki resort is one of Japan''s most atmospheric wild onsens with rust-red mineral water. The scene is low-key, authentic, and very Japanese.', ARRAY['Onsen (volcanic hot springs — Akakura, Seki, Ikenotaira)', 'Backcountry touring (Mt. Myoko)', 'Snowshoeing', 'Night skiing (Akakura Kanko)', 'Cross-country skiing', 'Snow hiking', 'Visiting Takada Castle snow lantern festival (nearby Joetsu City)']::text[], 'Myoko Kogen has small clinics in Akakura Onsen. Joetsu General Hospital in Joetsu City (30 min) for more serious needs. National health insurance or travel insurance essential.', 'Small convenience stores and local shops in Akakura Onsen. Larger supermarkets and shopping in Arai or Joetsu City (20-30 min drive). Limited English-language services.',
  'Small but growing — Myoko''s international community is much smaller than Niseko or Hakuba but has been expanding, particularly at Madarao. Mostly Australians and a handful of Europeans. Excellent for deep cultural immersion.',
  -10, -2, 'high', 2
) ON CONFLICT DO NOTHING;

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
  '48', 'Shiga Kogen',
  (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
  'Japan', 'Japan''s largest linked ski area with 21 interconnected resorts accessible on a single lift pass, set within Joshinetsu Kogen National Park in Nagano Prefecture. Shiga Kogen hosted giant slalom and slalom events at the 1998 Nagano Olympics. At elevations between 1,340m and 2,307m, it is Japan''s highest resort area, ensuring excellent snow quality and a long season. The area is also gateway to the famous Jigokudani Snow Monkey Park.', 36.7856, 138.5253,
  'Nagano', 'Yamanouchi', 'https://www.shigakogen-ski.com', 'https://images.unsplash.com/photo-1773679472203-15255d505456?w=1200&q=80',
  600, 83, 25, 32, 19, 7,
  980, 1340, 2307, 51, '{"gondolas":1,"chairlifts":35,"surface_lifts":15}'::jsonb,
  1000, '2025-11-29', '2026-05-10',
  ARRAY['Shiga Kogen Prince Hotel (Prince Hotels & Resorts)', 'Hotel Ichinose', 'Shiga Kogen Ski Area resort operations (multiple operators)', 'Okushiga Kogen Hotel', 'Yamanouchi town ryokans and hotels', 'Shibu Onsen and Yudanaka Onsen ryokans', 'Local restaurants and services']::text[], ARRAY['Ski/Snowboard Instructor', 'Hotel Staff (front desk, housekeeping)', 'Lift Operator', 'Restaurant Server / Kitchen Staff', 'Rental Shop Staff', 'Tour Guide (Snow Monkey tours)', 'Shuttle Bus Driver']::text[], '500–900', ARRAY['Japanese', 'English']::text[],
  'Working Holiday Visa available for many nationalities. Japanese language is very important as Shiga Kogen has minimal international infrastructure. Most positions are with Japanese employers. Some English-speaking roles exist at Prince Hotels properties.', 'Prince Hotels begins hiring in September. Local hotels and ryokans hire October–November. Limited English-speaking positions — apply early. Some positions found through Yamanouchi town tourism office.',
  true, 400, 'JPY ¥20,000–¥40,000/month (often employer-provided)',
  'JPY ¥10,000–¥18,000 (food, transport, basics)', 'Shuttle buses between the 21 resort areas (free with lift pass). Bus from Nagano Station to Shiga Kogen (70 min via Nagano Dentetsu bus). JR Shinkansen to Nagano from Tokyo (80 min). Local buses to Yamanouchi and Yudanaka.', ARRAY['Multi-resort season pass (21 resorts on one pass)', 'Staff meals at hotel employers', 'Subsidized accommodation', 'Onsen access in Shibu/Yudanaka', 'Proximity to Snow Monkey Park', 'Long season (November–May)']::text[],
  'Low-key and traditional Japanese. The on-mountain experience centres around hotel lounges and small bars. Down in the valley, Shibu Onsen is a magical atmospheric onsen town with 9 free public bathhouses and cobblestone lanes. Yudanaka Onsen offers more ryokan-style dining. Popular stops include the hotel bars at Prince Hotel and Ichinose. For nightlife, Nagano City is an hour''s bus ride away.', ARRAY['Snow Monkey Park (Jigokudani — 30 min from resort)', 'Onsen (Shibu Onsen, Yudanaka Onsen)', 'Snowshoeing in National Park', 'Cross-country skiing', 'Backcountry touring', 'Night skiing', 'Temple visits in Yamanouchi', 'Day trips to Nagano City (Zenkoji Temple)']::text[], 'Yamanouchi town clinic for minor injuries. Hokushin General Hospital in Nakano City (30 min). Nagano Red Cross Hospital in Nagano City (50 min) for major emergencies. National health insurance or travel insurance essential.', 'Limited on-mountain shopping — hotel gift shops and a few convenience stores at resort base areas. Yamanouchi town has basic grocery stores and pharmacies. Larger shopping available in Nakano City or Nagano City.',
  'Small — Shiga Kogen is overwhelmingly Japanese-oriented with very few international workers. Excellent for those seeking total cultural immersion but requires reasonable Japanese language ability for most roles.',
  -14, -4, 'high', 5
) ON CONFLICT DO NOTHING;

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
  '49', 'Naeba',
  (SELECT id FROM public.regions WHERE legacy_id = '3' LIMIT 1),
  'Japan', 'Connected to Kagura ski area by the Dragondola — the world''s longest gondola at 5.5km — Naeba offers an enormous combined ski domain in Niigata Prefecture. Operated by Prince Hotels, Naeba is one of Japan''s most popular resorts among Tokyo weekenders due to its easy Shinkansen access (75 min from Tokyo). The resort also hosts the famous Fuji Rock Festival in summer. Kagura''s high elevation extends the season well into May.', 36.9128, 138.7422,
  'Niigata', 'Yuzawa', 'https://www.princehotels.co.jp/ski/naeba/en/', 'https://images.unsplash.com/photo-1675710048439-51e9ccf40129?w=1200&q=80',
  340, 47, 14, 17, 12, 4,
  1100, 900, 2000, 28, '{"gondolas":2,"chairlifts":20,"surface_lifts":6}'::jsonb,
  1000, '2025-12-06', '2026-05-17',
  ARRAY['Naeba Prince Hotel (Prince Hotels & Resorts)', 'Kagura Ski Area (Prince Hotels)', 'Naeba ski school', 'NASPANew Otani Hotel', 'Yuzawa town hotels, ryokans, and restaurants', 'Local izakayas and bars in Yuzawa']::text[], ARRAY['Ski/Snowboard Instructor', 'Hotel Staff (front desk, housekeeping, F&B)', 'Lift Operator', 'Restaurant Server / Kitchen Staff', 'Rental Shop Staff', 'Gondola Operator', 'Snow Grooming / Snowmaking', 'Kids Ski School Instructor']::text[], '600–1,000', ARRAY['Japanese', 'English']::text[],
  'Working Holiday Visa available for many nationalities. Japanese language is very helpful as Naeba is primarily a domestic resort. Prince Hotels sometimes hire English-speaking staff for international guests. Employer-sponsored visas possible for specialized hotel roles.', 'Prince Hotels begins hiring in August–September through their recruitment portal. Local Yuzawa businesses hire from October. Naeba''s proximity to Tokyo means positions can fill quickly.',
  true, 500, 'JPY ¥25,000–¥50,000/month (often employer-subsidized)',
  'JPY ¥12,000–¥20,000 (food, transport, basics)', 'Joetsu Shinkansen from Tokyo to Echigo-Yuzawa Station (75 min). Free shuttle bus from Echigo-Yuzawa Station to Naeba (40 min). Dragondola connects Naeba to Kagura. Local buses around Yuzawa town.', ARRAY['Discounted season pass (Naeba + Kagura)', 'Staff meals at Prince Hotel', 'Subsidized accommodation', 'Free Dragondola access', 'Night skiing access', 'Easy weekend access to Tokyo']::text[],
  'Naeba Prince Hotel has multiple restaurants and bars within its massive complex. Down in Yuzawa town, the onsen culture is outstanding — Takahan ryokan has a stunning open-air bath, and Komakonoyu public onsen is a local favourite. Yuzawa has traditional izakayas, ramen shops, and sake bars (the region is one of Japan''s premier sake-producing areas). Ponshukan Sake Museum at Echigo-Yuzawa Station features a sake tasting room with over 100 Niigata sakes.', ARRAY['Onsen (Yuzawa town hot springs)', 'Night skiing (Naeba)', 'Backcountry touring (Kagura area)', 'Snowshoeing', 'Sake brewery tours (Niigata region)', 'Day trips to Tokyo (75 min by Shinkansen)', 'Cross-country skiing', 'Snow festivals']::text[], 'Yuzawa Town Clinic for minor issues. Minami Uonuma City Hospital (20 min) for more serious needs. Niigata University Hospital (1.5 hrs) for major emergencies. National health insurance or travel insurance recommended.', 'Naeba Prince Hotel complex has shops and restaurants. Yuzawa town has convenience stores (Lawson, 7-Eleven), supermarkets, pharmacies, and the CoCoLo shopping centre at Echigo-Yuzawa Station. Ponshukan sake museum is a must-visit.',
  'Small — Naeba is overwhelmingly a Japanese domestic resort. Very few international workers, making it ideal for Japanese language immersion. Tokyo accessibility is a major perk for weekend city trips.',
  -8, -1, 'high', 10
) ON CONFLICT DO NOTHING;

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
  '50', 'Perisher',
  (SELECT id FROM public.regions WHERE legacy_id = '9' LIMIT 1),
  'Australia', 'Australia''s largest ski resort with four interconnected resort areas — Perisher Valley, Blue Cow, Smiggin Holes, and Guthega — located in Kosciuszko National Park in the Snowy Mountains of New South Wales. Perisher is the most-visited ski resort in the Southern Hemisphere, attracting over 1 million visitors annually. While smaller than northern hemisphere resorts (vertical drop of 355m), it compensates with extensive snowmaking covering over half the terrain, and a fun, social atmosphere popular with Sydney and Canberra weekenders.', -36.3722, 148.4086,
  'New South Wales', 'Jindabyne', 'https://www.perisher.com.au', 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=1200&q=80',
  1245, 113, 24, 48, 30, 11,
  355, 1605, 2054, 47, '{"gondolas":0,"chairlifts":8,"surface_lifts":39}'::jsonb,
  200, '2026-06-06', '2026-10-04',
  ARRAY['Vail Resorts Australia (Perisher resort operations)', 'Perisher Manor Hotel', 'Jindabyne hotels and accommodation providers', 'Banjo Paterson Inn', 'Perisher Valley Hotel', 'Brumby Bar & Bistro', 'Jindabyne restaurants, bars, and retail', 'National Parks & Wildlife Service (NPWS)']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Snowmaker', 'Hotel Front Desk / Housekeeping', 'Kitchen Staff / Line Cook', 'Bartender / Server', 'Retail Sales (ski shops)', 'Skitube Operator', 'Guest Services', 'Grooming Operator']::text[], '1,500–2,500', ARRAY['English']::text[],
  'International workers typically require a Working Holiday Visa (subclass 417 or 462). Australian WHVs are available to citizens of many countries and allow work for up to 6 months with one employer. Perisher is in a ''specified regional area'' which may count towards second-year visa eligibility. Employer-sponsored visas are rare for seasonal roles.', 'Vail Resorts Australia begins recruitment in February–March for the June–October season. Positions fill through April–May. Instructor certification (e.g., APSI Level 1) required for teaching roles. Jindabyne hospitality businesses hire March–May.',
  true, 800, 'AUD $150–$250/week shared',
  'AUD $300–$450 (housing, food, transport)', 'Skitube alpine railway from Bullocks Flat to Perisher Valley and Blue Cow. Free resort shuttles between Perisher areas. Bus services from Jindabyne to Perisher (30 min). Greyhound/Murrays buses from Sydney (6 hrs) and Canberra (2.5 hrs) to Jindabyne/Cooma.', ARRAY['Free or discounted season pass', 'Staff meal discounts', 'Pro deals on gear', 'Staff events and parties', 'Free Skitube access for staff', 'Epic Pass benefits (Vail Resorts network)']::text[],
  'Lively Australian après culture. On-mountain, the Perisher Valley Hotel bar and Smiggins Hotel are popular. In Jindabyne (30 min down the mountain), the Banjo Paterson Inn is the main nightlife hub with live music and DJ nights. Lake Jindabyne Hotel, The Station, and Birchwood are other popular spots. Rydges Horizon Resort bar draws a more upscale crowd. The vibe is social and fun with a strong seasonal worker community.', ARRAY['Mountain biking (Thredbo and Jindabyne trails)', 'Fishing (Lake Jindabyne)', 'Hiking in Kosciuszko National Park', 'Cross-country skiing (at Perisher Nordic Centre)', 'Snowshoeing', 'Swimming (Jindabyne pool and lake in warmer months)', 'Rock climbing']::text[], 'Perisher has an on-mountain medical centre during ski season. Snowy Mountains Medical Centre in Jindabyne. Cooma Hospital (1 hr) for more serious emergencies. Ambulance and helicopter rescue available.', 'Jindabyne is the service town with Woolworths, Aldi, IGA, gear shops (Rhythm Snowsports, Wilderness Sports), pharmacies, banks, petrol stations, and Nuggets Crossing Shopping Centre. On-mountain services are limited to resort shops and cafeterias.',
  'Large — Perisher attracts a significant number of international seasonal workers, particularly from South America (Argentina, Chile, Brazil), Japan, South Korea, and Europe. Jindabyne has a vibrant multicultural seasonal community.',
  -4, 3, 'low', 55
) ON CONFLICT DO NOTHING;

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
  '51', 'Falls Creek',
  (SELECT id FROM public.regions WHERE legacy_id = '9' LIMIT 1),
  'Australia', 'Victoria''s premier alpine resort and Australia''s only true ski-in/ski-out village, located in the Victorian Alps. Falls Creek is known for its village atmosphere, extensive cross-country trail network, and reliable snowmaking covering over 65% of terrain. The resort sits at 1,500–1,780m elevation and is popular with Melbourne-based seasonal workers (4.5 hr drive). While smaller than northern hemisphere resorts, Falls Creek offers a tight-knit community feel and a genuine alpine village experience.', -36.8667, 147.2833,
  'Victoria', 'Mount Beauty', 'https://www.fallscreek.com.au', 'https://images.unsplash.com/photo-1771707685966-fb7e53b023d5?w=1200&q=80',
  450, 92, 17, 37, 28, 10,
  267, 1500, 1780, 14, '{"gondolas":0,"chairlifts":6,"surface_lifts":8}'::jsonb,
  170, '2026-06-06', '2026-10-04',
  ARRAY['Falls Creek Resort Management Board', 'Falls Creek Ski Lifts Pty Ltd', 'QT Falls Creek Hotel', 'Astra Lodge', 'Frueauf Village', 'Falls Creek Ski School', 'Man Hotel', 'Village restaurants, bars, and retail']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel / Lodge Staff', 'Kitchen Staff / Chef', 'Bartender / Server', 'Rental Shop Staff', 'Snowmaker', 'Guest Services', 'Retail Sales']::text[], '600–1,000', ARRAY['English']::text[],
  'International workers typically require a Working Holiday Visa (subclass 417 or 462). Falls Creek is in a ''specified regional area'' in Victoria, which can count towards second-year visa eligibility for WHV holders.', 'Resort management and ski lifts begin hiring in March–April. Hotels and hospitality hire through April–May. Instructor positions require APSI certification. Jobs advertised on Falls Creek website and Australian ski industry job boards.',
  true, 400, 'AUD $140–$220/week shared',
  'AUD $280–$420 (housing, food, transport)', 'Falls Creek Coach Service from Melbourne (5 hrs). Bus from Mount Beauty (30 min, winter service). Village is car-free and walkable — all accommodation is ski-in/ski-out or a short walk. Over-snow transport within village.', ARRAY['Free or discounted season pass', 'Staff meals at some employers', 'Car-free village lifestyle (ski-in/ski-out)', 'Pro deals on gear', 'Staff social events', 'Cross-country ski trail access']::text[],
  'The Man Hotel bar is Falls Creek''s legendary après-ski venue — one of Australia''s most iconic ski bars with live music and a rowdy seasonal worker scene. Milch Café is popular for afternoon drinks. The Frying Pan Inn and QT Hotel bar offer more upmarket options. The Last Hoot pub is another local favourite. The village is compact enough that everything is walkable and the staff community is very tight-knit.', ARRAY['Cross-country skiing (extensive trail network)', 'Snowshoeing', 'Night skiing (occasional events)', 'Mountain biking (Falls Creek MTB Park in summer)', 'Hiking (Bogong High Plains)', 'Fishing (Rocky Valley Dam)', 'Rock climbing in Mount Buffalo National Park']::text[], 'Falls Creek has a medical centre open during ski season. Mount Beauty Hospital (30 min down the mountain). Northeast Health Wangaratta (1.5 hrs) for major emergencies. Ambulance and helicopter services available.', 'Falls Creek village has a small supermarket, ski rental shops, gear stores, and basic retail. Mount Beauty (30 min) has IGA supermarket, pharmacy, and basic services. Larger shopping in Bright (45 min) or Wangaratta (1.5 hrs).',
  'Medium — Falls Creek has a solid seasonal worker community with both domestic and international staff. International workers come from South America, Japan, and Europe. The car-free village creates a close-knit social atmosphere.',
  -3, 4, 'low', 65
) ON CONFLICT DO NOTHING;

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
  '52', 'Thredbo',
  (SELECT id FROM public.regions WHERE legacy_id = '9' LIMIT 1),
  'Australia', 'Home to Australia''s longest runs and greatest vertical drop (672m), Thredbo is a European-style alpine village at the base of the Snowy Mountains in Kosciuszko National Park, NSW. The Kosciuszko Express chairlift accesses Australia''s highest lifted point at 2,037m. Thredbo offers a vibrant village atmosphere year-round, with a strong focus on mountain biking and hiking in summer. Known for its après-ski culture and lively nightlife, it attracts seasonal workers looking for both great skiing and social life.', -36.5067, 148.3072,
  'New South Wales', 'Thredbo Village', 'https://www.thredbo.com.au', 'https://images.unsplash.com/photo-1520443240718-fce21901db79?w=1200&q=80',
  480, 50, 8, 20, 14, 8,
  672, 1365, 2037, 14, '{"gondolas":1,"chairlifts":9,"surface_lifts":4}'::jsonb,
  180, '2026-06-06', '2026-10-04',
  ARRAY['Kosciuszko Thredbo Pty Ltd (resort operations)', 'Thredbo Alpine Hotel', 'Denman Hotel Thredbo', 'Thredbo YHA (Altitude 1260)', 'Candlelight Lodge', 'Thredbo Snow Sports School', 'Village restaurants, bars, and retail', 'Thredbo Leisure Centre']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Front Desk / Concierge', 'Kitchen Staff / Chef', 'Bartender / Server', 'Snowmaker', 'Rental Shop Technician', 'Guest Services / Ticket Sales', 'Child Care / Kids Programs', 'Grooming Operator']::text[], '800–1,200', ARRAY['English']::text[],
  'International workers typically require a Working Holiday Visa (subclass 417 or 462). Thredbo is in a ''specified regional area'' (Snowy Monaro LGA) which can count towards second-year WHV eligibility. Instructor roles require APSI certification.', 'Kosciuszko Thredbo begins hiring in February–March for the June–October season. Key roles fill by April. Hospitality positions continue to be advertised through May. Jobs listed on Thredbo website, Seek, and ski job boards.',
  true, 600, 'AUD $160–$260/week shared',
  'AUD $300–$450 (housing, food, transport)', 'Greyhound/Murrays bus from Sydney (6 hrs) and Canberra (3 hrs) to Jindabyne, then transfer to Thredbo (30 min). Free village shuttle within Thredbo. Limited bus service to Jindabyne during season.', ARRAY['Free or discounted season pass', 'Staff meals at resort outlets', 'Subsidized staff accommodation', 'Free village gym and pool access (Thredbo Leisure Centre)', 'Pro deals on gear', 'Mountain bike park access in shoulder season']::text[],
  'Thredbo has Australia''s liveliest ski village nightlife. The Keller Bar (underground venue with live music and DJs) is legendary for its seasonal worker parties. The Schuss Bar at Thredbo Alpine Hotel is the classic après-ski spot at the base of the mountain. Cascades Bar & Lounge, T-Bar, and the Denman Hotel bar are also popular. The village is compact and walkable, creating a fun, social atmosphere every night of the week.', ARRAY['Hiking to Mt Kosciuszko summit (Australia''s highest peak)', 'Mountain biking (Thredbo MTB Park — gravity trails)', 'Cross-country skiing', 'Snowshoeing', 'Fishing (Thredbo River, Lake Jindabyne)', 'Swimming (Thredbo Leisure Centre pool)', 'Rock climbing', 'Golf (Thredbo Golf Course in summer)']::text[], 'Thredbo Medical Centre open during ski season for injuries and illness. Jindabyne Medical Practice (30 min). Cooma Hospital (1.5 hrs) for major emergencies. Helicopter rescue available via NSW Ambulance.', 'Thredbo village has a small supermarket (Valley Terminal), ski rental shops (Thredbo Sports, Rhythm), gear stores, and basic retail. Jindabyne (30 min) has full services including Woolworths, Aldi, banks, and pharmacies.',
  'Large — Thredbo has one of Australia''s biggest seasonal worker communities. Significant international presence from South America (Argentina, Chile, Brazil), Japan, South Korea, Ireland, and UK. The village atmosphere creates a tight social scene.',
  -4, 3, 'low', 50
) ON CONFLICT DO NOTHING;

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
  '53', 'Mt Hotham',
  (SELECT id FROM public.regions WHERE legacy_id = '9' LIMIT 1),
  'Australia', 'Australia''s highest alpine village at 1,861m, Mt Hotham offers some of the most challenging terrain in the country and is unique in that you ski down from the village to the lifts. Located in the Victorian Alps, Hotham is known for its reliable snow at altitude, advanced terrain, and connection to Dinner Plain village. The resort is popular with Melbourne-based skiers (4.5 hr drive) and offers a more intimate, less commercialised experience than Perisher or Thredbo.', -37.0883, 147.1717,
  'Victoria', 'Dinner Plain', 'https://www.mthotham.com.au', 'https://images.unsplash.com/photo-1615783236357-e175d2bff905?w=1200&q=80',
  320, 84, 16, 34, 24, 10,
  428, 1450, 1861, 13, '{"gondolas":0,"chairlifts":5,"surface_lifts":8}'::jsonb,
  190, '2026-06-06', '2026-10-04',
  ARRAY['Mt Hotham Resort Management Board', 'Hotham Ski Association', 'Mt Hotham Skiing Company', 'General Hotel Mt Hotham', 'Arlberg Hotel Hotham', 'Dinner Plain lodges and chalets', 'Hotham Snow Sports School', 'Village restaurants and retail']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel / Lodge Staff', 'Kitchen Staff / Chef', 'Bartender / Server', 'Snowmaker', 'Rental Shop Staff', 'Guest Services / Ticket Sales', 'Grooming Operator']::text[], '400–700', ARRAY['English']::text[],
  'International workers typically require a Working Holiday Visa (subclass 417 or 462). Mt Hotham is in a ''specified regional area'' in Victoria, which can count towards second-year WHV eligibility.', 'Resort management and ski company begin hiring in March–April. Hotels and hospitality hire through April–May. Instructor certification (APSI) required for teaching roles. Smaller resort means fewer positions but also less competition.',
  true, 250, 'AUD $130–$200/week shared',
  'AUD $260–$400 (housing, food, transport)', 'Hotham Airport shuttle during season. Bus from Bright (45 min winter service). Free village shuttle between Mt Hotham and Dinner Plain. Limited public transport — most staff need shared car access. Melbourne is 4.5 hrs by car.', ARRAY['Free or discounted season pass', 'Staff meals at some employers', 'Subsidized accommodation', 'Dual-resort skiing (Hotham + Dinner Plain)', 'Pro deals on gear', 'Small community feel — close staff bonds']::text[],
  'More low-key than Thredbo or Perisher. The General Hotel is Mt Hotham''s main après-ski hub with live music and a popular bar. The Arlberg Hotel bar and Zirky''s Bar at Hotham Heights are local favourites. Dinner Plain (10 min shuttle) has a relaxed village atmosphere with restaurants and bars. The smaller community creates a more intimate social scene where everyone knows each other.', ARRAY['Cross-country skiing (Dinner Plain trails)', 'Snowshoeing', 'Mountain biking (summer)', 'Hiking in Alpine National Park', 'Fishing (nearby rivers)', 'Rock climbing at Mt Buffalo (45 min)', 'Visit the historic town of Bright (45 min)']::text[], 'Mt Hotham has an on-mountain medical centre during ski season. Bright Hospital (45 min down the mountain). Northeast Health Wangaratta (2 hrs) for major emergencies. Ambulance and helicopter rescue available.', 'Very limited on-mountain — a small general store and ski rental shops. Dinner Plain has a general store. Bright (45 min) has IGA, pharmacy, and basic services. Larger shopping in Wangaratta (2 hrs). Stocking up before heading up the mountain is essential.',
  'Small to medium — Mt Hotham''s seasonal community is smaller but very close-knit. Some international workers from South America and Asia, but predominantly Australian domestic workers. Great for those seeking a quieter, community-focused season.',
  -3, 4, 'low', 45
) ON CONFLICT DO NOTHING;

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
  '7', 'Queenstown / The Remarkables',
  (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
  'New Zealand', 'Set against the dramatic Remarkables mountain range overlooking Lake Wakatipu, The Remarkables ski area and neighbouring Coronet Peak are both operated by NZSki and use Queenstown as their base town. Queenstown is New Zealand''s undisputed adventure capital with world-class bungee jumping, jet boating, and skydiving alongside skiing. The Remarkables offers family-friendly terrain in a stunning alpine bowl, while Coronet Peak provides more varied terrain and night skiing. Together they create one of the Southern Hemisphere''s top ski destinations.', -45.0544, 168.8147,
  'Otago', 'Queenstown', 'https://www.theremarkables.co.nz', 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&q=80',
  385, 66, 18, 25, 16, 7,
  357, 1586, 1943, 11, '{"gondolas":0,"chairlifts":6,"surface_lifts":5}'::jsonb,
  350, '2026-06-10', '2026-10-10',
  ARRAY['NZSki Ltd (operates The Remarkables and Coronet Peak)', 'Skyline Queenstown (gondola, luge, dining)', 'Hilton Queenstown Resort & Spa', 'Sofitel Queenstown Hotel & Spa', 'Novotel Queenstown Lakeside', 'AJ Hackett Bungy', 'Shotover Jet', 'Queenstown restaurants, bars, and retail', 'Real Journeys / Go Orange']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Front Desk / Concierge', 'Kitchen Staff / Chef', 'Bartender / Server', 'Rental Shop Staff', 'Activity Guide (bungy, jet boat, skydive)', 'Snowmaker', 'Retail Sales', 'Shuttle Bus Driver']::text[], '2,000–3,500', ARRAY['English']::text[],
  'Working Holiday Visa available for citizens of over 40 countries. New Zealand WHVs are generally valid for 12 months (some nationalities up to 23 months). No employer restriction on hours. Easy visa process. Instructor certification (NZSIA or equivalent) required for teaching roles.', 'NZSki begins hiring in March–April for the June–October season. Queenstown hospitality and tourism companies hire year-round but ramp up March–May for winter season. High demand — apply early. Jobs advertised on NZSki website, Seek NZ, and backpacker job boards.',
  true, 800, 'NZD $200–$300/week shared',
  'NZD $350–$500 (housing, food, transport — Queenstown is expensive)', 'NZSki operates free ski buses from Queenstown to The Remarkables (30 min) and Coronet Peak (20 min). Orbus public bus within Queenstown. Queenstown Airport has domestic flights to Auckland, Wellington, Christchurch. InterCity coaches to Wanaka, Christchurch, Dunedin.', ARRAY['Free or discounted season pass (Remarkables + Coronet Peak)', 'Staff meals at resort cafeterias', 'Pro deals on gear', 'Access to Queenstown''s adventure activities at staff rates', 'Staff social events and trips', 'Beautiful lakeside living environment']::text[],
  'Queenstown has the best après-ski and nightlife scene in the Southern Hemisphere. Iconic bars include The World Bar (famous for teapot cocktails), Rhino''s Ski Shack, Winnies (pizza and DJ nights), Below Zero (ice bar), and Zephyr. The Bunker offers upmarket cocktails. Fergburger is the legendary late-night burger joint. Pub on Wharf and Smiths Craft Beer House are popular with locals and seasonals. The Remarkables base building has its own bar for on-mountain après.', ARRAY['Bungee jumping (AJ Hackett — Kawarau Bridge and Nevis)', 'Jet boating (Shotover Jet)', 'Skydiving', 'Paragliding', 'Hiking (Ben Lomond, Routeburn Track nearby)', 'Mountain biking (Queenstown Bike Park, Skyline)', 'Kayaking on Lake Wakatipu', 'Day trip to Milford Sound']::text[], 'Lakes District Hospital in Frankton, Queenstown with 24/7 emergency department. Queenstown Medical Centre in town. Multiple GP clinics and pharmacies. ACC (Accident Compensation Corporation) covers injury treatment costs for everyone in NZ, including tourists and workers.', 'Full-service town with New World and Countdown supermarkets, Pak''nSave (Frankton), Remarkables Park Town Centre shopping mall, ski gear shops (Outside Sports, Small Planet Sports), banks, pharmacies, and all amenities.',
  'Very large — Queenstown is one of the world''s most international seasonal worker towns. Huge populations from UK, Ireland, South America (Argentina, Chile, Brazil), France, Germany, Japan, and many other countries. Extremely multicultural and social.',
  -5, 3, 'medium', 30
) ON CONFLICT DO NOTHING;

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
  '54', 'Mt Hutt',
  (SELECT id FROM public.regions WHERE legacy_id = '6' LIMIT 1),
  'New Zealand', 'Canterbury''s premier ski field, consistently voted New Zealand''s best ski resort by World Ski Awards. Operated by NZSki, Mt Hutt sits on the eastern edge of the Southern Alps offering incredible panoramic views across the Canterbury Plains to the Pacific Ocean. Known for its early opening (often the first resort in NZ to open) and reliable snow thanks to altitude and snowmaking. The base town of Methven is a charming rural Canterbury community. While the ski area itself is smaller than northern hemisphere resorts, the terrain is varied and the snow quality excellent.', -43.4833, 171.5333,
  'Canterbury', 'Methven', 'https://www.mthutt.co.nz', 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1200&q=80',
  365, 40, 10, 14, 10, 6,
  683, 1490, 2086, 5, '{"gondolas":0,"chairlifts":3,"surface_lifts":2}'::jsonb,
  400, '2026-06-06', '2026-10-11',
  ARRAY['NZSki Ltd (Mt Hutt resort operations)', 'Mt Hutt Ski School', 'Methven hotels and lodges', 'Brinkley Resort', 'The Terrace Downs Resort (nearby)', 'Methven restaurants, cafés, and bars', 'Canterbury farming operations (shoulder season)']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Snowmaker', 'Café / Restaurant Staff', 'Kitchen Staff', 'Lodge / Hotel Reception', 'Rental Shop Staff', 'Grooming Operator', 'Bartender / Server']::text[], '300–500', ARRAY['English']::text[],
  'Working Holiday Visa available for citizens of over 40 countries. New Zealand WHVs valid for 12 months (some nationalities up to 23 months). Methven is a regional area which can help with visa eligibility. NZSIA or equivalent certification required for instructor roles.', 'NZSki begins hiring for Mt Hutt in March–April. Methven hospitality businesses hire April–May. Smaller operation than Queenstown — fewer positions but also less competition. Shoulder season farm work available in Canterbury.',
  true, 200, 'NZD $140–$220/week shared',
  'NZD $280–$400 (housing, food, transport — Methven is more affordable than Queenstown)', 'NZSki shuttle bus from Methven to Mt Hutt ski area (30 min up the mountain road). Limited public transport in Methven — most workers cycle or share cars. Christchurch is 90 min drive. InterCity bus to Christchurch from Ashburton (30 min from Methven).', ARRAY['Free or discounted season pass (Mt Hutt + NZSki resorts)', 'Staff meals at resort café', 'Pro deals on gear', 'Affordable small-town living', 'Canterbury farming work in shoulder season', 'Proximity to Christchurch for city trips']::text[],
  'Methven offers a relaxed, small-town après scene. The Blue Pub (Methven Hotel) is the main gathering spot for seasonal workers with pool tables, live music, and cheap pints. The Canterbury Hotel and Café 131 are also popular. Last Post and Brown Pub round out the options. The atmosphere is friendly and unpretentious — everyone knows everyone. For bigger nights out, Christchurch is 90 minutes away.', ARRAY['Hiking (Mt Somers Track, Rakaia Gorge)', 'Mountain biking (Canterbury trails)', 'Jet boating (Rakaia Gorge)', 'Hot pools (Methven Hot Pools)', 'Fishing (Rakaia and Rangitata rivers)', 'Rock climbing', 'Horse trekking', 'Day trips to Christchurch']::text[], 'Methven Medical Centre for GP visits. Ashburton Hospital (30 min) for emergencies. Christchurch Hospital (90 min) for major trauma. ACC covers injury treatment costs for all workers and visitors in New Zealand.', 'Methven has a Four Square supermarket, pharmacy, petrol station, café/bakeries, and basic shops. Ashburton (30 min) has a New World, Pak''nSave, The Warehouse, and fuller services. Christchurch (90 min) for everything else.',
  'Small to medium — Mt Hutt''s seasonal community is smaller and more intimate than Queenstown. Mix of New Zealanders, Argentinians, Japanese, and Europeans. Methven is friendly and welcoming with a genuine small-town New Zealand feel.',
  -5, 3, 'medium', 35
) ON CONFLICT DO NOTHING;

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
  '6', 'Valle Nevado',
  (SELECT id FROM public.regions WHERE legacy_id = '5' LIMIT 1),
  'Chile', 'South America''s premier ski destination, perched high in the Andes at 2,860–3,670m elevation, just 60km (90 min drive) from Santiago. Valle Nevado links with La Parva and El Colorado to form the largest interconnected ski area in South America with over 40 lifts and 2,200+ hectares combined. Purpose-built in 1988 by a French consortium, the resort has a modern European feel. The proximity to Santiago and excellent Andean powder make it popular with both locals and international visitors. Northern hemisphere ski teams frequently train here during the southern winter.', -33.3608, -70.2483,
  'Santiago Metropolitan Region', 'Santiago (60 km)', 'https://www.vallenevado.com', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
  900, 40, 10, 16, 10, 4,
  810, 2860, 3670, 14, '{"gondolas":1,"chairlifts":9,"surface_lifts":4}'::jsonb,
  700, '2026-06-15', '2026-10-15',
  ARRAY['Valle Nevado Ski Resort (resort operations)', 'Hotel Valle Nevado', 'Hotel Puerta del Sol', 'Hotel Tres Puntas', 'Valle Nevado ski school', 'Resort restaurants and bars', 'La Parva Ski Resort (linked)', 'El Colorado Ski Resort (linked)']::text[], ARRAY['Ski/Snowboard Instructor', 'Hotel Front Desk / Concierge', 'Kitchen Staff / Chef', 'Bartender / Server', 'Lift Operator', 'Housekeeping', 'Snowmaker', 'Rental Shop Staff', 'Guest Services / Ski Patrol']::text[], '400–700', ARRAY['Spanish', 'English']::text[],
  'Chile offers Working Holiday Visas to citizens of several countries including Australia, New Zealand, Canada, France, Germany, and others. The ''Visa Temporaria'' (temporary visa) can be obtained for seasonal work with an employer contract. Alternatively, many South American nationals work without visa requirements under Mercosur-associated agreements. English-speaking instructors are in demand. Spanish language is very helpful for daily life.', 'Resort hiring begins in April–May for the June–October season. Instructor positions fill early. Hotel and hospitality roles hired through May. Applications via Valle Nevado website or Chilean recruitment agencies.',
  true, 300, 'CLP $200,000–$400,000/month (~USD $200–$400) shared, often employer-subsidized',
  'CLP $100,000–$180,000 (~USD $100–$180, resort-based living)', 'Daily shuttle buses from Santiago to Valle Nevado (90 min, road conditions permitting). No public transport on the mountain — the resort is self-contained. Resort shuttle between Valle Nevado, La Parva, and El Colorado. Santiago has Metro and excellent bus network.', ARRAY['Free or discounted season pass', 'Staff meals at resort', 'Subsidized staff accommodation (on-mountain)', 'Pro deals on gear', 'Access to three linked resorts', 'Santiago city access on days off']::text[],
  'Valle Nevado has a self-contained après scene within the resort complex. Bar Lounge Valle Nevado is the main gathering spot. Hotel Valle Nevado has an upscale bar and restaurant. Under Lounge offers a more casual vibe. On clear days, the Terraza restaurant has incredible Andean sunset views with pisco sours. For a bigger night out, the 90-minute ride to Santiago opens up one of South America''s most vibrant cities — Barrio Bellavista, Lastarria, and Providencia are popular nightlife districts.', ARRAY['Heliskiing (organized by resort)', 'Backcountry touring (Andean peaks)', 'Snowshoeing', 'Santiago day trips (world-class restaurants, museums, nightlife)', 'Wine tours (Maipo Valley, Casablanca Valley)', 'Hiking (Cajon del Maipo)', 'Hot springs (Termas de Colina, 30 min)', 'Mountain biking (Santiago hills)']::text[], 'Valle Nevado has an on-mountain medical centre for ski injuries. Clinica Las Condes and Clinica Alemana in Santiago (90 min) are world-class private hospitals. Chilean public healthcare (FONASA) available to workers with contracts. Travel insurance strongly recommended.', 'Valle Nevado resort has a small shop, rental centre, and ski school. Very limited on-mountain services — the resort is self-contained. Santiago (90 min) has everything: malls, supermarkets (Jumbo, Lider), outdoor gear shops, and all urban amenities.',
  'Medium — Valle Nevado attracts international seasonal workers, particularly from Argentina, Brazil, Australia, and Europe. Northern hemisphere ski instructors come for summer training. The Santiago proximity adds diversity. English widely spoken in the resort.',
  -5, 5, 'medium', 15
) ON CONFLICT DO NOTHING;

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
  '55', 'Cerro Catedral',
  (SELECT id FROM public.regions WHERE legacy_id = '5' LIMIT 1),
  'Argentina', 'South America''s most developed and largest ski resort, located 20km from the beautiful lakeside city of San Carlos de Bariloche in Argentine Patagonia. With 600 hectares of skiable terrain, 53 runs, and 39 lifts, Cerro Catedral offers the most extensive infrastructure of any South American ski area. The resort is set against a stunning backdrop of Nahuel Huapi Lake, snow-capped Andean peaks, and ancient Patagonian forests. Bariloche is known as the ''Chocolate Capital'' of Argentina and has a distinct Swiss-Alpine character.', -41.1647, -71.4411,
  'Río Negro', 'San Carlos de Bariloche', 'https://www.catedralaltapatagonia.com', 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80',
  600, 53, 12, 20, 14, 7,
  1010, 1030, 2100, 39, '{"gondolas":1,"chairlifts":16,"surface_lifts":22}'::jsonb,
  450, '2026-06-15', '2026-10-01',
  ARRAY['Catedral Alta Patagonia S.A. (resort operations)', 'Hotel Catedral Ski Resort', 'Llao Llao Hotel & Resort (luxury, nearby)', 'Bariloche hotels and hostels', 'Cerro Catedral ski school', 'Bariloche restaurants, chocolate shops, and bars', 'Tour operators and adventure companies', 'Chocolate factories (Mamuschka, Rapa Nui, Del Turista)']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Staff (front desk, housekeeping)', 'Kitchen Staff / Chef', 'Bartender / Server', 'Rental Shop Staff', 'Tour Guide', 'Chocolate Shop Sales', 'Ski Patrol / Mountain Safety', 'Guest Services']::text[], '1,000–1,800', ARRAY['Spanish', 'English']::text[],
  'Argentina offers Working Holiday Visas to citizens of Australia, New Zealand, France, Germany, Denmark, Norway, South Korea, Japan, and others. Valid for 12 months. For other nationalities, a ''Residencia Temporaria'' (temporary residence) permit is needed with an employer contract. Brazilian citizens can work freely under Mercosur. Spanish is essential for daily life in Bariloche; English is a strong asset for tourism roles.', 'Resort and hotels begin hiring in April–May. Ski school instructor positions fill first. Bariloche hospitality businesses hire through May–June. Walk-in applications are common for bar and restaurant work. Argentine labour market is more informal than northern hemisphere resorts.',
  true, 500, 'ARS $150,000–$300,000/month (~USD $150–$300) shared',
  'ARS $80,000–$150,000 (~USD $80–$150, very affordable by international standards)', 'Regular bus service from Bariloche to Cerro Catedral base (20 min, Micro 55 line). Bariloche has a well-connected bus network. Long-distance buses to Buenos Aires (20 hrs), Mendoza, and other Argentine cities. Bariloche Airport has flights to Buenos Aires (2.5 hrs), Mendoza, and other cities.', ARRAY['Discounted season pass', 'Staff meals at some employers', 'Very affordable cost of living', 'World-class Patagonian scenery', 'Asado (BBQ) culture', 'Affordable ski gear in Argentina', 'Access to incredible backcountry']::text[],
  'Bariloche is a vibrant city with a fantastic food, drink, and chocolate scene. At the base of Cerro Catedral, the Base Lodge has a popular bar. In town, Cerveceria Berlina and Cerveceria Wesley brew excellent Patagonian craft beer. Manush is a standout craft brewery. Popular bars include South Bar, Pilgrim, and Cerebro. Bariloche''s Calle Mitre is lined with famous chocolate shops — Mamuschka, Rapa Nui, and Del Turista. Traditional Patagonian lamb asado is a must-try. The nightlife runs late in true Argentine fashion.', ARRAY['Hiking in Nahuel Huapi National Park', 'Lake tours on Nahuel Huapi Lake', 'Backcountry touring (Cerro Lopez, Cerro Tronador)', 'Dog sledding', 'Snowshoeing', 'Chocolate factory tours', 'Craft brewery circuit', 'Fishing (fly fishing on Rio Limay)', 'Mountain biking', 'Visit Circuito Chico scenic drive']::text[], 'Hospital Zonal Dr. Ramon Carrillo in Bariloche (public hospital with emergency department). Clinica San Carlos (private clinic). Sanatorio del Sol (private). Argentine public healthcare is free but insurance is recommended for faster service. Mountain rescue team at Cerro Catedral.', 'Bariloche is a full city with supermarkets (La Anonima, Carrefour, Todo), outdoor gear shops, chocolate shops, banks, pharmacies, and all urban amenities. Calle Mitre is the main shopping street. Centro Civico is the town square.',
  'Medium to large — Bariloche attracts seasonal workers from Brazil, Chile, Colombia, and a growing number of Europeans and Australians. The city has a cosmopolitan feel with its Swiss-German heritage architecture. Spanish is essential but English is increasingly useful in tourism.',
  -5, 4, 'medium', 10
) ON CONFLICT DO NOTHING;

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
  '56', 'Portillo',
  (SELECT id FROM public.regions WHERE legacy_id = '5' LIMIT 1),
  'Chile', 'A legendary all-inclusive ski resort perched at 2,880m in the Andes above the stunning turquoise Laguna del Inca, near the Argentine border. Portillo is one of the oldest ski resorts in South America (opened 1949), famous for hosting the 1966 World Ski Championships — the only time the event has been held in South America. The resort operates as a self-contained hotel complex with no surrounding town, limiting daily visitors to 450 to ensure uncrowded slopes. World ski speed records have been set on its slopes, and it is a favourite summer training ground for northern hemisphere race teams.', -32.8356, -70.1264,
  'Valparaíso Region', 'Los Andes', 'https://www.skiportillo.com', 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1200&q=80',
  240, 35, 6, 12, 11, 6,
  910, 2580, 3310, 14, '{"gondolas":0,"chairlifts":5,"surface_lifts":9}'::jsonb,
  700, '2026-06-20', '2026-10-10',
  ARRAY['Ski Portillo S.A. (resort and hotel operations)', 'Hotel Portillo (all-inclusive)', 'Octagon Lodge', 'Inca Lodge', 'Portillo ski school', 'Resort restaurants and bars']::text[], ARRAY['Ski/Snowboard Instructor', 'Hotel Front Desk / Concierge', 'Kitchen Staff / Chef', 'Bartender / Server', 'Housekeeping', 'Lift Operator', 'Ski Patrol', 'Rental Shop Staff', 'Childcare / Kids Club', 'Maintenance / Facilities']::text[], '200–350', ARRAY['Spanish', 'English']::text[],
  'Chile offers Working Holiday Visas to citizens of Australia, New Zealand, Canada, France, Germany, and others. Portillo also directly sponsors seasonal workers. Many staff are Chilean nationals. English-speaking instructors are in high demand as the resort attracts many North American and European guests. Spanish is helpful but less critical than at other Chilean resorts given the international clientele.', 'Portillo begins hiring in March–April for the late June–October season. The all-inclusive model means all staff live on-site, creating a unique community. Applications through Ski Portillo website. Instructor roles filled early. Hotel and hospitality roles filled by May.',
  true, 200, 'Free (included with employment — all-inclusive model)',
  'Minimal — meals and accommodation included. USD $30–$50 for personal expenses', 'Portillo is 164km from Santiago (2.5 hr drive, road conditions permitting). Resort provides staff transport from Santiago at start/end of season. No public transport to the resort — it is completely self-contained. Some staff trips to Los Andes or Santiago on days off (arranged by resort).', ARRAY['Free accommodation and meals (all-inclusive)', 'Free season pass', 'Unique live-in resort community', 'Legendary staff parties and social events', 'Training alongside World Cup ski teams', 'Pro deals on gear', 'Swimming pool and gym access', 'One of the most scenic workplaces in the world']::text[],
  'Portillo''s all-inclusive, self-contained nature creates a uniquely intimate social scene — often compared to a cruise ship in the mountains. The Hotel Portillo bar is the heart of après-ski, with guests and staff mingling over pisco sours and Chilean wine. The resort hosts weekly themed parties, live music, and movie nights. The famous Portillo pool party (heated outdoor pool surrounded by snow) is a signature experience. With only 450 guests maximum, everyone gets to know each other. It''s one of skiing''s most legendary social atmospheres.', ARRAY['Heliskiing (organized by resort)', 'Backcountry touring (Andean peaks)', 'Swimming (heated outdoor pool overlooking Laguna del Inca)', 'Fitness centre and gym', 'Photography (Laguna del Inca is spectacularly scenic)', 'Hiking (when conditions allow)', 'Star gazing (high altitude, no light pollution)']::text[], 'Portillo has an on-site medical clinic staffed during the season. Helicopter evacuation available for serious emergencies. Hospital San Juan de Dios in Los Andes (1.5 hrs). Santiago hospitals (2.5 hrs) for major medical needs. Travel insurance strongly recommended.', 'Extremely limited — Portillo is self-contained with a small resort shop for essentials and souvenirs. Rental centre and ski school on site. All meals provided. For any significant shopping, a trip to Los Andes or Santiago is required.',
  'Medium — Portillo has a very international staff and guest base despite its small size. Staff come from Chile, Argentina, USA, Australia, and Europe. The live-in community creates incredibly strong bonds. Northern hemisphere race teams (USA, Canada, European national teams) train here, adding to the international feel.',
  -6, 4, 'medium', 5
) ON CONFLICT DO NOTHING;

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
  '8', 'Åre',
  (SELECT id FROM public.regions WHERE legacy_id = '4' LIMIT 1),
  'Sweden', 'Scandinavia''s largest and most prestigious alpine ski resort, located in the Jämtland region of central Sweden. Host of the FIS Alpine World Ski Championships (2007, 2019). Three interconnected ski areas: Åre By, Duved, and Tegefjäll. Known for challenging off-piste, tree skiing, and a vibrant village atmosphere. Also a popular summer destination for mountain biking and hiking.', 63.3987, 13.0817,
  'Jämtland', 'Åre Village', 'https://www.skistar.com/en/are', 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?w=1200&q=80',
  450, 89, 15, 36, 26, 12,
  890, 380, 1274, 41, '{"gondolas":2,"chairlifts":13,"surface_lifts":26}'::jsonb,
  400, '2025-11-20', '2026-05-01',
  ARRAY['SkiStar AB (lift operations and resort management — publicly traded company)', 'Copperhill Mountain Lodge', 'Holiday Club Åre', 'Hotel Åregården', 'Diplomat Ski Lodge', 'Åre Ski School (SkiStar)', 'Broken Bar & Grill', 'Bygget (après bar)', 'Tott Hotel']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Rental Shop Staff', 'Ski Technician', 'Kids Ski School Instructor', 'Snowmaker / Grooming Operator']::text[], '1,000–1,800', ARRAY['Swedish', 'English']::text[],
  'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need a Swedish work permit, which requires employer sponsorship and proof that the position could not be filled by an EU citizen. Working Holiday Visas are available for Australian, New Zealand, South Korean, and some other nationalities (ages 18–30). UK citizens post-Brexit require work permits.', 'SkiStar begins recruiting in August–September for the winter season. Hotels from September. Bars and restaurants from October. Swedish language is helpful but SkiStar and international hotels hire English speakers for guest-facing roles.',
  true, 600, 'SEK 4,000–6,500/month shared (approx. EUR €350–€570)',
  'SEK 2,500–4,000 (approx. EUR €220–€350 — housing, food, transport)', 'SJ (Swedish Railways) train to Åre station — direct night trains from Stockholm (7 hrs) and Gothenburg. SkiStar ski bus between Åre, Duved, and Tegefjäll. Åre Östersund Airport (1 hr) with connections to Stockholm.', ARRAY['Discounted or free SkiStar season pass', 'Staff meals at some employers', 'Accommodation sometimes arranged through employer', 'Pro deals on gear', 'Access to Åre''s summer activities (mountain biking, hiking)']::text[],
  'Lively Scandinavian après culture. Bygget is the iconic après-ski bar in the square — packed from 3pm with DJs and dancing on tables. Broken Bar & Grill for cocktails. Diplomat Ski Lodge''s Wersén bar. Country Club for late-night. Supper Club for fine dining. Åre''s nightlife is the best in Scandinavia. Midsommar celebrations in summer are legendary.', ARRAY['Off-piste and backcountry skiing', 'Cross-country skiing (extensive trails)', 'Snowmobiling', 'Dog sledding', 'Ice fishing', 'Northern Lights viewing', 'Snowshoeing', 'Fat biking']::text[], 'Åre Hälsocentral (health centre) with doctors. Pharmacy in the village. Nearest hospital: Östersunds sjukhus (Östersund Hospital, 1 hr by car/train).', 'ICA supermarket, Systembolaget (state liquor store), bakeries, banks, ATMs, gear shops, and boutiques in the village square. Östersund (1 hr) for larger shopping needs.',
  'Moderate — predominantly Swedish seasonal workforce with growing numbers of international workers, particularly from other Nordic countries, the UK, and Australia. English widely spoken. SkiStar actively recruits internationally.',
  -20, -5, 'high', 30
) ON CONFLICT DO NOTHING;

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
  '9', 'Gudauri',
  (SELECT id FROM public.regions WHERE legacy_id = '7' LIMIT 1),
  'Georgia', 'An affordable and uncrowded freeride paradise in the Greater Caucasus range, 2 hours north of Tbilisi. Gudauri has emerged as one of Europe''s most exciting emerging ski destinations with excellent powder, heli-skiing, and dramatic Caucasian mountain scenery. The resort has seen major investment in modern lift infrastructure. Popular with budget-conscious freeriders and digital nomads.', 42.4617, 44.4703,
  'Mtskheta-Mtianeti', 'Gudauri', 'https://gudauri.info', 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1200&q=80',
  350, 22, 4, 9, 6, 3,
  1258, 1990, 3279, 12, '{"gondolas":1,"chairlifts":7,"surface_lifts":4}'::jsonb,
  400, '2025-12-01', '2026-04-30',
  ARRAY['Gudauri Ski Resort (New Gudauri development)', 'Rooms Hotel Gudauri', 'Marco Polo Hotel Gudauri', 'Gudauri Hut', 'New Gudauri Residences', 'Gudauri Freeride (ski school/guiding)', 'Heliksir Heli-Skiing', 'Various guesthouses and small hotels']::text[], ARRAY['Ski/Snowboard Instructor', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Mountain Guide / Freeride Guide', 'Rental Shop Staff', 'Transfer Driver', 'Hostel Staff']::text[], '500–1,000', ARRAY['Georgian', 'English', 'Russian']::text[],
  'Citizens of 98 countries (including all EU, UK, USA, Canada, Australia, New Zealand) can enter Georgia visa-free for up to 1 year and can legally work. Georgia has one of the most liberal visa regimes in the world for seasonal workers. No work permit required for most Western nationalities — simply arrive and find work.', 'Hiring is less formalised than Western European resorts. Hotels and guesthouses hire October–November. Ski schools and guiding operations from November. Many positions are found through word of mouth and on-the-ground networking. The digital nomad community posts opportunities online.',
  true, 300, 'GEL 400–800/month (approx. EUR €130–€270) for a shared apartment',
  'GEL 250–500 (approx. EUR €85–€170 — extremely affordable)', 'Shared minibuses (marshrutkas) run between Gudauri and Tbilisi (2 hrs, very cheap). No regular public transport within Gudauri itself — walkable or taxi. Tbilisi International Airport 2.5 hrs.', ARRAY['Extremely low cost of living', 'Affordable season pass (fraction of Alpine prices)', 'Incredible freeride terrain with few crowds', 'Heli-skiing at affordable rates', 'Georgian hospitality and food culture']::text[],
  'Growing but still developing scene. The Gudauri Hut is the main gathering spot. Rooms Hotel bar for cocktails. New Gudauri complex has several restaurants and bars. Loft Gudauri. Various small bars and restaurants along the main road. The scene is more about hearty Georgian feasts (supra) with local wine, chacha (grape brandy), and khinkali than European-style après bars.', ARRAY['Freeride and backcountry skiing (vast terrain)', 'Heli-skiing (Mt. Kazbegi area)', 'Paragliding', 'Snowshoeing', 'Cross-country skiing', 'Snowmobiling', 'Day trips to Tbilisi (2 hrs — vibrant city with thermal baths)', 'Georgian wine tasting', 'Visiting Ananuri Fortress and Jvari Monastery']::text[], 'Small medical clinic in Gudauri for basic treatment. Nearest proper hospital: hospitals in Tbilisi (2 hrs). Travel/ski insurance strongly recommended. Mountain rescue exists but is less organised than Western European resorts.', 'Small grocery shops and minimarkets in Gudauri. Limited services compared to European resorts. Tbilisi (2 hrs) for any significant shopping. ATMs available. SIM cards cheap and easy to obtain.',
  'Growing — Gudauri has attracted a community of international freeriders, digital nomads, and seasonal workers from Russia, Ukraine, Israel, and Western Europe. English is increasingly spoken. The combination of visa-free entry, low costs, and great skiing is drawing more internationals each season.',
  -10, 0, 'high', 0
) ON CONFLICT DO NOTHING;

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
  '10', 'Grandvalira',
  (SELECT id FROM public.regions WHERE legacy_id = '8' LIMIT 1),
  'Andorra', 'The largest ski area in the Pyrenees and southern Europe, spread across six sectors: Pas de la Casa, Grau Roig, Soldeu, El Tarter, Canillo, and Encamp. Nestled in the tiny principality of Andorra between France and Spain, Grandvalira offers 210km of runs, duty-free shopping, and a unique blend of Catalan, Spanish, and French culture. Popular with budget-conscious skiers from Spain, France, and the UK.', 42.5558, 1.6742,
  'Andorra', 'Soldeu / El Tarter', 'https://www.grandvalira.com', 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1200&q=80',
  1926, 128, 22, 51, 38, 17,
  930, 1710, 2640, 63, '{"gondolas":3,"chairlifts":30,"surface_lifts":30}'::jsonb,
  350, '2025-12-01', '2026-04-15',
  ARRAY['Grandvalira-Ensisa (lift and resort operations)', 'Sport Hotel Hermitage & Spa (Soldeu)', 'Hotel Grau Roig', 'Hotel Piolets Park & Spa (Soldeu)', 'Sol y Nieve Ski School', 'Grandvalira Ski School', 'Pas de la Casa bars and duty-free shops', 'Caldea Spa (Escaldes-Engordany)']::text[], ARRAY['Ski/Snowboard Instructor', 'Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Retail Sales (duty-free)', 'Ski Technician', 'Resort Representative', 'Kids Club Staff']::text[], '2,000–3,500', ARRAY['Catalan', 'Spanish', 'French', 'English']::text[],
  'Andorra is not part of the EU or Schengen area. Work permits (autorització d''immigració) are required for all foreign workers, including EU citizens. Employers must apply on your behalf. Permits are typically tied to the employer. Andorra has bilateral agreements with Spain, France, and Portugal. The process can be slow — start early. No income tax in Andorra (low tax jurisdiction).', 'Hotels and the lift company begin recruiting August–September. Ski schools from September. Bars and shops from October. Multilingual candidates (especially Spanish + French + English) are in very high demand. Many workers commute from nearby Spanish or French border towns.',
  true, 1000, 'EUR €400–€700/month shared (Andorra uses EUR)',
  'EUR €200–€350 (housing, food, transport — duty-free status keeps some costs low)', 'Free ski bus between Grandvalira sectors. Regular bus service between Andorran towns (operated by Coopalsa and Autocars Nadal). Bus to Toulouse Airport (3 hrs) and Barcelona Airport (3.5 hrs). No railway or airport in Andorra.', ARRAY['Discounted season pass', 'Staff meals at hotels', 'No income tax in Andorra', 'Duty-free shopping (electronics, alcohol, tobacco, perfume)', 'Access to Caldea thermal spa (discounted)']::text[],
  'Pas de la Casa is the party hub — essentially a duty-free party town on the French border. Underground Bar, Paddy''s Irish Bar, Milwaukee, KSB (Ku de Sa Bar), and La Nit nightclub. Soldeu is more relaxed: Fat Albert''s (legendary British bar), Villager Bar, and Aspen Bar. Pas de la Casa''s cheap alcohol and proximity to French university towns make it wild on weekends.', ARRAY['Snowshoeing', 'Dog sledding', 'Snowmobiling', 'Ice karting', 'Caldea Spa (Europe''s largest thermal leisure centre)', 'Duty-free shopping in Andorra la Vella', 'Cross-country skiing', 'Naturlandia (adventure park — toboggan run)']::text[], 'Hospital Nostra Senyora de Meritxell in Escaldes-Engordany/Andorra la Vella (20–30 min from slopes) — Andorra''s main hospital with full emergency services. Medical centres in Soldeu and Pas de la Casa. Pharmacies in each village.', 'Duty-free shopping is a major draw — electronics, perfume, tobacco, alcohol at reduced prices. Andorra la Vella has large commercial centres (Pyrénées department store, Illa Carlemany). Supermarkets (BonPreu, Carrefour) in the towns. Banks, ATMs, and services throughout.',
  'Large — very international workforce with significant Spanish, French, Portuguese, and South American communities. Growing British and Eastern European presence. Andorra''s multilingual nature means diverse nationalities. Many workers are cross-border commuters from Spain and France.',
  -5, 5, 'medium', 60
) ON CONFLICT DO NOTHING;

-- ── Update business_resorts to support UUID resort references ──
-- Change resort_id column type from text to uuid if needed
-- (keeping as text for now since it may have existing data)

-- Create a view for easy resort lookup by legacy_id
CREATE OR REPLACE VIEW public.resort_lookup AS
SELECT id, legacy_id, name, country FROM public.resorts;


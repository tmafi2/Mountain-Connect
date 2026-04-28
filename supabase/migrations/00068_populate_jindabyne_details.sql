-- ============================================================
-- Migration 00068: Populate Jindabyne town page content
-- ============================================================
-- Migrations 00025 (rich detail fields) and 00028 (hero image) both
-- ran their UPDATE statements for Jindabyne BEFORE the Jindabyne row
-- existed, so the row was added blank by 00066 and the town page
-- has been mostly empty.
--
-- This re-applies the original content. The WHERE slug = 'jindabyne'
-- guard makes it idempotent — running twice is harmless. Each
-- assignment also coalesces with the existing value so anything an
-- admin has already filled in via a future UI is preserved.
-- ============================================================

UPDATE nearby_towns SET
  state_region = COALESCE(state_region, 'New South Wales'),
  population_permanent = COALESCE(population_permanent, 7000),
  population_seasonal = COALESCE(population_seasonal, 15000),
  website = COALESCE(website, 'https://www.visitjindabyne.com.au'),
  hero_image_url = COALESCE(hero_image_url, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80'),
  staff_housing_available = COALESCE(staff_housing_available, true),
  avg_rent_weekly = COALESCE(avg_rent_weekly, 'AUD $250–$400/week shared; AUD $450–$700 solo'),
  housing_demand = COALESCE(housing_demand, 'Very high — start looking in Feb/Mar for June start. Many workers share houses.'),
  temporary_stay_options = COALESCE(temporary_stay_options, 'Hostels (Banjo Paterson Inn, Jindy Inn), Airbnb, caravan parks nearby.'),
  public_transport_to_resort = COALESCE(public_transport_to_resort, 'Free ski-season shuttle buses to Perisher (Skitube at Bullocks Flat). Thredbo buses available but less frequent. Most workers carpool.'),
  parking_availability = COALESCE(parking_availability, 'Free town parking. Resort parking is paid and limited — shuttles recommended.'),
  distance_to_airport = COALESCE(distance_to_airport, 'Canberra Airport ~190km (2hr drive). Sydney Airport ~470km (5hr drive).'),
  road_conditions = COALESCE(road_conditions, 'Alpine Way and Kosciuszko Road require snow chains in winter. Roads are well-maintained but can close in heavy snow.'),
  weekly_cost_estimate = COALESCE(weekly_cost_estimate, 'AUD $400–$600/week including rent, food, and transport'),
  supermarkets = COALESCE(supermarkets, 'IGA Jindabyne, plus smaller shops. Cooma (60km) has Woolworths and Aldi for bigger shops.'),
  eating_out = COALESCE(eating_out, 'AUD $15–$25 for a pub meal. Coffee ~$5. Good range of cafés and restaurants.'),
  local_employers = COALESCE(local_employers, 'Thredbo Resort, Perisher Resort, Jindabyne hotels and restaurants, rental shops, tour operators.'),
  extra_job_opportunities = COALESCE(extra_job_opportunities, 'Hospitality in town (bars, restaurants, cafés), retail, childcare, cleaning services.'),
  bars_nightlife = COALESCE(bars_nightlife, 'Banjo Paterson Inn is the main party spot. The Station bar, Lake Jindabyne Hotel. Lively scene on weekends.'),
  restaurants_cafes = COALESCE(restaurants_cafes, 'Birchwood Café, Takahagi Sushi, Wildbrumby Distillery, The Terrace. Mix of casual and upscale.'),
  gyms_fitness = COALESCE(gyms_fitness, 'Snowy Mountains Fitness Centre, plus resort gyms with staff access.'),
  shops_services = COALESCE(shops_services, 'Ski hire shops, outdoor gear stores, hairdressers, post office, petrol stations.'),
  events_festivals = COALESCE(events_festivals, 'Snowy Mountains Craft Beer Festival, Jindabyne Canoe Club events, resort-hosted parties.'),
  medical_facilities = COALESCE(medical_facilities, 'Jindabyne Medical Centre (GP), nearest hospital is Cooma Hospital (60km).'),
  emergency_services = COALESCE(emergency_services, 'Police, ambulance, fire brigade all in Jindabyne. SES for alpine emergencies.'),
  vibe_atmosphere = COALESCE(vibe_atmosphere, 'Tight-knit seasonal worker community with a fun, adventurous vibe. Everyone knows everyone by mid-season.'),
  international_workforce = COALESCE(international_workforce, 'Large international community — UK, Ireland, South America, Japan. English is primary language.'),
  social_life = COALESCE(social_life, 'House parties, pub nights, lake activities in summer, hiking, mountain biking. Very social community.'),
  avg_winter_temp = COALESCE(avg_winter_temp, '-2°C to 8°C in town (colder on the mountain)'),
  snowfall_in_town = COALESCE(snowfall_in_town, 'Occasional dustings but town rarely gets proper snow cover. Resorts get 1.5–2m+ annually.'),
  summer_appeal = COALESCE(summer_appeal, 'Lake Jindabyne is a major summer destination — kayaking, fishing, mountain biking, hiking.'),
  best_time_to_arrive = COALESCE(best_time_to_arrive, 'Late May to early June. Some employers start hiring in March.'),
  community_groups = COALESCE(community_groups, 'Jindabyne Seasonal Workers Facebook group, Snowy Mountains Backpackers community.'),
  insider_tips = COALESCE(insider_tips, 'Get a Snowy Mountains car and invest in good snow chains. Join the Facebook housing groups early. Staff passes get you discounted food on-mountain.'),
  updated_at = now()
WHERE slug = 'jindabyne';

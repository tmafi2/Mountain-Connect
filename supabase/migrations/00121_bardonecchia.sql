-- 00121 — Bardonecchia, resort and town
--
-- ⚠️ NAMED BY REAL ADVERTS WE THREW AWAY, the same way Val di Sole and Alta
-- Badia were in 00119. Two of the 2026-10-12 Italian posts advertise jobs in
-- Bardonecchia — a ristorante-pizzeria hiring a cameriere for a December
-- start, and a restaurant wanting caffetteria and sala staff — and both were
-- rejected because there is no row to attach them to.
--
-- ⚠️ BARDONECCHIA IS NOT ON THE VIA LATTEA, which is the easy mistake to make
-- with a Susa Valley resort. Sauze d'Oulx and Sestriere (00116) share the Via
-- Lattea circuit and its pass; Bardonecchia is a separate area 20km down the
-- valley with its own pass and its own lift company. Treating it as part of
-- that circuit would be wrong on the resort page and wrong to a worker
-- deciding where a season pass reaches.
--
-- ⚠️ A RESORT ROW IS NOT A RESORT: /resorts/[id] renders from the static
-- lib/data/resorts.ts array keyed on legacy_id, so a row without a static
-- entry 404s its own page. Both halves are in this commit. See 00103, which
-- shipped them apart.
--
-- The TOWN ships here too, rather than being left for a follow-up the way
-- 00119 left Malé and Corvara for 00120. Bardonecchia is one of the cases
-- where the town and the resort are the same place — Campo Smith, the main
-- base, is in the town itself — so there is no research to defer.
--
-- Figures are the operator's own (COLOMION S.p.A., bardonecchiaski.com: 100km
-- of piste, 23 lifts) and the comune's. Estimates stay NULL as in 00116:
-- seasonal staff numbers, housing capacity and rent, cost of living, snowfall
-- and winter temperatures are not published per resort in a form worth
-- trusting. main_employers names the lift company and employer CATEGORIES —
-- inventing hotel names would put fictional businesses on a public page.

BEGIN;

CREATE TEMP TABLE _resorts_before ON COMMIT DROP AS
  SELECT id, legacy_id, name FROM resorts;
CREATE TEMP TABLE _towns_before ON COMMIT DROP AS
  SELECT id, slug, name FROM nearby_towns;

INSERT INTO resorts (
  name, legacy_id, country, state_province, nearest_town,
  latitude, longitude, website,
  num_runs, num_lifts, vertical_drop_m, base_elevation_m, summit_elevation_m,
  season_start, season_end, snow_reliability, staff_housing_available,
  description, main_employers, common_jobs, languages_required,
  visa_requirements, recruitment_timeline, public_transport,
  region_id, banner_image_url, is_verified
)
SELECT v.*,
       (SELECT region_id FROM resorts WHERE legacy_id = '40' LIMIT 1),  -- Livigno's Europe region
       '/resorts/countries/italy.jpg', false
FROM (VALUES
    ('Bardonecchia', '123', 'Italy', 'Piedmont', 'Bardonecchia',
     45.0781, 6.6994, 'https://www.bardonecchiaski.com',
     39, 23, 1495, 1312, 2807,
     DATE '2026-11-28', DATE '2027-04-11', 'medium', true,
     'The westernmost town in Italy, at the head of the Susa Valley and right on the French border, with about 100km of piste on 23 lifts across three sectors: Campo Smith in the town itself, the tree-lined Colomion and Melezet runs, and the high open bowls of Jafferau, which top out at 2,807m. It hosted the snowboarding events of the 2006 Turin Winter Olympics. ⚠️ It is NOT on the Via Lattea — Sauze d''Oulx and Sestriere share that circuit and its pass, and Bardonecchia has its own. The Fréjus road and rail tunnels start here, so this is an unusually well-connected mountain town: trains run into the town centre and Modane in France is the next stop.',
     ARRAY['Colomion S.p.A. (the lift company)', 'Hotels and guesthouses in the town', 'Restaurants, pizzerie and bars in the old centre', 'Ski and snowboard schools', 'Mountain restaurants across the three sectors', 'Ski hire and sports shops']::text[],
     ARRAY['Waiter / Waitress', 'Bartender', 'Chef / Kitchen Staff', 'Hotel Receptionist', 'Housekeeping', 'Lift Operator', 'Ski/Snowboard Instructor', 'Ski Technician', 'Shop Assistant']::text[],
     ARRAY['Italian', 'French', 'English']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'Hotels and restaurants recruit from September for a December start. The town is a weekend destination for Turin as well as a resort, so some employers keep staff on through the shoulder season.',
     'A mainline station in the town centre, roughly 1 hr 15 from Turin, with TGV connections into France through the Fréjus rail tunnel. That makes it one of the few Italian ski resorts you can reach, and work in, without a car.')
) AS v(name, legacy_id, country, state_province, nearest_town,
       latitude, longitude, website,
       num_runs, num_lifts, vertical_drop_m, base_elevation_m, summit_elevation_m,
       season_start, season_end, snow_reliability, staff_housing_available,
       description, main_employers, common_jobs, languages_required,
       visa_requirements, recruitment_timeline, public_transport)
WHERE NOT EXISTS (SELECT 1 FROM resorts r WHERE r.legacy_id = '123');

INSERT INTO nearby_towns (
  name, slug, country, state_region, latitude, longitude,
  population_permanent, website, description, distance_to_airport,
  public_transport_to_resort, road_conditions, local_employers,
  extra_job_opportunities, summer_appeal, best_time_to_arrive
)
SELECT * FROM (VALUES
    ('Bardonecchia', 'bardonecchia', 'Italy', 'Piedmont', 45.0781, 6.6994,
     3096, 'https://comune.bardonecchia.to.it',
     'A town of about 3,100 at 1,312m at the head of the Susa Valley, and the westernmost comune in Italy — the French border is walking distance and Modane is the next stop on the train. It grew out of the works for the Fréjus rail tunnel in the 1800s, so unlike most Alpine resorts it was a real town before it was a ski area, with a year-round population and ordinary rents rather than only holiday lets.',
     'Turin (TRN) is about 100km, roughly 1 hr 30 by road. Lyon and Grenoble are reachable through the Fréjus tunnel.',
     'Campo Smith, the main lift base, is in the town itself — most of the resort is walkable. A ski bus links the Melezet and Jafferau bases.',
     'On the SS335 at the end of the A32 motorway from Turin, which is cleared as a priority route because it feeds the Fréjus tunnel. Chains or winter tyres are required in winter.',
     'Hotels and guesthouses, Colomion S.p.A. (the lift company), restaurants, pizzerie and bars in the old centre, ski and snowboard schools, ski hire shops, and the mountain restaurants on all three sectors.',
     'The town is a weekend destination for Turin, 1 hr 15 away by train, as well as a ski resort, so trade does not stop dead between seasons. Being on a mainline also means some residents commute, which keeps year-round services — and year-round jobs — in the town.',
     'Hiking and climbing in the surrounding 3,000m peaks, mountain biking, and the Fréjus tunnel making French Savoie an easy day out.',
     'September for a December start.')
) AS v(name, slug, country, state_region, latitude, longitude,
       population_permanent, website, description, distance_to_airport,
       public_transport_to_resort, road_conditions, local_employers,
       extra_job_opportunities, summer_appeal, best_time_to_arrive)
WHERE NOT EXISTS (SELECT 1 FROM nearby_towns t WHERE t.slug = 'bardonecchia');

-- The town IS the resort base (Campo Smith is in the town), so 0km — unlike
-- Malé in 00120, which is 15km from its lifts and says so.
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
SELECT r.id, t.id, 0, true
FROM resorts r, nearby_towns t
WHERE r.legacy_id = '123' AND t.slug = 'bardonecchia'
  AND NOT EXISTS (
    SELECT 1 FROM resort_nearby_towns l WHERE l.resort_id = r.id AND l.town_id = t.id
  );

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  r_added     int;
  t_added     int;
  linked      int;
  r_touched   int;
  t_touched   int;
  orphaned    int;
  italy_res   int;
  italy_towns int;
BEGIN
  SELECT count(*) INTO r_added FROM resorts WHERE legacy_id = '123';
  IF r_added <> 1 THEN RAISE EXCEPTION 'expected 1 resort, found %', r_added; END IF;

  SELECT count(*) INTO t_added FROM nearby_towns WHERE slug = 'bardonecchia';
  IF t_added <> 1 THEN RAISE EXCEPTION 'expected 1 town, found %', t_added; END IF;

  -- Both halves or neither: a town with no resort link is a page with no
  -- resort, and a resort page with no town.
  SELECT count(*) INTO linked
    FROM resort_nearby_towns l
    JOIN resorts r ON r.id = l.resort_id
    JOIN nearby_towns t ON t.id = l.town_id
   WHERE r.legacy_id = '123' AND t.slug = 'bardonecchia';
  IF linked <> 1 THEN RAISE EXCEPTION 'resort and town are not linked'; END IF;

  -- Nothing that already existed may have moved.
  SELECT count(*) INTO r_touched FROM resorts r JOIN _resorts_before b ON b.id = r.id
   WHERE r.legacy_id IS DISTINCT FROM b.legacy_id OR r.name IS DISTINCT FROM b.name;
  IF r_touched > 0 THEN RAISE EXCEPTION '% pre-existing resort(s) modified', r_touched; END IF;

  SELECT count(*) INTO t_touched FROM nearby_towns t JOIN _towns_before b ON b.id = t.id
   WHERE t.slug IS DISTINCT FROM b.slug OR t.name IS DISTINCT FROM b.name;
  IF t_touched > 0 THEN RAISE EXCEPTION '% pre-existing town(s) modified', t_touched; END IF;

  SELECT count(*) INTO orphaned FROM nearby_towns t
   WHERE t.country = 'Italy'
     AND NOT EXISTS (SELECT 1 FROM resort_nearby_towns l WHERE l.town_id = t.id);
  IF orphaned > 0 THEN RAISE EXCEPTION '% Italian town(s) have no resort link', orphaned; END IF;

  SELECT count(*) INTO italy_res FROM resorts WHERE country = 'Italy';
  SELECT count(*) INTO italy_towns FROM nearby_towns WHERE country = 'Italy';
  RAISE NOTICE 'Italy now has % resorts and % towns', italy_res, italy_towns;
END $$;

COMMIT;

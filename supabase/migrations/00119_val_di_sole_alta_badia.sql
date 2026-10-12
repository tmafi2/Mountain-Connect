-- 00119 — Val di Sole and Alta Badia
--
-- ⚠️ BOTH WERE NAMED BY REAL ADVERTS AND THROWN AWAY. The 2026-10-12 Italy run
-- extracted 69 hiring posts and held 57 back; nine of those were "resort did
-- not match", and two named these valleys explicitly. The posts exist, the
-- employers exist, and the only thing missing was a row. This migration turns
-- those rejects into listings on the next run.
--
-- ⚠️ THE NAMES ARE THE ONES THE ADVERTS USE, not tidier canonical ones. The
-- importer resolves location with `.ilike("name", resortName)`, so "Val di
-- Sole" and "Alta Badia" are the strings that have to be in the column — a
-- prettier "Folgarida-Marilleva" or "Corvara" would fail to match the very
-- posts this exists to catch. Both are valleys holding several villages, which
-- is how the board already treats Niseko United and Val Gardena.
--
-- ⚠️ A RESORT ROW IS NOT A RESORT: /resorts/[id] renders from the static
-- lib/data/resorts.ts array keyed on legacy_id, so a row without a static
-- entry 404s its own page. Both halves are in this commit, generated from one
-- source. See 00103, which shipped them apart and left five town pages
-- pointing at 404s until the next deploy.
--
-- Estimates stay NULL, as in 00116: seasonal staff numbers, housing capacity
-- and rent, cost of living, snowfall and winter temperatures are not published
-- per area in a form worth trusting. main_employers names lift companies and
-- categories only — inventing hotel names would put fictional businesses on a
-- public page.
--
-- No towns yet. Malè and Corvara deserve their own rows, but a job needs only
-- the resort, and a town is 38 fields that should not be guessed at speed.

BEGIN;

CREATE TEMP TABLE _resorts_before ON COMMIT DROP AS
  SELECT id, legacy_id, name FROM resorts;

WITH europe AS (
  SELECT region_id FROM resorts WHERE legacy_id = '40' LIMIT 1   -- Livigno
)
INSERT INTO resorts (
  name, legacy_id, country, state_province, nearest_town,
  latitude, longitude, website,
  num_runs, num_lifts, vertical_drop_m, base_elevation_m, summit_elevation_m,
  season_start, season_end, snow_reliability, staff_housing_available,
  description, main_employers, common_jobs, languages_required,
  visa_requirements, recruitment_timeline, public_transport,
  region_id, banner_image_url, is_verified
)
SELECT v.*, (SELECT region_id FROM europe), '/resorts/countries/italy.jpg', false
FROM (VALUES
    ('Val di Sole', '121', 'Italy', 'Trentino', 'Malè',
     46.3503, 10.9128, 'https://www.visitvaldisole.it',
     NULL::int, 24, 1279, 900, 2179,
     DATE '2026-11-28', DATE '2027-04-11', 'medium', true,
     'A Trentino valley rather than a single mountain, holding Folgarida-Marilleva — which links over the ridge into Madonna di Campiglio — plus Pejo 3000 and the approach to Passo Tonale. Folgarida-Marilleva alone carries about 63km of piste on 24 lifts between 900m and 2,179m, and the valley''s combined pass reaches roughly 270km. A working valley with real towns in it, so accommodation is easier to find than in a purpose-built resort.',
     ARRAY['Funivie Folgarida Marilleva (lift company)', 'Hotels in Folgarida, Marilleva, Dimaro and Malè', 'Ski schools across the valley', 'Mountain restaurants and rifugi', 'Rafting and outdoor operators on the Noce']::text[],
     ARRAY['Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Waiter / Waitress', 'Bartender', 'Ski/Snowboard Instructor', 'Ski Technician']::text[],
     ARRAY['Italian', 'English']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'Hotels recruit from September for a December start. The valley also has a summer season on the Noce — one of Europe''s better-known whitewater rivers — so some employers hire twice a year.',
     'The Trento–Malè–Mezzana railway runs the length of the valley and reaches the lift stations, which is unusual for an Italian ski area. Trento is about 1 hr 15.'),
    ('Alta Badia', '122', 'Italy', 'South Tyrol', 'Corvara',
     46.5506, 11.875, 'https://www.altabadia.org',
     NULL::int, 53, 1454, 1324, 2778,
     DATE '2026-11-28', DATE '2027-04-11', 'high', true,
     'A Ladin-speaking valley in the Dolomites holding Corvara, La Villa, San Cassiano, Badia and Colfosco, with about 130km of its own piste on 53 lifts and a place on the Sellaronda circuit. Inside Dolomiti Superski, the largest linked lift pass in the world. ⚠️ Ladin is the valley''s own language and German is widely spoken — most guests come from Germany and Austria, so German is worth more than Italian for guest-facing work.',
     ARRAY['Skicarosello Corvara and the Alta Badia lift companies', 'Hotels across Corvara, La Villa, San Cassiano and Colfosco', 'Ski schools in each village', 'Mountain huts on the Sellaronda', 'Michelin-starred restaurants in San Cassiano']::text[],
     ARRAY['Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Waiter / Waitress', 'Bartender', 'Lift Operator', 'Ski/Snowboard Instructor', 'Ski Technician', 'Spa Therapist']::text[],
     ARRAY['Italian', 'German', 'English']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'Hotels recruit from August for a December start. The valley''s hotel stock skews upmarket and several kitchens hold Michelin stars, so experience counts for more here than in a big resort.',
     'Bus to Brunico (1 hr) or Bolzano (1.5 hrs) for mainline trains. The Sella and Campolongo passes close in winter; the valley road does not.')
) AS v(name, legacy_id, country, state_province, nearest_town,
       latitude, longitude, website,
       num_runs, num_lifts, vertical_drop_m, base_elevation_m, summit_elevation_m,
       season_start, season_end, snow_reliability, staff_housing_available,
       description, main_employers, common_jobs, languages_required,
       visa_requirements, recruitment_timeline, public_transport)
WHERE NOT EXISTS (SELECT 1 FROM resorts r WHERE r.legacy_id = v.legacy_id);

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  added int; italy_total int; no_region int; bad_snow int; touched int;
BEGIN
  SELECT count(*) INTO added FROM resorts WHERE legacy_id IN ('121','122');
  IF added <> 2 THEN RAISE EXCEPTION 'expected 2 new resorts, found %', added; END IF;

  SELECT count(*) INTO touched FROM resorts r JOIN _resorts_before b ON b.id = r.id
   WHERE r.name IS DISTINCT FROM b.name;
  IF touched > 0 THEN RAISE EXCEPTION '% pre-existing resort(s) modified', touched; END IF;

  SELECT count(*) INTO no_region FROM resorts WHERE legacy_id IN ('121','122') AND region_id IS NULL;
  IF no_region > 0 THEN RAISE EXCEPTION '% new resort(s) have no region', no_region; END IF;

  SELECT count(*) INTO bad_snow FROM resorts WHERE legacy_id IN ('121','122')
     AND snow_reliability NOT IN ('high','medium','low');
  IF bad_snow > 0 THEN RAISE EXCEPTION 'invalid snow_reliability on % row(s)', bad_snow; END IF;

  -- The whole point: the importer must now find them by the name adverts use.
  IF NOT EXISTS (SELECT 1 FROM resorts WHERE name ILIKE 'Val di Sole')
     OR NOT EXISTS (SELECT 1 FROM resorts WHERE name ILIKE 'Alta Badia') THEN
    RAISE EXCEPTION 'a new resort is not findable by the name the adverts use';
  END IF;

  SELECT count(*) INTO italy_total FROM resorts WHERE country = 'Italy';
  RAISE NOTICE 'Italy now has % resorts (was 9)', italy_total;
END $$;

COMMIT;

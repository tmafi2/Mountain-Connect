-- 00122 — Aprica, Monterosa Ski, Andalo, Santa Caterina Valfurva and Cogne
--
-- Every one of these was NAMED BY A REAL ITALIAN ADVERT and thrown away. A
-- tally of the resort names the extractor produced across all 2,710 posts we
-- have scraped: Aprica 3, Monterosa Ski 2 (+ Champoluc 1), Andalo 1, Santa
-- Caterina Valfurva 1, Cogne 1. Each was answered with 400 "Resort not found"
-- because there was no row. Italy 12 -> 17 resorts.
--
-- ⚠️ NAMES ARE THE ONES THE ADVERTS USE. The importer resolves location with
-- `.ilike("name", resortName)`, so "Monterosa Ski" is the string that has to
-- be in the column even though the villages are Champoluc, Gressoney and
-- Alagna, and "Andalo" rather than the tidier "Paganella". Same call as 00119.
--
-- ⚠️ THIS DOES NOT FIX THE VILLAGE-NAME PROBLEM AND IS NOT MEANT TO. Adverts
-- also name Champoluc, Marilleva, Colfosco, Mezzana, Commezzadura and
-- Valtournenche — villages INSIDE areas we now carry — and an exact ilike
-- cannot resolve any of them. That needs an alias table, not more rows, and
-- is deliberately left for its own change.
--
-- ⚠️ A RESORT ROW IS NOT A RESORT: /resorts/[id] renders from the static
-- lib/data/resorts.ts array keyed on legacy_id, so a row without a static
-- entry 404s its own page. Both halves are in this commit. See 00103.
--
-- ⚠️ NO TOWNS HERE, deliberately, and this is a known debt. Four of the five
-- are towns in their own right and deserve rows the way Malé and Corvara got
-- them in 00120; Monterosa Ski has no single town at all, since it spans three
-- valleys. A job needs only the resort, and a town is 38 fields that should
-- not be guessed at speed.
--
-- ⚠️ NO BUSINESS NAMES IN THE LOCAL-LIFE FIELDS. apres_scene,
-- shops_and_services and healthcare_access are left NULL on all five rather
-- than filled with plausible bars and pharmacies. A business named on a public
-- page has to be one that is actually open, and verifying that is its own
-- piece of work — see the Cervinia/Cortina/Livigno pass. main_employers names
-- only lift companies and employer CATEGORIES, as in 00116.
--
-- Figures are from each operator and the comuni: Aprica ~50km on 16 lifts
-- (apricaonline.com); Monterosa Ski 180km on 37 lifts over three valleys,
-- operated by Monterosa S.p.A. and Monterosa 2000 S.p.A.; Paganella 50km on
-- 20 lifts; Santa Caterina 20.5km on 9 lifts; Cogne 8km on 4 lifts. Estimates
-- (seasonal staff, housing capacity and rent, cost of living, snowfall,
-- winter temperatures) stay NULL.

BEGIN;

CREATE TEMP TABLE _resorts_before ON COMMIT DROP AS
  SELECT id, legacy_id, name FROM resorts;

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
       (SELECT region_id FROM resorts WHERE legacy_id = '40' LIMIT 1),
       '/resorts/countries/italy.jpg', false
FROM (VALUES
    ('Aprica', '124', 'Italy', 'Lombardy', 'Aprica',
     46.1536, 10.1503, 'https://www.apricaonline.com',
     20, 16, 1119, 1181, 2300,
     DATE '2026-11-28', DATE '2027-04-11', 'medium', true,
     'A pass town at 1,181m sitting on the saddle between the Valtellina and the Val Camonica, with about 50km of piste on 16 lifts across four linked areas — Palabione, Magnolta, Baradello and Campetti. The Baradello run is floodlit for 6km, which the resort claims as the longest lit piste in Europe, and night skiing means evening shifts that most resorts do not have. It held World Cup races through the late 1970s and has been a Giro d''Italia stage finish ten times. Around 1,400 permanent residents, and Bormio and Livigno are both up the valley.',
     ARRAY['The Aprica lift company', 'Hotels and guesthouses in the town', 'Bars and restaurants along the pass road', 'Ski and snowboard schools', 'Mountain restaurants on the four areas', 'Ski hire and sports shops']::text[],
     ARRAY['Waiter / Waitress', 'Bartender', 'Chef / Kitchen Staff', 'Hotel Receptionist', 'Housekeeping', 'Lift Operator', 'Ski/Snowboard Instructor', 'Ski Technician']::text[],
     ARRAY['Italian', 'English']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'Hotels and restaurants recruit from September for a December start. The floodlit piste extends trading into the evening, so some venues take on split-shift staff.',
     'Buses from Tirano (40 min) and Edolo, both on regional rail lines; Tirano also has the Bernina Express into Switzerland. The SS39 over the pass is kept open through winter.'),

    ('Monterosa Ski', '125', 'Italy', 'Aosta Valley', 'Champoluc',
     45.8319, 7.7261, 'https://www.monterosa-ski.it',
     66, 37, 2063, 1212, 3275,
     DATE '2026-11-28', DATE '2027-04-11', 'high', true,
     'Three valleys under the second-highest massif in the Alps, linked by lift into one 180km area on 37 lifts: Champoluc and Antagnod in the Val d''Ayas, Gressoney-Saint-Jean and Gressoney-La-Trinité in the Lys valley, and Alagna Valsesia over the ridge in Piedmont. It runs from 1,212m at Alagna to 3,275m at Punta Indren, which makes it one of the most snow-sure areas in Italy and a serious freeride destination. ⚠️ The Gressoney valley is historically Walser, a German-speaking community, so German is more useful there than its position in Italy suggests.',
     ARRAY['Monterosa S.p.A. and Monterosa 2000 S.p.A. (the lift companies)', 'Hotels and guesthouses across Champoluc, Gressoney and Alagna', 'Mountain huts and rifugi', 'Ski and snowboard schools in each valley', 'Mountain guide companies (freeride and ski touring)', 'Ski hire and sports shops']::text[],
     ARRAY['Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Waiter / Waitress', 'Bartender', 'Lift Operator', 'Ski/Snowboard Instructor', 'Mountain Guide', 'Ski Technician']::text[],
     ARRAY['Italian', 'English', 'German']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'Hotels recruit from September for a December start. The freeride reputation means guiding and ski-touring operators hire experienced staff separately, often earlier.',
     'Buses from Aosta into the Val d''Ayas and the Lys valley; Alagna is reached from Varallo on the Piedmont side, which is a different approach entirely. A car is genuinely useful here because the three valleys only connect by lift.'),

    ('Andalo', '126', 'Italy', 'Trentino', 'Andalo',
     46.1664, 11.0044, 'https://www.visitdolomitipaganella.it',
     31, 20, 1097, 1028, 2125,
     DATE '2026-11-28', DATE '2027-04-11', 'medium', true,
     'A town of about 1,250 on the Paganella plateau, between the Brenta Dolomites and Lake Molveno, with 50km of piste on 20 lifts rising from 1,028m to 2,125m. It is one of the most family-oriented areas in Trentino, which shapes the work: a lot of childcare, ski-school and hotel-kids-club roles alongside the usual hospitality. Trento is about 40 minutes away, so it is an easier place to live without a car than most Italian resorts.',
     ARRAY['The Paganella lift company', 'Family hotels and residences in Andalo and Fai della Paganella', 'Ski and snowboard schools', 'Bars, restaurants and pizzerie in the centre', 'Mountain restaurants on the Paganella', 'Ski hire and sports shops']::text[],
     ARRAY['Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Waiter / Waitress', 'Bartender', 'Lift Operator', 'Ski/Snowboard Instructor', 'Childcare / Kids Club Assistant', 'Ski Technician']::text[],
     ARRAY['Italian', 'English']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'Family hotels recruit from September for a December start. The area also has a full summer season around Lake Molveno and the Brenta, so some employers hire twice a year.',
     'Buses from Trento, about 40 minutes, with Trento on the Brenner mainline. That makes Andalo one of the more reachable Trentino resorts without a car.'),

    ('Santa Caterina Valfurva', '127', 'Italy', 'Lombardy', 'Santa Caterina Valfurva',
     46.4142, 10.4919, 'https://www.santacaterinaski.it',
     12, 9, 1158, 1722, 2880,
     DATE '2026-11-28', DATE '2027-04-11', 'high', true,
     'A small, high village at 1,722m inside the Stelvio National Park, 12km up the valley from Bormio, with about 20km of piste on 9 lifts. The altitude and the north-facing aspect make it one of the more snow-sure areas in Lombardy, and the Deborah Compagnoni piste has held World Cup races. It is genuinely small — the job market here is best understood together with Bormio, which is 20 minutes down the road and has far more employers.',
     ARRAY['The Santa Caterina lift company', 'Hotels and guesthouses in the village', 'Mountain restaurants and rifugi', 'Ski school', 'Ski hire shops', 'Bormio employers, 12km down the valley']::text[],
     ARRAY['Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Waiter / Waitress', 'Lift Operator', 'Ski/Snowboard Instructor', 'Ski Technician']::text[],
     ARRAY['Italian', 'English']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'Hotels recruit from September for a December start. Because the village is small, many workers here are hired by Bormio businesses and commute.',
     'Buses up the Valfurva from Bormio, which itself is about an hour from Tirano station. Living in Bormio and working here, or the reverse, is common.'),

    ('Cogne', '128', 'Italy', 'Aosta Valley', 'Cogne',
     45.6089, 7.3561, 'https://www.cogneturismo.it',
     9, 4, 737, 1530, 2267,
     DATE '2026-11-28', DATE '2027-04-11', 'medium', true,
     'A village at 1,530m at the gates of the Gran Paradiso national park, Italy''s oldest. ⚠️ The alpine area is small — 8km of piste on 4 lifts — and that is not what Cogne is known for: it has one of the largest cross-country networks in the Alps across the Prato di Sant''Orso, and it is a major ice-climbing destination, with the Lillaz and Valnontey falls drawing climbers all winter. The seasonal work here follows that: hotels, rifugi and guiding rather than lift-served skiing. Aosta is about 30 minutes down the valley.',
     ARRAY['The Cogne lift company', 'Hotels and guesthouses in the village', 'Mountain huts and rifugi in the Gran Paradiso', 'Cross-country ski centre', 'Mountain guide companies (ice climbing and ski touring)', 'Restaurants and bars in the centre']::text[],
     ARRAY['Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Waiter / Waitress', 'Mountain Guide', 'Ski/Snowboard Instructor', 'Lift Operator']::text[],
     ARRAY['Italian', 'French', 'English']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'Hotels recruit from September. Guiding work for ice climbing is arranged separately and often through the guide companies directly.',
     'Buses from Aosta, about 30 minutes, with Aosta connected by rail to Turin. The valley road is a dead end into the national park, so there is no through traffic.')
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
  added     int;
  touched   int;
  no_region int;
  named_biz int;
  italy_res int;
BEGIN
  SELECT count(*) INTO added FROM resorts WHERE legacy_id IN ('124','125','126','127','128');
  IF added <> 5 THEN RAISE EXCEPTION 'expected 5 new resorts, found %', added; END IF;

  SELECT count(*) INTO touched FROM resorts r JOIN _resorts_before b ON b.id = r.id
   WHERE r.legacy_id IS DISTINCT FROM b.legacy_id OR r.name IS DISTINCT FROM b.name;
  IF touched > 0 THEN RAISE EXCEPTION '% pre-existing resort(s) modified', touched; END IF;

  -- A resort with no region does not appear under its continent anywhere.
  SELECT count(*) INTO no_region FROM resorts
   WHERE legacy_id IN ('124','125','126','127','128') AND region_id IS NULL;
  IF no_region > 0 THEN RAISE EXCEPTION '% new resort(s) have no region', no_region; END IF;

  -- The local-life fields must be empty on all five: a business named on a
  -- public page has to be verified open, and that is a separate pass.
  SELECT count(*) INTO named_biz FROM resorts
   WHERE legacy_id IN ('124','125','126','127','128')
     AND (apres_scene IS NOT NULL OR shops_and_services IS NOT NULL
          OR healthcare_access IS NOT NULL);
  IF named_biz > 0 THEN
    RAISE EXCEPTION '% new resort(s) carry unverified local-life copy', named_biz;
  END IF;

  SELECT count(*) INTO italy_res FROM resorts WHERE country = 'Italy';
  RAISE NOTICE 'Italy now has % resorts', italy_res;
END $$;

COMMIT;

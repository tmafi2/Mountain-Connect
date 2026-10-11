-- 00116 — six Italian resorts, so Italy can carry jobs
--
-- Italy is the one country where this site already ranks: /ski-resort-jobs/italy
-- surfaces in Google and in AI overviews. It also has **zero open roles**, so
-- that ranking lands people on an empty board and sends them back to the
-- results page. The content was never the problem — Italy's three existing
-- resorts have 44 of 45 fields populated. The gap is jobs, and jobs need
-- resorts to attach to.
--
-- ⚠️ WITHOUT THIS, EVERY SCRAPED ITALIAN JOB IS REJECTED. The import route
-- resolves a listing's location with `.from("resorts").ilike("name", resortName)`
-- and returns 400 "Resort not found" on a miss. A post advertising a job in
-- Courmayeur has nowhere to go until Courmayeur is a row.
--
-- ⚠️ A RESORT ROW IS NOT A RESORT. `/resorts/[id]` renders from the static
-- `lib/data/resorts.ts` array keyed on legacy_id, so a row with no static
-- entry unblocks the importer and 404s its own page. Both halves are in the
-- same commit, generated from one source so they cannot drift — 00103's
-- lesson, where the migration landed before the code and five town pages
-- carried links that 404ed until the next deploy.
--
-- ⚠️ ESTIMATES ARE LEFT NULL, NOT GUESSED. Elevations, verticals, lift and
-- run counts are from published resort data. estimated_seasonal_staff,
-- staff_housing_capacity, staff_housing_avg_rent, cost_of_living_weekly,
-- snowfall_avg_cm and the winter temperatures are NOT published per resort in
-- a form worth trusting, so they stay NULL the way 00103 left the
-- per-difficulty run splits NULL. is_verified is false on all six.
--
-- ⚠️ main_employers names only the LIFT COMPANY plus employer CATEGORIES.
-- Inventing plausible hotel names would put fictional businesses on a public
-- page, which is the rule that took /employers/{slug} down.
--
-- Region: all six join the existing Europe region, the one the three current
-- Italian resorts already use.

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
    ('Sauze d''Oulx', '115', 'Italy', 'Piedmont', 'Sauze d''Oulx',
     45.0276, 6.8622, 'https://www.vialattea.it',
     NULL, NULL, 1192, 1509, 2701,
     DATE '2026-11-28', DATE '2027-04-11', 'medium', true,
     'A Piedmont resort at 1,509m on the Via Lattea (Milky Way) circuit, which links Sestriere, Sansicario, Claviere and Pragelato with Montgenèvre in France for around 400km of linked piste. Long the busiest Italian resort for British tour operators, which makes it one of the few places in Italy where English-speaking seasonal staff are routinely hired.',
     ARRAY['Vialattea (lift company)', 'Hotels and chalets operated by UK tour operators', 'Bars and restaurants in the village centre', 'Scuola Sci Sauze d''Oulx (ski school)']::text[],
     ARRAY['Chalet Host', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Ski/Snowboard Instructor', 'Lift Operator', 'Ski Technician', 'Resort Representative']::text[],
     ARRAY['Italian', 'English']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'UK tour operators recruit chalet and rep staff from June–September for a December start, earlier than Italian employers. Hotels and bars hire September–October. English-only roles are more common here than elsewhere in Italy because of the British market.',
     'Free ski bus around the village. Oulx–Claviere railway station is 7km below, with direct trains to Turin (1 hr) and TGV connections to Paris.'),
    ('Sestriere', '116', 'Italy', 'Piedmont', 'Sestriere',
     44.9578, 6.8783, 'https://www.vialattea.it',
     82, 19, 1483, 1357, 2840,
     DATE '2026-11-28', DATE '2027-04-11', 'high', true,
     'A purpose-built resort at 2,035m, among the highest towns in the Alps, and the alpine venue for the 2006 Turin Winter Olympics. Its altitude gives it the most reliable snow on the Via Lattea, the 400km circuit it anchors alongside Sauze d''Oulx and Montgenèvre in France.',
     ARRAY['Vialattea (lift company)', 'Hotels around Piazza Fraiteve', 'Scuola Sci Sestriere (ski school)', 'Bars and restaurants in the village']::text[],
     ARRAY['Lift Operator', 'Ski/Snowboard Instructor', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Ski Technician', 'Snowmaker / Pisteur']::text[],
     ARRAY['Italian', 'English']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'Hotels and the ski school recruit August–September for a late-November start. Lift company roles are advertised from October. Italian is expected for most front-of-house work.',
     'Bus to Oulx station (40 min) for trains to Turin. No railway in Sestriere itself.'),
    ('Courmayeur', '117', 'Italy', 'Aosta Valley', 'Courmayeur',
     45.7909, 6.9694, 'https://www.courmayeurmontblanc.it',
     29, 20, 1550, 1205, 2755,
     DATE '2026-11-28', DATE '2027-04-11', 'medium', true,
     'A historic mountaineering town beneath the Italian side of Mont Blanc, 20 minutes from Chamonix through the Mont Blanc tunnel. Smaller than its reputation — around 41km of piste — but the base for serious off-piste and the Skyway Monte Bianco cable car, and a town that stays open and staffed year-round rather than closing out of season.',
     ARRAY['Courmayeur Mont Blanc Funivie (lift company)', 'Skyway Monte Bianco', 'Hotels and restaurants in the town centre', 'Scuola di Sci Monte Bianco (ski school)', 'Mountain guide companies']::text[],
     ARRAY['Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Ski/Snowboard Instructor', 'Ski Technician', 'Retail Sales']::text[],
     ARRAY['Italian', 'French', 'English']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'Hotels recruit from September. French is useful as well as Italian — Aosta Valley is officially bilingual and the French border is a tunnel away.',
     'Bus to Aosta (1 hr) for trains to Turin and Milan. Geneva airport is about 1.5 hrs through the tunnel.'),
    ('Madonna di Campiglio', '118', 'Italy', 'Trentino', 'Madonna di Campiglio',
     46.2297, 10.8264, 'https://www.campigliodolomiti.it',
     NULL, 57, 1078, 1522, 2600,
     DATE '2026-11-28', DATE '2027-04-11', 'high', true,
     'A long-established resort in the Brenta Dolomites with about 150km of its own piste, linked to Pinzolo, Folgarida and Marilleva for around 156km in total. Traditionally the most upmarket of the Trentino resorts, which means a large hotel sector and a long season.',
     ARRAY['Funivie Madonna di Campiglio (lift company)', 'Four- and five-star hotels in the village', 'Scuola Italiana Sci Campiglio (ski school)', 'Mountain restaurants and rifugi']::text[],
     ARRAY['Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Waiter / Waitress', 'Bartender', 'Lift Operator', 'Ski/Snowboard Instructor', 'Spa Therapist', 'Ski Technician']::text[],
     ARRAY['Italian', 'English', 'German']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'Hotels recruit August–September for a December start; the upmarket end of the market expects hospitality experience and usually conversational Italian.',
     'Bus to Trento (2 hrs) for mainline trains. Verona airport is about 2.5 hrs.'),
    ('Selva Val Gardena', '119', 'Italy', 'South Tyrol', 'Selva di Val Gardena',
     46.5553, 11.7597, 'https://www.valgardena.it',
     NULL, 79, 955, 1563, 2518,
     DATE '2026-11-28', DATE '2027-04-11', 'high', true,
     'The highest of the three Val Gardena villages, at the foot of the Sella massif and the start of the Sellaronda circuit. Val Gardena carries around 181km of piste and sits inside Dolomiti Superski, the largest linked lift pass in the world at roughly 1,200km. Ladin, German and Italian are all spoken locally.',
     ARRAY['Dolomites Val Gardena (lift company)', 'Hotels throughout Selva, Ortisei and Santa Cristina', 'Scuola Sci Selva Gardena (ski school)', 'Mountain huts on the Sellaronda']::text[],
     ARRAY['Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Waiter / Waitress', 'Bartender', 'Lift Operator', 'Ski/Snowboard Instructor', 'Ski Technician', 'Spa Therapist']::text[],
     ARRAY['Italian', 'German', 'English']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'Hotels recruit from August for a December start. ⚠️ German matters more than Italian here — South Tyrol is majority German-speaking and most guests are from Germany and Austria.',
     'Bus to Bolzano (1.5 hrs) or Bressanone (1 hr) for mainline trains. Innsbruck airport is about 2 hrs.'),
    ('Bormio', '120', 'Italy', 'Lombardy', 'Bormio',
     46.4678, 10.3714, 'https://www.bormio.eu',
     NULL, 12, 1817, 1200, 3017,
     DATE '2026-11-28', DATE '2027-04-11', 'high', true,
     'A Roman spa town in the Valtellina with one of the largest continuous verticals in the Alps — 1,817m from the Cima Bianca summit down to the town. Host of the men''s alpine events at the 2026 Milan-Cortina Winter Olympics, and home to the Stelvio, one of the hardest downhill courses on the World Cup circuit.',
     ARRAY['Bormio Ski (lift company)', 'Bagni di Bormio and QC Terme (thermal spas)', 'Hotels in the old town', 'Scuola Italiana Sci Bormio (ski school)']::text[],
     ARRAY['Lift Operator', 'Hotel Receptionist', 'Housekeeping', 'Chef / Kitchen Staff', 'Bartender / Server', 'Spa Therapist', 'Ski/Snowboard Instructor', 'Ski Technician']::text[],
     ARRAY['Italian', 'English']::text[],
     'EU/EEA citizens can work freely under EU freedom of movement. Non-EU citizens need an Italian seasonal work permit (nulla osta for seasonal work), which requires employer sponsorship and falls under Italy''s seasonal quotas (decreto flussi). UK citizens post-Brexit require a work permit.',
     'Hotels and the spas recruit September–October. Italian is expected for most roles; the guest base is largely domestic.',
     'Bus to Tirano (1 hr) for trains to Milan and the Bernina Express to Switzerland. Livigno is 40 min by bus.')
) AS v(name, legacy_id, country, state_province, nearest_town,
       latitude, longitude, website,
       num_runs, num_lifts, vertical_drop_m, base_elevation_m, summit_elevation_m,
       season_start, season_end, snow_reliability, staff_housing_available,
       description, main_employers, common_jobs, languages_required,
       visa_requirements, recruitment_timeline, public_transport)
-- Guarded: a re-run inserts nothing rather than duplicating a resort.
WHERE NOT EXISTS (SELECT 1 FROM resorts r WHERE r.legacy_id = v.legacy_id);

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  added        int;
  italy_total  int;
  no_region    int;
  bad_snow     int;
  touched      int;
BEGIN
  SELECT count(*) INTO added FROM resorts r
   WHERE r.legacy_id IN ('115','116','117','118','119','120');
  IF added <> 6 THEN
    RAISE EXCEPTION 'expected 6 new Italian resorts, found %', added;
  END IF;

  -- Nothing that already existed may have changed.
  SELECT count(*) INTO touched
    FROM resorts r JOIN _resorts_before b ON b.id = r.id
   WHERE r.name IS DISTINCT FROM b.name;
  IF touched > 0 THEN
    RAISE EXCEPTION '% pre-existing resort(s) were modified', touched;
  END IF;

  SELECT count(*) INTO no_region FROM resorts
   WHERE legacy_id IN ('115','116','117','118','119','120') AND region_id IS NULL;
  IF no_region > 0 THEN
    RAISE EXCEPTION '% new resort(s) have no region', no_region;
  END IF;

  -- snow_reliability only takes high/medium/low — "moderate" is the classic miss.
  SELECT count(*) INTO bad_snow FROM resorts
   WHERE legacy_id IN ('115','116','117','118','119','120')
     AND snow_reliability NOT IN ('high','medium','low');
  IF bad_snow > 0 THEN
    RAISE EXCEPTION '% new resort(s) have an invalid snow_reliability', bad_snow;
  END IF;

  SELECT count(*) INTO italy_total FROM resorts WHERE country = 'Italy';
  RAISE NOTICE 'Italy now has % resorts (was 3)', italy_total;
END $$;

COMMIT;

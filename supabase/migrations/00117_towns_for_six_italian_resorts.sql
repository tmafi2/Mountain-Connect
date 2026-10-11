-- 00117 — the towns under the six resorts added in 00116
--
-- A worker searching for a season is choosing somewhere to LIVE, which is why
-- /ski-season-pay is a town page rather than a resort page. The six resorts
-- 00116 added had no towns, so there was nowhere to put that question for
-- them, and the outreach lead importer — which resolves a location by exact
-- name match against nearby_towns.name or resorts.name — could only match
-- the resort.
--
-- ⚠️ VERIFIED OR NULL. Population, altitude, province, airport distances and
-- road access are published figures. Everything that needs local knowledge is
-- left NULL rather than invented: avg_rent_weekly, weekly_cost_estimate,
-- housing_demand, bars_nightlife, restaurants_cafes, gyms_fitness,
-- events_festivals, medical_facilities, avg_winter_temp, snowfall_in_town,
-- insider_tips, community_groups, population_seasonal. A named bar that does
-- not exist is fiction on a public page — the rule that took /employers/{slug}
-- down — and these fields are the ones a local fills, not a researcher.
--
-- ⚠️ NONE OF THESE IS A MEADOW CREEK. 00102 deliberately left out a hamlet of
-- ~100 people with no shop, clinic or transport, because it would have been
-- thirty empty fields in sitemap.xml. The smallest here is Sestriere at 929
-- residents, a purpose-built Olympic resort town with a hotel sector; the
-- largest is Bormio at 4,113, a Roman spa town. Each has enough to say.
--
-- ⚠️ hero_image_url IS NULL ON PURPOSE. The detail page falls back to the
-- country-gradient ResortBanner and the index card never reads the field —
-- same call as 00102.
--
-- Each town links to its own resort at 0km, matching how Livigno, Cortina and
-- Breuil-Cervinia are already linked.

BEGIN;

CREATE TEMP TABLE _towns_before ON COMMIT DROP AS
  SELECT id, slug FROM nearby_towns;

CREATE TEMP TABLE _new_towns ON COMMIT DROP AS
SELECT * FROM (VALUES
    ('Sauze d''Oulx', 'sauze-doulx', 'Italy', 'Piedmont', 45.0276, 6.8622,
     1024, 'https://www.comune.sauzedoulx.to.it',
     'A village at 1,510m in the Susa Valley, 80km west of Turin, and for decades the Italian resort most used by British tour operators. That history is why it has an unusually anglophone seasonal workforce for Italy, and why chalet and rep work here is often advertised in English. It sits on the Via Lattea circuit, so a lift pass reaches Sestriere and Montgenèvre in France.',
     'Turin (TRN) is about 90km. Oulx–Claviere station, 7km below the village, has direct trains to Turin and TGV connections to Paris and Lyon.',
     'Ski bus between the village and the Clotes and Sportinia lift stations. The village itself is steep and walkable.',
     'Reached by a climbing road from Oulx on the A32 motorway. Snow chains are routinely required in winter.',
     'Hotels and tour-operator chalets, bars and restaurants in the old village, ski school, the Vialattea lift company, ski hire shops.',
     'Chalet and tour-operator work is the distinctive opportunity here, and it is recruited from the UK months before Italian employers start.',
     'Mountain biking, hiking and the Assietta Ridge Road. Quieter than winter but not closed.',
     'Late November for a December start; tour-operator contracts are agreed far earlier.',
     'Sauze d''Oulx'),
    ('Sestriere', 'sestriere', 'Italy', 'Piedmont', 44.9578, 6.8783,
     929, 'https://www.comune.sestriere.to.it',
     'A purpose-built resort town at 2,035m, one of the highest in the Alps, created by the Agnelli family in the 1930s and the alpine venue for the 2006 Turin Winter Olympics. The altitude gives it the most dependable snow on the Via Lattea. Small, modern and quiet out of season — most of the permanent population is under a thousand.',
     'Turin (TRN) is about 100km. The nearest station is Oulx, roughly 40 minutes by bus.',
     'Compact enough to walk. Lifts start from the village itself.',
     'The Colle del Sestriere pass road can close in heavy snow. Chains or winter tyres are required.',
     'Hotels around Piazza Fraiteve, the Vialattea lift company, ski school, bars and restaurants, ski hire.',
     'Olympic-era infrastructure means a larger hotel stock than the resident population suggests.',
     'Golf at one of Europe''s highest courses, road cycling and hiking.',
     'Late November.',
     'Sestriere'),
    ('Courmayeur', 'courmayeur', 'Italy', 'Aosta Valley', 45.7909, 6.9694,
     2608, 'https://www.comune.courmayeur.ao.it',
     'A mountaineering town of about 2,600 people beneath the Italian side of Mont Blanc, and one of the few Alpine resorts that functions as a real town year-round rather than closing out of season. Chamonix is twenty minutes away through the Mont Blanc tunnel. Aosta Valley is officially bilingual, so French is useful alongside Italian.',
     'Geneva is about 1.5 hrs through the Mont Blanc tunnel; Turin about 2 hrs. Buses run to Aosta (1 hr) for mainline trains to Turin and Milan.',
     'Free local buses to the Dolonne and Val Vény lift stations and to the Skyway Monte Bianco cable car.',
     'On the SS26 at the Italian end of the Mont Blanc tunnel, so the road is cleared as a priority route. The tunnel is tolled.',
     'Hotels and restaurants in the centre, Courmayeur Mont Blanc Funivie, Skyway Monte Bianco, ski and mountaineering schools, mountain guide companies, outdoor retail.',
     'Year-round tourism means summer work is genuinely available, which is rare in Italian ski towns. Mountain guiding and alpinism support a trade here that most resorts do not have.',
     'A major alpinism centre — Mont Blanc routes, Skyway, hiking and trail running.',
     'October–November for a December start.',
     'Courmayeur'),
    ('Madonna di Campiglio', 'madonna-di-campiglio', 'Italy', 'Trentino', 46.2297, 10.8264,
     1000, 'https://www.campigliodolomiti.it',
     'A resort village at 1,522m in the Brenta Dolomites, administratively part of Pinzolo and home to roughly a thousand permanent residents. Traditionally the most upmarket of the Trentino resorts, which means a large four- and five-star hotel sector and a hospitality job market that expects experience.',
     'Verona is about 2.5 hrs, Milan Bergamo about 3 hrs. Buses run to Trento (2 hrs) for mainline trains.',
     'Ski bus around the village and down the valley to Pinzolo. The village centre is pedestrianised in parts.',
     'Reached from the Val Rendena. Passes to the north can close in heavy snow; the valley road stays open.',
     'Four- and five-star hotels, Funivie Madonna di Campiglio, ski school, mountain restaurants and rifugi, spas.',
     'The upmarket hotel sector supports spa, concierge and fine-dining roles that smaller resorts do not have.',
     'Hiking and climbing in the Brenta Dolomites, including the via ferrata network.',
     'Late November; hotels recruit from August.',
     'Madonna di Campiglio'),
    ('Selva di Val Gardena', 'selva-di-val-gardena', 'Italy', 'South Tyrol', 46.5553, 11.7597,
     2642, 'https://www.valgardena.it',
     'The highest of the three Val Gardena villages at 1,563m, at the foot of the Sella massif and the start of the Sellaronda circuit. ⚠️ South Tyrol is majority German-speaking and Ladin is the local language of the valley, so German matters more than Italian for most guest-facing work here. The valley sits inside Dolomiti Superski, the largest linked lift pass in the world.',
     'Innsbruck is about 2 hrs, Verona about 2.5 hrs. Buses run to Bolzano (1.5 hrs) and Bressanone (1 hr) for mainline trains.',
     'Val Gardena ski bus links Selva, Santa Cristina and Ortisei, included with the lift pass.',
     'On the SS242 through the valley. The Sella and Gardena passes close in winter; the valley road does not.',
     'Hotels throughout Selva, Santa Cristina and Ortisei, the Dolomites Val Gardena lift company, ski schools, mountain huts on the Sellaronda, woodcarving workshops.',
     'Three villages share one labour market, so a job in Ortisei or Santa Cristina is a bus ride away. The valley''s woodcarving trade is a genuine local industry beyond tourism.',
     'Hiking, via ferrata and road cycling over the Dolomite passes. Summer is a full second season here.',
     'Late November; hotels recruit from August.',
     'Selva Val Gardena'),
    ('Bormio', 'bormio', 'Italy', 'Lombardy', 46.4678, 10.3714,
     4113, 'https://www.comune.bormio.so.it',
     'A Roman spa town of about 4,100 people in the Valtellina, with a medieval centre that predates skiing by a long way — which makes it feel like a town with a ski area rather than a resort. Host of the men''s alpine events at the 2026 Milan-Cortina Winter Olympics, and home to the Stelvio, one of the hardest downhill courses on the World Cup circuit. The thermal baths are a year-round employer.',
     'Milan Bergamo is about 3 hrs, Milan Malpensa about 3.5 hrs. Buses run to Tirano (1 hr) for trains to Milan and the Bernina Express into Switzerland.',
     'Local buses to the Bormio 2000 lift station and along the valley. The old town is compact and walkable.',
     'Reached up the Valtellina from Tirano. The Stelvio and Gavia passes close all winter; the valley road stays open.',
     'Hotels in the old town, Bormio Ski, the thermal baths (Bagni di Bormio, QC Terme), ski school, restaurants and bars.',
     'The spas employ year-round and recruit therapists and front-of-house outside the ski season. Livigno is 40 minutes away by bus, which widens the job market considerably.',
     'Cycling the Stelvio and Gavia passes, hiking in the Stelvio National Park, and the thermal baths.',
     'Late November; the spas recruit year-round.',
     'Bormio')
) AS v(name, slug, country, state_region, latitude, longitude,
       population_permanent, website, description, distance_to_airport,
       public_transport_to_resort, road_conditions, local_employers,
       extra_job_opportunities, summer_appeal, best_time_to_arrive,
       resort_name);

INSERT INTO nearby_towns (
  name, slug, country, state_region, latitude, longitude,
  population_permanent, website, description, distance_to_airport,
  public_transport_to_resort, road_conditions, local_employers,
  extra_job_opportunities, summer_appeal, best_time_to_arrive
)
SELECT name, slug, country, state_region, latitude, longitude,
       population_permanent, website, description, distance_to_airport,
       public_transport_to_resort, road_conditions, local_employers,
       extra_job_opportunities, summer_appeal, best_time_to_arrive
FROM _new_towns n
-- Guarded: a re-run inserts nothing rather than duplicating a town.
WHERE NOT EXISTS (SELECT 1 FROM nearby_towns t WHERE t.slug = n.slug);

-- Link each town to the resort it sits under. 0km — the town IS the resort
-- base in all six cases.
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
SELECT r.id, t.id, 0, true
FROM _new_towns n
JOIN resorts r ON r.name = n.resort_name AND r.country = 'Italy'
JOIN nearby_towns t ON t.slug = n.slug
WHERE NOT EXISTS (
  SELECT 1 FROM resort_nearby_towns l WHERE l.resort_id = r.id AND l.town_id = t.id
);

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  added      int;
  linked     int;
  orphaned   int;
  touched    int;
  italy_towns int;
BEGIN
  SELECT count(*) INTO added FROM nearby_towns
   WHERE slug IN ('sauze-doulx','sestriere','courmayeur','madonna-di-campiglio','selva-di-val-gardena','bormio');
  IF added <> 6 THEN
    RAISE EXCEPTION 'expected 6 new towns, found %', added;
  END IF;

  -- Every new town must reach its resort, or the town page has no resort and
  -- the resort page has no town.
  SELECT count(*) INTO linked
    FROM resort_nearby_towns l
    JOIN nearby_towns t ON t.id = l.town_id
   WHERE t.slug IN ('sauze-doulx','sestriere','courmayeur','madonna-di-campiglio','selva-di-val-gardena','bormio');
  IF linked <> 6 THEN
    RAISE EXCEPTION 'expected 6 resort links, found % — a town name did not match its resort', linked;
  END IF;

  -- Nothing that already existed may have moved.
  SELECT count(*) INTO touched
    FROM nearby_towns t JOIN _towns_before b ON b.id = t.id
   WHERE t.slug IS DISTINCT FROM b.slug;
  IF touched > 0 THEN
    RAISE EXCEPTION '% pre-existing town(s) were modified', touched;
  END IF;

  SELECT count(*) INTO orphaned FROM nearby_towns t
   WHERE t.country = 'Italy'
     AND NOT EXISTS (SELECT 1 FROM resort_nearby_towns l WHERE l.town_id = t.id);
  IF orphaned > 0 THEN
    RAISE EXCEPTION '% Italian town(s) have no resort link', orphaned;
  END IF;

  SELECT count(*) INTO italy_towns FROM nearby_towns WHERE country = 'Italy';
  RAISE NOTICE 'Italy now has % towns (was 3), all linked to a resort', italy_towns;
END $$;

COMMIT;

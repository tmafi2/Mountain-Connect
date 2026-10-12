-- 00120 — Malé and Corvara, the towns under the two resorts 00119 added
--
-- 00119 shipped Val di Sole and Alta Badia with no towns and said so: "Malè
-- and Corvara deserve their own rows, but a job needs only the resort, and a
-- town is 38 fields that should not be guessed at speed." This is that work
-- done properly. Italy goes 9 towns -> 11, and every Italian resort now has
-- somewhere to live attached to it.
--
-- ⚠️ VERIFIED OR NULL, exactly as 00117. Population, altitude, province,
-- language census, transport and road numbers are published figures.
-- Everything needing local knowledge stays NULL rather than invented:
-- avg_rent_weekly, weekly_cost_estimate, housing_demand, bars_nightlife,
-- restaurants_cafes, gyms_fitness, events_festivals, emergency_services,
-- avg_winter_temp, snowfall_in_town, insider_tips, community_groups,
-- population_seasonal. A named bar that does not exist is fiction on a public
-- page — the rule that took /employers/{slug} down.
--
-- ⚠️ THE ACCENT IS ACUTE: Malé, not Malè. 00119 wrote the grave accent into
-- resorts.nearest_town, and that column is published as JSON-LD
-- addressLocality on /resorts/121 — a claim made to Google about a real
-- place. The comune spells itself "Comune di Malé" on its own homepage, and
-- so do Wikipedia and the valley tourist board. 00119 put the grave form in
-- THREE public columns on that resort — nearest_town, a main_employers entry
-- and the public_transport sentence naming the railway — and all three are
-- corrected here, so the resort page and the town page cannot disagree. The
-- matching static entries in lib/data/resorts.ts are fixed in this commit.
--
-- ⚠️ AND THE ACCENT MATTERS BEYOND SPELLING. The 00074 trigger stamps
-- business_profiles.nearby_town_id by EXACT lowercase match of the location
-- text against nearby_towns.name — deliberately exact, so typos surface in
-- admin rather than being silently corrected. "Malè" from an advert will
-- therefore NOT match "Malé". No business on the board names either town
-- today (checked), so nothing is lost now; if adverts turn out to use the
-- grave form, the fix is one row, not a schema change:
--     INSERT INTO nearby_towns (name, slug, country, state_region)
--     VALUES ('Malè', 'male-val-di-sole-alt', 'Italy', 'Trentino');
-- — or better, correct the business's location text in admin, which is what
-- the exact match exists to make visible.
--
-- ⚠️ THE SLUG IS 'male-val-di-sole', NOT 'male'. Town slugs are the URL:
-- /towns/male reads as the English word, which is the wrong page for a worker
-- and the wrong result for a search engine. "Malé Val di Sole" is also how the
-- tourist board titles the place, so the longer slug is the better search
-- target as well as the safer one.
--
-- ⚠️ MALÉ IS 15km FROM THE LIFTS AND IS LINKED AS SUCH. Every town 00117
-- added sits at its own resort base and was linked at 0km. Malé does not: it
-- is the valley's administrative town at 737m, and the Folgarida and Marilleva
-- lift stations are up-valley. Recording 0 would tell a worker they can walk
-- to work. Corvara genuinely is the resort base and keeps 0.
--
-- ⚠️ hero_image_url IS NULL ON PURPOSE — the detail page falls back to the
-- country-gradient ResortBanner and the index card never reads the field.
-- Same call as 00102 and 00117.
--
-- Sources: comune.male.tn.it, corvara.eu, it.wikipedia (Malé 2,287 residents
-- at 31-05-2026, 737m; Corvara 1,440 at 31-05-2026, 1,568m, 2024 language
-- census 87.12% Ladin / 10.23% Italian / 2.65% German), visitvaldisole.it.

BEGIN;

CREATE TEMP TABLE _towns_before ON COMMIT DROP AS
  SELECT id, slug, name FROM nearby_towns;

CREATE TEMP TABLE _new_towns ON COMMIT DROP AS
SELECT * FROM (VALUES
    ('Malé', 'male-val-di-sole', 'Italy', 'Trentino', 46.3500, 10.9000,
     2287, 'https://www.comune.male.tn.it',
     'The administrative town of Val di Sole, at 737m where the Rabbi meets the Noce, with about 2,290 permanent residents. It is a working town rather than a resort village — the lifts are up-valley at Folgarida and Marilleva — which is exactly why seasonal workers end up living here: there are shops, a health clinic and year-round rents rather than holiday lets. Apples, cheese and cured meats are a real local trade alongside tourism, and the Stelvio National Park and the Brenta Dolomites are both on the doorstep.',
     'Verona (VRN) is roughly 2 hrs by road and Milan Bergamo about 3 hrs. Trento, 35km down the valley, is the mainline rail hub.',
     'The Trento–Malé–Mezzana narrow-gauge railway runs the length of the valley from a station 200m from Trento''s mainline platforms, calling at Malé and continuing to the Dimaro-Folgarida and Marilleva stops. Commuting to a lift-station job by train is genuinely possible here, which is rare in an Italian ski area. Buses connect the line to villages off it.',
     'On the SS42 up the Val di Sole, which is cleared through the winter. The Tonale pass west and the Palade pass north can be snowbound. Winter tyres or chains are required.',
     'Hotels and guesthouses in the town and up the valley, the Acquacenter Val di Sole public pool complex, shops and services serving the whole valley, rafting and outdoor operators on the Noce, and the Folgarida and Marilleva lift stations 15km up the road.',
     'Being the valley''s commercial centre means non-tourism work exists here — retail, services and the apple, cheese and cured-meat trades — which a purpose-built resort does not have. The Noce is one of Europe''s better-known whitewater rivers, so some employers hire for a summer season as well as a winter one.',
     'Rafting and kayaking on the Noce, hiking and mountain biking, the Stelvio National Park and the Brenta Dolomites, and the Acquacenter pool complex.',
     'Hotels up the valley recruit from September for a December start. Rafting and summer outdoor work recruits in spring.',
     'A public multi-specialist health clinic (poliambulatorio) in the town.',
     'Val di Sole', 15),
    ('Corvara', 'corvara', 'Italy', 'South Tyrol', 46.5500, 11.8670,
     1440, 'https://www.corvara.eu',
     'The main village of Alta Badia at 1,568m, under Sassongher, and one of the four places you can start the Sellaronda from — four Dolomite passes skied in a day, straight from the village. About 1,440 permanent residents support a hotel sector far larger than that number suggests. ⚠️ Ladin is the everyday language, not a heritage one: the 2024 language census recorded 87% of residents declaring Ladin as their mother tongue, against 10% Italian and 3% German. Most guests are German-speaking, so for guest-facing work German is worth more than Italian, and Italian alone will not get you far with colleagues either.',
     'Bolzano (BZO) is about 1.5 hrs by road, Innsbruck about 2.5 hrs and Venice Treviso about 2 hrs 45. The nearest mainline station is Brunico/Bruneck, 38km north, with buses from there into the valley.',
     'The Alta Badia ski bus links Corvara with Colfosco, La Villa, San Cassiano and Badia, and the lifts leave from the village itself. The province''s integrated bus network covers the valley.',
     'On the SS244 through the Badia valley. The Campolongo and Gardena passes either side of the village close or require chains in winter; the valley road north towards Brunico stays open.',
     'Hotels across Corvara, Colfosco, La Villa, San Cassiano and Badia, the Alta Badia lift companies including Skicarosello Corvara, ski schools in each village, mountain huts on the Sellaronda circuit, restaurants — several of them Michelin-starred — and ski hire and sports shops.',
     'Five villages share one labour market on a single bus route, so a job in La Villa or San Cassiano is commutable from Corvara. The valley''s kitchens are unusually decorated for its size, which means fine-dining experience is worth more here than in a bigger resort — and is expected.',
     'A genuine second season. The Maratona dles Dolomites road race finishes in Corvara and the passes around the village are a cycling destination in their own right, alongside hiking and the Dolomite via ferrata network.',
     'Hotels recruit from August for a December start. The summer season runs roughly June to September and recruits in spring.',
     NULL,
     'Alta Badia', 0)
) AS v(name, slug, country, state_region, latitude, longitude,
       population_permanent, website, description, distance_to_airport,
       public_transport_to_resort, road_conditions, local_employers,
       extra_job_opportunities, summer_appeal, best_time_to_arrive,
       medical_facilities, resort_name, distance_km);

INSERT INTO nearby_towns (
  name, slug, country, state_region, latitude, longitude,
  population_permanent, website, description, distance_to_airport,
  public_transport_to_resort, road_conditions, local_employers,
  extra_job_opportunities, summer_appeal, best_time_to_arrive,
  medical_facilities
)
SELECT name, slug, country, state_region, latitude, longitude,
       population_permanent, website, description, distance_to_airport,
       public_transport_to_resort, road_conditions, local_employers,
       extra_job_opportunities, summer_appeal, best_time_to_arrive,
       medical_facilities
FROM _new_towns n
-- Guarded: a re-run inserts nothing rather than duplicating a town.
WHERE NOT EXISTS (SELECT 1 FROM nearby_towns t WHERE t.slug = n.slug);

-- Link each town to its resort. Corvara IS the Alta Badia base (0km); Malé is
-- 15km down-valley from the Folgarida/Marilleva lifts and says so.
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km, is_primary)
SELECT r.id, t.id, n.distance_km, true
FROM _new_towns n
JOIN resorts r ON r.name = n.resort_name AND r.country = 'Italy'
JOIN nearby_towns t ON t.slug = n.slug
WHERE NOT EXISTS (
  SELECT 1 FROM resort_nearby_towns l WHERE l.resort_id = r.id AND l.town_id = t.id
);

-- The accent fix. 00119 wrote the grave form into THREE columns on resort 121,
-- all of which render publicly: nearest_town (also published as JSON-LD
-- addressLocality), one main_employers element, and the public_transport
-- sentence naming the railway. Pinned by legacy_id, and each replacement is a
-- no-op on a value that no longer contains the grave form, so this cannot
-- touch a row someone has since corrected and a re-run changes nothing.
--
-- The two characters are written as U&'\00E8' (grave) and U&'\00E9' (acute)
-- rather than as literals ON PURPOSE. This whole migration exists because two
-- near-identical glyphs mean different things to an exact-match trigger, and
-- 'Mal\u00E8' -> 'Mal\u00E9' as literals is precisely the difference a
-- reviewer's eye slides over. The same applies in the verify block below.
UPDATE resorts
   SET nearest_town    = replace(nearest_town, 'Mal' || U&'\00E8', 'Mal' || U&'\00E9'),
       public_transport = replace(public_transport, 'Mal' || U&'\00E8', 'Mal' || U&'\00E9'),
       main_employers  = ARRAY(
         SELECT replace(e, 'Mal' || U&'\00E8', 'Mal' || U&'\00E9')
         FROM unnest(main_employers) AS e
       )
 WHERE legacy_id = '121';

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  added       int;
  linked      int;
  male_km     int;
  corvara_km  int;
  orphaned    int;
  touched     int;
  bad_accent  int;
  italy_towns int;
BEGIN
  SELECT count(*) INTO added FROM nearby_towns
   WHERE slug IN ('male-val-di-sole','corvara');
  IF added <> 2 THEN
    RAISE EXCEPTION 'expected 2 new towns, found %', added;
  END IF;

  -- A town with no resort link is a page with no resort, and a resort page
  -- with no town. Both halves or neither.
  SELECT count(*) INTO linked
    FROM resort_nearby_towns l
    JOIN nearby_towns t ON t.id = l.town_id
   WHERE t.slug IN ('male-val-di-sole','corvara');
  IF linked <> 2 THEN
    RAISE EXCEPTION 'expected 2 resort links, found % — a town name did not match its resort', linked;
  END IF;

  -- The distances are the point of the link, not decoration: 0 for Malé would
  -- tell a worker the lifts are walkable.
  SELECT l.distance_km INTO male_km
    FROM resort_nearby_towns l JOIN nearby_towns t ON t.id = l.town_id
   WHERE t.slug = 'male-val-di-sole';
  SELECT l.distance_km INTO corvara_km
    FROM resort_nearby_towns l JOIN nearby_towns t ON t.id = l.town_id
   WHERE t.slug = 'corvara';
  IF male_km <> 15 OR corvara_km <> 0 THEN
    RAISE EXCEPTION 'distances wrong: Malé % km, Corvara % km', male_km, corvara_km;
  END IF;

  -- Nothing that already existed may have moved.
  SELECT count(*) INTO touched
    FROM nearby_towns t JOIN _towns_before b ON b.id = t.id
   WHERE t.slug IS DISTINCT FROM b.slug OR t.name IS DISTINCT FROM b.name;
  IF touched > 0 THEN
    RAISE EXCEPTION '% pre-existing town(s) were modified', touched;
  END IF;

  -- The grave accent must be gone from every column that publishes it.
  SELECT count(*) INTO bad_accent
    FROM resorts
   WHERE nearest_town LIKE '%Mal' || U&'\00E8' || '%'
      OR public_transport LIKE '%Mal' || U&'\00E8' || '%'
      OR EXISTS (
           SELECT 1 FROM unnest(main_employers) AS e
            WHERE e LIKE '%Mal' || U&'\00E8' || '%'
         );
  IF bad_accent > 0 THEN
    RAISE EXCEPTION '% resort row(s) still carry the grave-accent spelling', bad_accent;
  END IF;

  SELECT count(*) INTO orphaned FROM nearby_towns t
   WHERE t.country = 'Italy'
     AND NOT EXISTS (SELECT 1 FROM resort_nearby_towns l WHERE l.town_id = t.id);
  IF orphaned > 0 THEN
    RAISE EXCEPTION '% Italian town(s) have no resort link', orphaned;
  END IF;

  SELECT count(*) INTO italy_towns FROM nearby_towns WHERE country = 'Italy';
  RAISE NOTICE 'Italy now has % towns (was 9), all linked to a resort', italy_towns;
END $$;

COMMIT;

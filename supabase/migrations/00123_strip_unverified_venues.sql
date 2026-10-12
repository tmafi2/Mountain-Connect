-- 00123 — take the unverified venue names off Livigno, Cortina and Cervinia
--
-- ⚠️ THIS IS A CORRECTNESS FIX ON LIVE PUBLIC PAGES, not a style change.
-- These three are the only Italian resorts carrying `apres_scene`,
-- `shops_and_services` and `healthcare_access` copy, all of it from the
-- original seed and none of it ever verified. An audit of Cervinia's eight
-- named venues on 2026-10-12 found:
--
--   • "La Brenva" — IN THE WRONG TOWN. Locanda La Brenva is in Entrèves,
--     Courmayeur, about 90km away in a different valley. We listed it as an
--     excellent restaurant in Cervinia.
--   • "Ristorante Wood" — real and Michelin-starred, but reported
--     temporarily closed.
--   • "Copa Pan" — real, but it is "Lo Copa Pan" and it is on Via Carrel in
--     the village. We called it "the main on-mountain après spot".
--   • "Pub The Goat" — no trace of it anywhere.
--
--   Four of eight wrong on one resort. The same seed wrote the hotel names in
--   main_employers, and the Stowe entry that still carries a name retired in
--   2018 ("Stowe Mountain Lodge (Destination Hotels)" alongside its own
--   current name, so one hotel appears twice).
--
-- THE RULE APPLIED HERE, which is the one 00116 already used for new resorts:
-- a named business on a public page must be verified open and should carry its
-- own link. Everything volatile — bars, clubs, individual restaurants and
-- hotels — is replaced by a description of the SCENE, which is both true and
-- durable. Durable public institutions are kept, verified, and linked:
--
--   • Ospedale Umberto Parini, Aosta — the only hospital in Valle d'Aosta
--   • Codivilla-Putti, Cortina — rebuilt for the 2026 Olympics, ULSS 1 Dolomiti
--   • ASST Valtellina e Alto Lario — runs the Sondalo and Bormio hospitals
--   • Aquagranda Livigno, Mottolino and Carosello 3000 — municipal sports
--     centre and the two lift companies, all of them real employers
--
-- ⚠️ SUPERMARKET CHAINS ARE DESCRIBED, NOT NAMED. "Conad and Despar" is true
-- today and is not worth a link or a re-check; "a couple of supermarkets" is
-- true for as long as the town exists.
--
-- ⚠️ LINKS ONLY GO IN THE THREE InfoRow FIELDS. `outdoor_activities` and
-- `staff_perks` are arrays rendered as plain <li>, so markdown would show as
-- literal brackets there — names are stripped from them, not linked. And these
-- fields are deliberately outside the page's JSON-LD, which is what makes
-- markdown safe at all; `description` is in it and is not touched here.
--
-- Pinned by legacy_id. The 13 other countries have the same problem in
-- main_employers (137 entries that actually render) and are NOT touched here.

BEGIN;

CREATE TEMP TABLE _before ON COMMIT DROP AS
  SELECT legacy_id, name, apres_scene, shops_and_services, healthcare_access,
         main_employers, outdoor_activities, staff_perks
    FROM resorts;

-- ── Cervinia (42) ────────────────────────────────────────────────────────
UPDATE resorts SET
  apres_scene = 'Relaxed, Italian-style après built around aperitivo rather than big nights out — a drink and something to eat as the lifts close, often lingering into dinner. Most of the bars and restaurants are along Via J.A. Carrel and the streets off it, within walking distance of each other, and several hotels run bars open to non-residents. There is on-mountain après at the lift bases too, but the village is where the evening ends up.',
  shops_and_services = 'A supermarket, bakeries, banks and ATMs, several ski-hire and gear shops, and boutiques along Via Carrel. Limited compared with a larger resort — Aosta, about an hour away, is where people go for anything substantial.',
  healthcare_access = 'A seasonal tourist medical service (guardia medica turistica) operates in the village through the winter, and there is a pharmacy. The nearest hospital is the [Ospedale Umberto Parini](https://www.ausl.vda.it) in Aosta, about an hour away and the only hospital in Valle d''Aosta.',
  main_employers = ARRAY[
    'Cervino S.p.A. (the lift company)',
    'Hotels and guesthouses in the village',
    'Bars and restaurants along Via Carrel',
    'Ski and snowboard schools',
    'Mountain restaurants and rifugi',
    'Mountain guide companies',
    'Ski hire and sports shops'
  ]::text[]
WHERE legacy_id = '42';

-- ── Cortina d'Ampezzo (41) ───────────────────────────────────────────────
UPDATE resorts SET
  apres_scene = 'Refined rather than rowdy. The passeggiata along Corso Italia — an evening stroll, dressed up, before dinner — is the social event of the day, and the bars and wine bars off it fill afterwards. There is a club scene, but Cortina''s evenings are about style and being seen rather than big dance floors. Expect prices to match: this is the most expensive resort town in Italy.',
  shops_and_services = 'Corso Italia is lined with luxury boutiques, and the town has supermarkets, bakeries, banks, ATMs, a post office and gear shops. A full-service town with year-round amenities rather than a resort that shuts in April.',
  healthcare_access = 'The Codivilla-Putti hospital in the town was rebuilt as a polyclinic for the 2026 Winter Olympics and has an emergency department — unusually well-equipped for a resort of this size. Run by [ULSS 1 Dolomiti](https://www.aulss1.veneto.it). Several pharmacies and doctors'' practices on and around Corso Italia.',
  main_employers = ARRAY[
    'The Cortina lift companies',
    'Hotels across the town, including several five-star properties',
    'Restaurants, bars and wine bars off Corso Italia',
    'Ski and snowboard schools',
    'Mountain huts and rifugi in the Ampezzo Dolomites',
    'Luxury retail along Corso Italia',
    'Ski hire and sports shops'
  ]::text[]
WHERE legacy_id = '41';

-- ── Livigno (40) ─────────────────────────────────────────────────────────
UPDATE resorts SET
  apres_scene = 'Young, busy and cheap by Alpine standards — Livigno is a duty-free zone, so a round costs noticeably less than it would in Cortina or Courmayeur, and that shapes the evenings. On-mountain après starts at the lift-base terraces with DJs on a good afternoon and carries on into the bars along the main street, with a handful of late venues. It is one of the livelier scenes in the Italian Alps and draws a lot of seasonal workers.',
  shops_and_services = 'Livigno''s duty-free status is the defining feature: shops selling electronics, perfume, alcohol and tobacco at well below mainland Italian prices, and the shopping is a draw in its own right. Supermarkets, bakeries, banks, ATMs, a post office and gear shops all along the main street.',
  healthcare_access = 'A medical centre (ambulatorio) in the town with doctors through the season, and a pharmacy in the centre. The nearest hospitals are at Bormio, about 40 minutes away for emergencies, and Sondalo, about an hour, both run by [ASST Valtellina e Alto Lario](https://www.asst-val.it). ⚠️ The Foscagno pass between Livigno and Bormio can close in heavy snow, which is worth knowing before you rely on that 40 minutes.',
  main_employers = ARRAY[
    'Mottolino (lift and terrain-park operations)',
    'Carosello 3000 (lift operations)',
    'Aquagranda Livigno (municipal pool, spa and fitness centre)',
    'Hotels and apartments across the valley',
    'Bars, restaurants and clubs on the main street',
    'Duty-free shops (perfume, electronics, alcohol, tobacco)',
    'Ski and snowboard schools',
    'Ski hire and sports shops'
  ]::text[],
  outdoor_activities = ARRAY[
    'Terrain park riding (one of the best-regarded parks in Europe)',
    'Cross-country skiing (extensive trails along the valley floor)',
    'Snowshoeing',
    'Fat biking',
    'Dog sledding',
    'Ice skating',
    'Swimming, spa and fitness at the municipal centre',
    'Duty-free shopping'
  ]::text[],
  staff_perks = ARRAY[
    'Discounted or free season pass',
    'Staff meals at hotels and restaurants',
    'Duty-free shopping (alcohol, tobacco, perfume, electronics at reduced prices)',
    'Pro deals on gear',
    'Access to the municipal pool, spa and fitness centre'
  ]::text[]
WHERE legacy_id = '40';

-- ── verify ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  changed    int;
  others     int;
  leftovers  text;
  bad_link   int;
BEGIN
  SELECT count(*) INTO changed
    FROM resorts r JOIN _before b ON b.legacy_id = r.legacy_id
   WHERE r.legacy_id IN ('40','41','42')
     AND (r.apres_scene IS DISTINCT FROM b.apres_scene
          OR r.main_employers IS DISTINCT FROM b.main_employers);
  IF changed <> 3 THEN RAISE EXCEPTION 'expected 3 resorts rewritten, got %', changed; END IF;

  -- Nothing outside the three may move.
  SELECT count(*) INTO others
    FROM resorts r JOIN _before b ON b.legacy_id = r.legacy_id
   WHERE r.legacy_id NOT IN ('40','41','42')
     AND (r.apres_scene IS DISTINCT FROM b.apres_scene
          OR r.shops_and_services IS DISTINCT FROM b.shops_and_services
          OR r.healthcare_access IS DISTINCT FROM b.healthcare_access
          OR r.main_employers IS DISTINCT FROM b.main_employers
          OR r.outdoor_activities IS DISTINCT FROM b.outdoor_activities
          OR r.staff_perks IS DISTINCT FROM b.staff_perks);
  IF others > 0 THEN RAISE EXCEPTION '% resort(s) outside the three were modified', others; END IF;

  -- Every venue the audit found wrong, and the rest of the volatile names,
  -- must be gone from all three rows. This is the whole point of the change.
  SELECT string_agg(DISTINCT v, ', ') INTO leftovers
    FROM resorts r,
         unnest(ARRAY['La Brenva','Copa Pan','The Goat','Ristorante Wood','Yeti Bar',
                      'Dragon Bar','Le Samovar','Hostellerie','VIP Club','El Zoco',
                      'Birreria Vienna','Enoteca Cortina','Des Alpes','Hotel de la Poste',
                      'Kosmo','Stalet','Daphne','Marco''s Pub','Helvetia','Tea del Vidal',
                      'Grand Hotel des Guides','Hotel Excelsior Planet','Saint-Hubertus',
                      'Hermitage','Cristallo','Rosapetra','Grand Hotel Savoia',
                      'Hotel Lac Salin','Hotel Touring','Moncler','Brunello Cucinelli',
                      'Benetton','Conad','Despar','Eurospin']) AS v
   WHERE r.legacy_id IN ('40','41','42')
     AND (coalesce(r.apres_scene,'') || ' ' || coalesce(r.shops_and_services,'') || ' '
          || coalesce(r.healthcare_access,'') || ' '
          || coalesce(array_to_string(r.main_employers,' '),'') || ' '
          || coalesce(array_to_string(r.outdoor_activities,' '),'') || ' '
          || coalesce(array_to_string(r.staff_perks,' '),'')) ILIKE '%' || v || '%';
  IF leftovers IS NOT NULL THEN
    RAISE EXCEPTION 'unverified venue name(s) still present: %', leftovers;
  END IF;

  -- A half-written markdown link renders as literal brackets on the page.
  SELECT count(*) INTO bad_link FROM resorts
   WHERE legacy_id IN ('40','41','42')
     AND (coalesce(apres_scene,'') || coalesce(shops_and_services,'') || coalesce(healthcare_access,''))
         ~ '\[[^]]*\](?!\()';
  IF bad_link > 0 THEN RAISE EXCEPTION '% row(s) have a bracket with no url', bad_link; END IF;

  RAISE NOTICE 'Livigno, Cortina and Cervinia rewritten; no unverified venue names remain';
END $$;

COMMIT;

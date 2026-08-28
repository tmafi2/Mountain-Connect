-- ============================================================
-- Migration 00091: "Banff / Lake Louise" becomes Mount Norquay
-- ============================================================
-- Banff is a town, not a ski resort, and the record was not describing a
-- resort at all — it was the three Banff-area resorts added together. Its
-- 164 runs, 26 lifts and 1,700 ha were Norquay + Sunshine + Lake Louise
-- summed, and its website pointed at skilouise.com. Lake Louise Ski Resort
-- (legacy_id 60) and Sunshine Village (legacy_id 61) already exist as their
-- own records, so the composite was also double-counting them.
--
-- Repointing legacy_id 11 at Mount Norquay completes the Banff trio with
-- one record per actual resort. Nothing depended on the old row — 0 job
-- posts, 0 business profiles, 0 venues — so there is nothing to migrate,
-- and the /resorts/[id] route keys on the id, which does not change.
--
-- FIGURES come from the ski-area infobox on Wikipedia, cross-checked
-- against OnTheSnow. Where the two disagreed, Wikipedia was used because
-- its numbers reconcile: 1,630 m base + 503 m vertical = 2,133 m top.
-- OnTheSnow's 8,054 ft "summit" is the mountain's peak rather than the top
-- of the lifts, and does not square with its own 1,650 ft vertical.
--
-- Two fields are deliberately set NULL rather than guessed. Norquay's own
-- seasonal headcount and staff-housing capacity are not published, and the
-- values sitting there were Banff-wide figures for all three resorts. An
-- invented number on a public resort page is worse than a blank one.
-- ============================================================

UPDATE public.resorts
SET
  name = 'Mount Norquay',
  description =
    'The closest ski area to the town of Banff, five minutes up the switchbacks and the '
    'oldest of the Banff trio — lifts have run here since 1948. Small, steep and quiet '
    'next to its neighbours, with the North American chair serving genuinely serious '
    'terrain and night skiing on Wednesdays and Fridays through the winter. Staff live '
    'in Banff and ride a free shuttle up the hill.',

  -- The old coordinates were Lake Louise's, 60 km up the parkway.
  latitude  = 51.2032,
  longitude = -115.5986,
  website   = 'https://banffnorquay.com',

  -- Norquay alone, no longer the three resorts summed.
  vertical_drop_m     = 503,
  base_elevation_m    = 1630,
  summit_elevation_m  = 2133,
  num_runs            = 60,
  num_lifts           = 5,
  skiable_terrain_ha  = 77,
  snowfall_avg_cm     = 300,

  -- 20% easy / 36% intermediate / 28% advanced / 16% expert of 60 runs.
  runs_green        = 12,
  runs_blue         = 22,
  runs_black        = 17,
  runs_double_black = 9,

  lift_types = '{"chairlifts": 4, "surface_lifts": 1}'::jsonb,

  -- Natural snowfall is modest, so Norquay makes most of its own — the
  -- opposite balance to the old composite's 15%.
  artificial_snow_coverage_pct = 85,

  -- Early December to mid-April, a shorter season than Sunshine or Lake
  -- Louise. Indicative dates for the 2025/26 winter.
  season_start = DATE '2025-12-05',
  season_end   = DATE '2026-04-12',

  main_employers = ARRAY[
    'Mount Norquay (resort operations, ski school, tube park)',
    'Norquay Bistro & Lone Pine Pub (on-hill food & beverage)',
    'SkiBig3 (shared lift school and guest services across the three resorts)',
    'Banff Hospitality Collective (restaurants & bars in town)',
    'Fairmont Banff Springs Hotel',
    'Pursuit (Banff Gondola, attractions)'
  ]::text[],

  common_jobs = ARRAY[
    'Lift Operator',
    'Ski/Snowboard Instructor',
    'Tube Park Attendant',
    'Snowmaker',
    'Guest Services / Ticket Sales',
    'Kitchen Staff / Line Cook',
    'Bartender / Server',
    'Rental Technician',
    'Ski Patrol'
  ]::text[],

  staff_perks = ARRAY[
    'Free Mount Norquay season pass',
    'Discounted SkiBig3 pass covering Norquay, Sunshine Village and Lake Louise',
    'Free staff shuttle from pick-up points around Banff',
    'Discounted food on the hill',
    'Discounted merchandise and rentals',
    'Quarterly pay reviews',
    'Night skiing on staff days off'
  ]::text[],

  -- Beds exist but are limited and off-hill; the number is not published.
  staff_housing_available = true,
  staff_housing_capacity  = NULL,
  staff_housing_avg_rent  = 'CAD $8–$16.50/day for a shared room (roughly $240–$500/month). '
                            'All staff housing is in Banff rather than on the hill, with a free staff bus.',

  public_transport =
    'Free staff shuttle from pick-up points around Banff to the hill, about 10 minutes. '
    'Roam Transit runs local routes throughout Banff and on to Canmore and Lake Louise. '
    'Rider Express coaches to Calgary take roughly 1.5 hours.',

  recruitment_timeline =
    'Hiring opens in July–August for the winter, with most roles filled by late September. '
    'Entry-level positions are often placed through working-holiday programmes, and staff '
    'housing is confirmed by department managers around mid-September. Late applicants can '
    'still find work into November.',

  -- Not published by the resort; the previous value counted all of Banff.
  estimated_seasonal_staff = NULL,

  updated_at = now()
WHERE legacy_id = '11';

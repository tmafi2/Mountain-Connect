-- ============================================================
-- Migration 00066: Seed Jindabyne + Perisher/Thredbo links
-- ============================================================
-- Migration 00023 was supposed to insert the Jindabyne row plus
-- two resort_nearby_towns links (Jindabyne ↔ Perisher,
-- Jindabyne ↔ Thredbo) but the data is missing on prod —
-- nearby_towns has 63 worldwide towns, but Jindabyne is not one
-- of them. The /admin/import-listing page therefore shows
-- "No towns linked to this resort" for both Perisher and Thredbo.
--
-- This re-runs the missing inserts idempotently so it's safe to
-- run multiple times.
-- ============================================================

-- Insert Jindabyne if it doesn't already exist. Populate both `state`
-- (original column from migration 00023) and `state_region` (added in
-- 00025) so the row is consistent with the rest of the table.
INSERT INTO nearby_towns (name, slug, description, state, state_region, country, latitude, longitude)
VALUES (
  'Jindabyne',
  'jindabyne',
  'The closest town to both Thredbo and Perisher, Jindabyne is where most seasonal workers live. It has supermarkets, restaurants, accommodation, and a lively après scene — all within 30–45 mins of the resorts.',
  'NSW',
  'New South Wales',
  'Australia',
  -36.4165,
  148.6233
)
ON CONFLICT (slug) DO NOTHING;

-- Link Jindabyne to Thredbo (~35 km).
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km)
SELECT
  (SELECT id FROM resorts WHERE legacy_id = '52' LIMIT 1),
  (SELECT id FROM nearby_towns WHERE slug = 'jindabyne' LIMIT 1),
  35
WHERE
  EXISTS (SELECT 1 FROM resorts WHERE legacy_id = '52')
  AND EXISTS (SELECT 1 FROM nearby_towns WHERE slug = 'jindabyne')
ON CONFLICT (resort_id, town_id) DO NOTHING;

-- Link Jindabyne to Perisher (~30 km).
INSERT INTO resort_nearby_towns (resort_id, town_id, distance_km)
SELECT
  (SELECT id FROM resorts WHERE legacy_id = '50' LIMIT 1),
  (SELECT id FROM nearby_towns WHERE slug = 'jindabyne' LIMIT 1),
  30
WHERE
  EXISTS (SELECT 1 FROM resorts WHERE legacy_id = '50')
  AND EXISTS (SELECT 1 FROM nearby_towns WHERE slug = 'jindabyne')
ON CONFLICT (resort_id, town_id) DO NOTHING;

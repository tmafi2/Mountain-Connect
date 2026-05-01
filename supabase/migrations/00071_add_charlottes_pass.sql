-- 00071_add_charlottes_pass.sql
--
-- Adds Charlotte's Pass (NSW, Australia) as a new resort and links it
-- to Jindabyne in resort_nearby_towns. Slots into the Australian
-- legacy_id cluster (Perisher 50, Falls Creek 51, Thredbo 52,
-- Mt Hotham 53) at legacy_id 70 — slot 54 is taken by Mt Hutt (NZ).
--
-- Charlotte's Pass is the highest village in Australia (1,765 m base)
-- and the only Aussie resort accessible only via snowcat in winter
-- (the road from Perisher closes once snow falls). Smallest of the four
-- main NSW resorts. Approximately 32 km from Jindabyne by road.

INSERT INTO public.resorts (
  legacy_id, name, region_id, country,
  description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  base_elevation_m, summit_elevation_m,
  season_start, season_end, snow_reliability
) VALUES (
  '70', 'Charlotte''s Pass',
  (SELECT id FROM public.regions WHERE legacy_id = '9' LIMIT 1),
  'Australia',
  'The highest village in Australia at 1,765 m, located in Kosciuszko National Park. Charlotte''s Pass is the smallest and most boutique of the four main NSW ski resorts — once snow falls, the road from Perisher closes and guests transfer in by snowcat. Quiet, family-friendly, with ski-in/ski-out access from every lodge. Closest town is Jindabyne, about 32 km away via Kosciuszko Road.',
  -36.4347, 148.3315,
  'New South Wales', 'Jindabyne',
  'https://www.charlottepass.com.au',
  'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1600&q=80',
  1765, 1940,
  '2026-06-06', '2026-10-04',
  'low'
) ON CONFLICT DO NOTHING;

-- Link Charlotte's Pass to Jindabyne in the many-to-many table.
INSERT INTO public.resort_nearby_towns (resort_id, town_id, distance_km)
SELECT
  (SELECT id FROM public.resorts WHERE legacy_id = '70' LIMIT 1),
  (SELECT id FROM public.nearby_towns WHERE slug = 'jindabyne' LIMIT 1),
  32
WHERE
  EXISTS (SELECT 1 FROM public.resorts WHERE legacy_id = '70')
  AND EXISTS (SELECT 1 FROM public.nearby_towns WHERE slug = 'jindabyne')
ON CONFLICT DO NOTHING;

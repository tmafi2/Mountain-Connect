-- ═══ FIX RESORT BANNER IMAGES ═══════════════════════════════
-- Replace generic/stock banner images with relevant mountain/ski imagery.
-- All images sourced from Unsplash (free to use under Unsplash License).

-- ── AUSTRALIA ──────────────────────────────────────────────

-- Perisher (legacy_id='50') — was showing unrelated stock image
-- New: Snowy Mountains winter landscape
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1551524164-687a55dd1126?w=1200&q=80'
WHERE legacy_id = '50';
-- Credit: Photo by Jez Timms on Unsplash (snow-covered mountain landscape)

-- Thredbo (legacy_id='52') — was showing surfer
-- New: Snow-covered alpine village/mountain
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=1200&q=80'
WHERE legacy_id = '52';
-- Credit: Photo by Luca Bravo on Unsplash (snowy mountain scene)

-- Falls Creek (legacy_id='51') — verify/replace
-- New: Snow gum trees and alpine landscape (Australian alpine)
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1477601263568-180e2c6d046e?w=1200&q=80'
WHERE legacy_id = '51';
-- Credit: Photo by Joshua Earle on Unsplash (snow-covered mountain with trees)

-- Mt Hotham (legacy_id='53') — verify/replace
-- New: Snowy mountain ridge
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=1200&q=80'
WHERE legacy_id = '53';
-- Credit: Photo by Daniele Levis Pelusi on Unsplash (alpine snow ridge)

-- ── NEW ZEALAND ────────────────────────────────────────────

-- Queenstown / The Remarkables (legacy_id='7')
-- New: The Remarkables mountain range with lake
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=1200&q=80'
WHERE legacy_id = '7';
-- Credit: Photo by Tobias Keller on Unsplash (Queenstown NZ mountains)

-- Mt Hutt (legacy_id='54')
-- New: Canterbury high country snow
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1517783999520-f068d7431571?w=1200&q=80'
WHERE legacy_id = '54';
-- Credit: Photo on Unsplash (mountain snow landscape)

-- ── JAPAN ──────────────────────────────────────────────────

-- Niseko United (legacy_id='3')
-- New: Hokkaido powder snow/trees
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1547640084-3382e69fa09c?w=1200&q=80'
WHERE legacy_id = '3';
-- Credit: Photo on Unsplash (snow-covered Japanese mountain)

-- Furano (legacy_id='45')
-- New: Hokkaido winter landscape
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=1200&q=80'
WHERE legacy_id = '45';
-- Credit: Photo on Unsplash (Japanese winter scene)

-- Hakuba Valley (legacy_id='43')
-- New: Japanese Alps snow scene
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&q=80'
WHERE legacy_id = '43';
-- Credit: Photo on Unsplash (snow-covered Japanese Alps)

-- Rusutsu (legacy_id='44')
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1478719059408-592965723cbc?w=1200&q=80'
WHERE legacy_id = '44';
-- Credit: Photo on Unsplash (deep powder snow trees)

-- ── NORTH AMERICA ─────────────────────────────────────────

-- Whistler Blackcomb (legacy_id='1')
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=1200&q=80'
WHERE legacy_id = '1';
-- Credit: Photo on Unsplash (Whistler mountain panorama)

-- Banff / Lake Louise (legacy_id='11')
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1200&q=80'
WHERE legacy_id = '11';
-- Credit: Photo on Unsplash (Canadian Rockies snow mountains)

-- Vail (legacy_id='5')
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&q=80'
WHERE legacy_id = '5';
-- Credit: Photo on Unsplash (Colorado mountain village snow)

-- Jackson Hole (legacy_id='18')
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1200&q=80'
WHERE legacy_id = '18';
-- Credit: Photo on Unsplash (Grand Teton mountain range winter)

-- Mammoth Mountain (legacy_id='25')
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1520962880247-cfaf541c8724?w=1200&q=80'
WHERE legacy_id = '25';
-- Credit: Photo on Unsplash (Eastern Sierra mountain snow)

-- ── EUROPE — FRANCE ───────────────────────────────────────

-- Chamonix (legacy_id='2')
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?w=1200&q=80'
WHERE legacy_id = '2';
-- Credit: Photo on Unsplash (Mont Blanc / Chamonix valley)

-- ── EUROPE — SWITZERLAND ──────────────────────────────────

-- Zermatt (legacy_id='4')
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1200&q=80'
WHERE legacy_id = '4';
-- Credit: Photo on Unsplash (Matterhorn)

-- ── SOUTH AMERICA ─────────────────────────────────────────

-- Cerro Catedral (legacy_id='55')
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80'
WHERE legacy_id = '55';
-- Credit: Photo on Unsplash (Patagonian mountain landscape)

-- Valle Nevado (legacy_id='6')
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1200&q=80'
WHERE legacy_id = '6';
-- Credit: Photo on Unsplash (Andes mountain snow)

-- Portillo (legacy_id='56')
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1200&q=80'
WHERE legacy_id = '56';
-- Credit: Photo on Unsplash (high altitude mountain snow)

-- ── EUROPE — OTHER ────────────────────────────────────────

-- Åre (legacy_id='8')
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?w=1200&q=80'
WHERE legacy_id = '8';
-- Credit: Photo on Unsplash (Scandinavian winter landscape)

-- Gudauri (legacy_id='9')
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1614358536373-1ce27819009e?w=1200&q=80'
WHERE legacy_id = '9';
-- Credit: Photo on Unsplash (Caucasus mountains snow)

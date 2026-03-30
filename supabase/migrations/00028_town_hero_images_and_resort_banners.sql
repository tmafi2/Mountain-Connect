-- ═══ TOWN HERO IMAGES + RESORT BANNER FIXES ═════════════════
-- Sets hero_image_url for all towns and fixes Thredbo/Perisher resort banners.
-- All images from Unsplash (free to use).

-- ── FIX THREDBO & PERISHER RESORT BANNERS ─────────────────

-- Perisher — ski slopes with snow
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1517299321609-52687d1bc55a?w=1600&q=80'
WHERE legacy_id = '50';

-- Thredbo — snowy alpine mountain
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1491002052546-bf38f186af56?w=1600&q=80'
WHERE legacy_id = '52';

-- ── TOWN HERO IMAGES ──────────────────────────────────────

-- AUSTRALIA / NZ
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80' WHERE slug = 'jindabyne';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1477601263568-180e2c6d046e?w=1600&q=80' WHERE slug = 'mount-beauty';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80' WHERE slug = 'bright';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=1600&q=80' WHERE slug = 'methven';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=1600&q=80' WHERE slug = 'queenstown';

-- JAPAN
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=1600&q=80' WHERE slug = 'hirafu-kutchan';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1606567595334-d39972c85dbe?w=1600&q=80' WHERE slug = 'furano';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1547640084-3382e69fa09c?w=1600&q=80' WHERE slug = 'hakuba';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1478719059408-592965723cbc?w=1600&q=80' WHERE slug = 'rusutsu';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1600&q=80' WHERE slug = 'nozawa-onsen';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1548777123-e216912df7d8?w=1600&q=80' WHERE slug = 'myoko';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=1600&q=80' WHERE slug = 'yamanouchi';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?w=1600&q=80' WHERE slug = 'yuzawa';

-- CANADA
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=1600&q=80' WHERE slug = 'whistler-village';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?w=1600&q=80' WHERE slug = 'banff';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1610394295702-00b39272459d?w=1600&q=80' WHERE slug = 'revelstoke';

-- USA
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1548873903-5fc219569c50?w=1600&q=80' WHERE slug = 'vail-village';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1618774659391-7e75004a11b7?w=1600&q=80' WHERE slug = 'aspen';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1606666334434-4c24739144a5?w=1600&q=80' WHERE slug = 'breckenridge';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1600&q=80' WHERE slug = 'jackson';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1698323200139-c14df11612ac?w=1600&q=80' WHERE slug = 'park-city';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1582641637614-3f446aa083fa?w=1600&q=80' WHERE slug = 'big-sky';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1589496145106-2af25f7c8c1d?w=1600&q=80' WHERE slug = 'steamboat-springs';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1696912161244-f3774bcb4964?w=1600&q=80' WHERE slug = 'stowe';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1696912161455-6e948f3572c5?w=1600&q=80' WHERE slug = 'telluride';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1709506531620-6195c890ef10?w=1600&q=80' WHERE slug = 'ketchum';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1647966233050-a4b640d89fc6?w=1600&q=80' WHERE slug = 'mammoth-lakes';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1707045611662-d3e7cee046b9?w=1600&q=80' WHERE slug = 'crested-butte';

-- FRANCE
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1522926193341-e9ffd686c60f?w=1600&q=80' WHERE slug = 'chamonix';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1636581563868-d5322a0360f7?w=1600&q=80' WHERE slug = 'val-disere';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1673965918877-82154906042b?w=1600&q=80' WHERE slug = 'val-thorens';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1548873903-d93dc8c9723e?w=1600&q=80' WHERE slug = 'meribel';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1548873903-a7e6aaea6495?w=1600&q=80' WHERE slug = 'courchevel';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1665859223778-25a4e39b259e?w=1600&q=80' WHERE slug = 'morzine';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1692869344214-c45779feb9be?w=1600&q=80' WHERE slug = 'bourg-saint-maurice';

-- SWITZERLAND
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=1600&q=80' WHERE slug = 'zermatt';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1676048746230-0c11ed158c78?w=1600&q=80' WHERE slug = 'verbier';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1644335785854-2acd1f649fc0?w=1600&q=80' WHERE slug = 'st-moritz';

-- AUSTRIA
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1635721980613-684353ae88dd?w=1600&q=80' WHERE slug = 'st-anton';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1548075263-f345eba55f65?w=1600&q=80' WHERE slug = 'kitzbuhel';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1640093339706-3d40d8f0a4ab?w=1600&q=80' WHERE slug = 'ischgl';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1681719940438-2363caac70ad?w=1600&q=80' WHERE slug = 'solden';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1710197094645-f3c606391039?w=1600&q=80' WHERE slug = 'mayrhofen';

-- ITALY
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1710197232572-13e1ace07d16?w=1600&q=80' WHERE slug = 'livigno';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1715534098660-2978255e70b7?w=1600&q=80' WHERE slug = 'cortina-dampezzo';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1759313591414-a96b5dfa020c?w=1600&q=80' WHERE slug = 'breuil-cervinia';

-- OTHER EUROPE
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1491555103944-7c647fd857e6?w=1600&q=80' WHERE slug = 'are-village';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1614358536373-1ce27819009e?w=1600&q=80' WHERE slug = 'gudauri';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1600&q=80' WHERE slug = 'soldeu';

-- SOUTH AMERICA
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1600&q=80' WHERE slug = 'bariloche';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?w=1600&q=80' WHERE slug = 'los-andes';
UPDATE nearby_towns SET hero_image_url = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80' WHERE slug = 'santiago';

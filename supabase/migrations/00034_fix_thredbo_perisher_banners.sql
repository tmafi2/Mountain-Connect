-- Fix Thredbo and Perisher banner images with verified ski mountain photos

-- Perisher — snowy ski mountain with ski runs visible
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1200&q=80'
WHERE legacy_id = '50';

-- Thredbo — snowy mountain ski resort
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=1200&q=80'
WHERE legacy_id = '52';

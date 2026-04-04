-- Fix Thredbo and Perisher banner images with verified ski mountain photos

-- Perisher — snowy ski mountain with ski runs visible
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1600&q=80'
WHERE legacy_id = '50';

-- Thredbo — alpine ski village with snow-covered mountains
UPDATE resorts SET banner_image_url = 'https://images.unsplash.com/photo-1548873903-5fc219569c50?w=1600&q=80'
WHERE legacy_id = '52';

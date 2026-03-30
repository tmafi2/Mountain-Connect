-- Add hero image column to nearby_towns
ALTER TABLE nearby_towns
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT;

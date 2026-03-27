-- Add cover photo URL to business profiles
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS cover_photo_url text;

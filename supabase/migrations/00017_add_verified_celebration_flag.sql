-- Flag to trigger the one-time verification celebration popup
ALTER TABLE public.business_profiles
ADD COLUMN IF NOT EXISTS show_verified_celebration boolean DEFAULT false;

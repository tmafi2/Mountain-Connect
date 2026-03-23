-- Expand resorts table with full Ski Resort Data Template
-- All new columns are nullable to preserve existing data

-- Core Info
ALTER TABLE public.resorts ADD COLUMN state_province text;
ALTER TABLE public.resorts ADD COLUMN nearest_town text;
ALTER TABLE public.resorts ADD COLUMN website text;
ALTER TABLE public.resorts ADD COLUMN logo_url text;
ALTER TABLE public.resorts ADD COLUMN banner_image_url text;

-- Resort Profile
ALTER TABLE public.resorts ADD COLUMN skiable_terrain_ha integer;
ALTER TABLE public.resorts ADD COLUMN runs_green integer;
ALTER TABLE public.resorts ADD COLUMN runs_blue integer;
ALTER TABLE public.resorts ADD COLUMN runs_black integer;
ALTER TABLE public.resorts ADD COLUMN runs_double_black integer;
ALTER TABLE public.resorts ADD COLUMN base_elevation_m integer;
ALTER TABLE public.resorts ADD COLUMN summit_elevation_m integer;
ALTER TABLE public.resorts ADD COLUMN lift_types jsonb;
ALTER TABLE public.resorts ADD COLUMN snowfall_avg_cm integer;

-- Employment Context
ALTER TABLE public.resorts ADD COLUMN main_employers text[];
ALTER TABLE public.resorts ADD COLUMN common_jobs text[];
ALTER TABLE public.resorts ADD COLUMN estimated_seasonal_staff text;
ALTER TABLE public.resorts ADD COLUMN languages_required text[];
ALTER TABLE public.resorts ADD COLUMN visa_requirements text;
ALTER TABLE public.resorts ADD COLUMN recruitment_timeline text;

-- Worker Amenities & Living
ALTER TABLE public.resorts ADD COLUMN staff_housing_available boolean;
ALTER TABLE public.resorts ADD COLUMN staff_housing_capacity integer;
ALTER TABLE public.resorts ADD COLUMN staff_housing_avg_rent text;
ALTER TABLE public.resorts ADD COLUMN cost_of_living_weekly text;
ALTER TABLE public.resorts ADD COLUMN public_transport text;
ALTER TABLE public.resorts ADD COLUMN staff_perks text[];

-- Local Life & Community
ALTER TABLE public.resorts ADD COLUMN apres_scene text;
ALTER TABLE public.resorts ADD COLUMN outdoor_activities text[];
ALTER TABLE public.resorts ADD COLUMN healthcare_access text;
ALTER TABLE public.resorts ADD COLUMN shops_and_services text;
ALTER TABLE public.resorts ADD COLUMN international_community_size text;

-- Climate & Weather
ALTER TABLE public.resorts ADD COLUMN avg_winter_temp_min_c integer;
ALTER TABLE public.resorts ADD COLUMN avg_winter_temp_max_c integer;
ALTER TABLE public.resorts ADD COLUMN snow_reliability text CHECK (snow_reliability IN ('high', 'medium', 'low'));
ALTER TABLE public.resorts ADD COLUMN artificial_snow_coverage_pct integer;

-- System Metadata
ALTER TABLE public.resorts ADD COLUMN updated_at timestamptz;
ALTER TABLE public.resorts ADD COLUMN is_verified boolean NOT NULL DEFAULT false;

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.update_resort_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER resort_updated_at
  BEFORE UPDATE ON public.resorts
  FOR EACH ROW EXECUTE PROCEDURE public.update_resort_timestamp();

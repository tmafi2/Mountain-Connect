-- Migration: Expand worker_profiles with comprehensive data model
-- Adds fields for eligibility, availability, experience, preferences, community, and metadata

-- ============================================
-- EXPAND WORKER PROFILES
-- ============================================

-- Core Account Info
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS first_name text;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS last_name text;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS profile_photo_url text;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS location_current text;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS country_of_residence text;

-- Work Eligibility & Legal
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS nationality text;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS second_nationality text;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS visa_status text CHECK (visa_status IN ('citizen', 'permanent_resident', 'working_holiday', 'work_visa', 'student_visa', 'no_visa', 'other'));
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS visa_expiry_date date;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS work_eligible_countries text[];
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS languages jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS drivers_license boolean;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS drivers_license_country text;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS has_car boolean;

-- Availability
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS season_preference text CHECK (season_preference IN ('northern_winter', 'southern_winter', 'both', 'year_round'));
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS preferred_resort_ids text[];
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS preferred_countries text[];
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS housing_preference text CHECK (housing_preference IN ('staff_housing', 'private_rental', 'shared_rental', 'van_vehicle', 'no_preference'));
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS willing_to_relocate boolean;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS available_immediately boolean;

-- Work Experience (expanded)
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS years_seasonal_experience integer;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS cover_letter_url text;

-- Preferences
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS preferred_job_types text[];
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS pay_range_min integer;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS pay_range_max integer;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS pay_currency text DEFAULT 'USD';
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS available_nights boolean;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS available_weekends boolean;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS preferred_days text[];
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS position_type text CHECK (position_type IN ('full_time', 'part_time', 'casual'));
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS open_to_second_job boolean;

-- Community & Bio
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS housing_needs_description text;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS traveling_with_partner boolean;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS traveling_with_pets boolean;

-- System Metadata
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS profile_completion_pct integer NOT NULL DEFAULT 0;
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'email_verified', 'id_verified', 'fully_verified'));
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.worker_profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Drop old location column (replaced by location_current)
ALTER TABLE public.worker_profiles DROP COLUMN IF EXISTS location;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_worker_profile_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS worker_profiles_updated_at ON public.worker_profiles;
CREATE TRIGGER worker_profiles_updated_at
  BEFORE UPDATE ON public.worker_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_worker_profile_updated_at();

-- ============================================
-- EMPLOYER REVIEWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.employer_reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id uuid NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  season text,
  resort_id text,
  skills_endorsed text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, business_id, season)
);

ALTER TABLE public.employer_reviews ENABLE ROW LEVEL SECURITY;

-- Business owners can create reviews for workers
CREATE POLICY "Business owners can create reviews"
  ON public.employer_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_profiles
      WHERE id = employer_reviews.business_id AND user_id = auth.uid()
    )
  );

-- Workers can view reviews about themselves
CREATE POLICY "Workers can view own reviews"
  ON public.employer_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.worker_profiles
      WHERE id = employer_reviews.worker_id AND user_id = auth.uid()
    )
  );

-- Business owners can view reviews they wrote
CREATE POLICY "Business owners can view own reviews"
  ON public.employer_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles
      WHERE id = employer_reviews.business_id AND user_id = auth.uid()
    )
  );

-- ============================================
-- SKILL ENDORSEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.skill_endorsements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id uuid NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
  skill text NOT NULL,
  endorsed_by_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endorsed_by_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, skill, endorsed_by_user_id)
);

ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can endorse a skill
CREATE POLICY "Authenticated users can create endorsements"
  ON public.skill_endorsements FOR INSERT
  WITH CHECK (auth.uid() = endorsed_by_user_id);

-- Workers can view endorsements on their profile
CREATE POLICY "Workers can view own endorsements"
  ON public.skill_endorsements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.worker_profiles
      WHERE id = skill_endorsements.worker_id AND user_id = auth.uid()
    )
  );

-- Public can view endorsements (for profile viewing)
CREATE POLICY "Public can view endorsements"
  ON public.skill_endorsements FOR SELECT
  USING (true);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_worker_profiles_visa_status ON public.worker_profiles(visa_status);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_season_preference ON public.worker_profiles(season_preference);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_position_type ON public.worker_profiles(position_type);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_available_immediately ON public.worker_profiles(available_immediately);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_verification_status ON public.worker_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_last_active ON public.worker_profiles(last_active_at);
CREATE INDEX IF NOT EXISTS idx_employer_reviews_worker ON public.employer_reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_employer_reviews_business ON public.employer_reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_skill_endorsements_worker ON public.skill_endorsements(worker_id);

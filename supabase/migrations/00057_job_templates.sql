-- ============================================================
-- Migration 00057: Job templates
-- ============================================================
-- Lets businesses save a job listing as a reusable template so
-- they can quickly post the same role next season without
-- re-typing. Templates store everything except dates (which
-- change every season) and the business/resort (which come from
-- the business profile at post time).

CREATE TABLE IF NOT EXISTS public.job_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,

  -- Template meta
  name TEXT NOT NULL,

  -- Job fields (mirrors job_posts, excluding dates + FK scope)
  title TEXT NOT NULL,
  category TEXT,
  position_type TEXT,
  description TEXT,
  requirements TEXT,
  pay_amount TEXT,
  pay_currency TEXT,
  salary_range TEXT,
  accommodation_included BOOLEAN DEFAULT FALSE,
  accommodation_type TEXT,
  accommodation_cost TEXT,
  housing_details TEXT,
  ski_pass_included BOOLEAN DEFAULT FALSE,
  meal_perks BOOLEAN DEFAULT FALSE,
  visa_sponsorship BOOLEAN DEFAULT FALSE,
  language_required TEXT,
  urgently_hiring BOOLEAN DEFAULT FALSE,
  positions_available INTEGER DEFAULT 1,
  show_positions BOOLEAN DEFAULT TRUE,
  custom_perks TEXT[],
  how_to_apply TEXT,
  application_email TEXT,
  application_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_templates_business ON public.job_templates(business_id);

-- RLS
ALTER TABLE public.job_templates ENABLE ROW LEVEL SECURITY;

-- Business owners can view/manage their own templates
CREATE POLICY "Business owners can view own templates" ON public.job_templates FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.business_profiles
    WHERE id = job_templates.business_id AND user_id = auth.uid()
  ));

CREATE POLICY "Business owners can insert own templates" ON public.job_templates FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.business_profiles
    WHERE id = job_templates.business_id AND user_id = auth.uid()
  ));

CREATE POLICY "Business owners can update own templates" ON public.job_templates FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.business_profiles
    WHERE id = job_templates.business_id AND user_id = auth.uid()
  ));

CREATE POLICY "Business owners can delete own templates" ON public.job_templates FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.business_profiles
    WHERE id = job_templates.business_id AND user_id = auth.uid()
  ));

-- Admin full access
CREATE POLICY "Admin full access to templates" ON public.job_templates FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role bypass
CREATE POLICY "Service role full access to templates" ON public.job_templates FOR ALL
  USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_job_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_templates_updated_at ON public.job_templates;
CREATE TRIGGER trg_job_templates_updated_at
  BEFORE UPDATE ON public.job_templates
  FOR EACH ROW EXECUTE FUNCTION update_job_templates_updated_at();

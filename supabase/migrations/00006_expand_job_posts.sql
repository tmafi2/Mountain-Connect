-- Migration 00006: Expand job_posts table with additional fields for frontend
-- These columns match the SeedJob extended interface used in the UI

ALTER TABLE job_posts
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS position_type text DEFAULT 'full_time'
    CHECK (position_type IN ('full_time', 'part_time', 'casual')),
  ADD COLUMN IF NOT EXISTS pay_amount text,
  ADD COLUMN IF NOT EXISTS pay_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS housing_details text,
  ADD COLUMN IF NOT EXISTS meal_perks boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ski_pass_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS language_required text,
  ADD COLUMN IF NOT EXISTS visa_sponsorship boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS urgently_hiring boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS positions_available integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS accommodation_type text,
  ADD COLUMN IF NOT EXISTS accommodation_cost text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'closed', 'draft'));

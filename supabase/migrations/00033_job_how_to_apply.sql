-- Add "How to Apply" fields to job_posts
ALTER TABLE job_posts
  ADD COLUMN IF NOT EXISTS how_to_apply TEXT,
  ADD COLUMN IF NOT EXISTS application_email TEXT,
  ADD COLUMN IF NOT EXISTS application_url TEXT;

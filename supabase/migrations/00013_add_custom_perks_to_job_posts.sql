-- Add custom_perks column to job_posts for business-defined perks
ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS custom_perks text[] DEFAULT NULL;

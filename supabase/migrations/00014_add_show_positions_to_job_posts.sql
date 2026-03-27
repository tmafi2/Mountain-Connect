-- Add show_positions column to control visibility of position count to public
ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS show_positions boolean DEFAULT true;

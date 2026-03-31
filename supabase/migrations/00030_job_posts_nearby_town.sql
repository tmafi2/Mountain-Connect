-- Add nearby_town_id to job_posts so town-based jobs can be tagged directly
ALTER TABLE job_posts
  ADD COLUMN IF NOT EXISTS nearby_town_id UUID REFERENCES nearby_towns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_posts_nearby_town ON job_posts(nearby_town_id);

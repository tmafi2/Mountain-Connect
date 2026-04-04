-- Featured jobs: admin can feature job listings to appear first in public listings
ALTER TABLE public.job_posts ADD COLUMN featured_until TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX idx_job_posts_featured ON public.job_posts(featured_until)
  WHERE featured_until IS NOT NULL;

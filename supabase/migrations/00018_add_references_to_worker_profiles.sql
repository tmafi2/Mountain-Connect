-- Add references column to worker_profiles (stored as JSONB array)
ALTER TABLE public.worker_profiles
ADD COLUMN IF NOT EXISTS references jsonb DEFAULT '[]'::jsonb;

-- Expand applications table with new columns and updated status values

-- Add new columns
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS cover_letter text,
  ADD COLUMN IF NOT EXISTS resume_url text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- Drop old status constraint and add new one with expanded values
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('new', 'viewed', 'interview_pending', 'interview', 'offered', 'accepted', 'rejected'));

-- Migrate existing data to new status values
UPDATE public.applications SET status = 'new' WHERE status = 'pending';
UPDATE public.applications SET status = 'viewed' WHERE status = 'reviewed';

-- Set default to 'new' instead of 'pending'
ALTER TABLE public.applications ALTER COLUMN status SET DEFAULT 'new';

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION update_applications_updated_at();

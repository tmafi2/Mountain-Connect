-- Add 'withdrawn' to the application status constraint
-- Workers can withdraw applications after accepting another offer
ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('new', 'viewed', 'interview_pending', 'interview', 'offered', 'accepted', 'rejected', 'withdrawn'));

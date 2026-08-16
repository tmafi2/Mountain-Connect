-- Add contact_email to worker_profiles for business-visible email
ALTER TABLE worker_profiles
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

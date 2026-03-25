-- ============================================================
-- Migration 00009: Waitlist Signups
-- Creates the waitlist_signups table for the coming-soon page
-- ============================================================

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('worker', 'business')),
  email TEXT NOT NULL,
  business_name TEXT,
  country TEXT,
  resort TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint on email to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_signups_email
  ON waitlist_signups(email);

-- Index for querying by type
CREATE INDEX IF NOT EXISTS idx_waitlist_signups_type
  ON waitlist_signups(type);

-- RLS: The API uses the admin client (service role key) which bypasses RLS,
-- but we enable it anyway for safety so no one can read signups via the anon key.
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies for anon users.
-- Only the service_role (admin client) can access this table.

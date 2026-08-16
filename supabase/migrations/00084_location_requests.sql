-- ============================================================
-- Migration 00084: location_requests
-- ============================================================
-- "Missing your resort or town? Let us know." Captures structured requests
-- from workers and businesses for resorts/towns we don't cover yet, so new
-- regions can be opened based on real demand rather than guesswork.
-- Submitted from the resort-picker "no results" state, the explore page,
-- and the employer hub. Public insert (rate-limited at the API), admin read.

CREATE TABLE IF NOT EXISTS public.location_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          TEXT NOT NULL CHECK (kind IN ('resort', 'town', 'either')),
  location_name TEXT NOT NULL,
  country       TEXT,
  requester     TEXT NOT NULL CHECK (requester IN ('worker', 'business', 'other')),
  email         TEXT NOT NULL,
  note          TEXT,
  -- Where on the site the request came from (path), for context.
  source_path   TEXT,
  -- Set when submitted by a logged-in user.
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'planned', 'added', 'declined')),
  admin_note    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_location_requests_status  ON public.location_requests(status);
CREATE INDEX IF NOT EXISTS idx_location_requests_created ON public.location_requests(created_at DESC);
-- Lets admin group demand by place: "12 people asked for Kimberley".
CREATE INDEX IF NOT EXISTS idx_location_requests_name    ON public.location_requests(lower(location_name));

ALTER TABLE public.location_requests ENABLE ROW LEVEL SECURITY;

-- Inserts come through the API route with the service role (so we can
-- validate + rate-limit + email); no direct client inserts.
-- Admins can read/update everything.
DROP POLICY IF EXISTS "Admins manage location requests" ON public.location_requests;
CREATE POLICY "Admins manage location requests"
  ON public.location_requests FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

COMMENT ON TABLE public.location_requests IS
  'Requests for resorts/towns we do not cover yet. Drives which regions to open next.';

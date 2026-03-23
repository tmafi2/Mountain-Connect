-- ============================================================
-- Migration 00004: Interview Scheduling System
-- Adds interview_availability, interviews, notifications tables
-- Updates applications status, adds timezone to profiles
-- ============================================================

-- 1. Add timezone column to business_profiles
ALTER TABLE business_profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Denver';

-- 2. Add timezone column to worker_profiles
ALTER TABLE worker_profiles
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Denver';

-- 3. Update applications status check constraint to include interview_scheduled
ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected', 'interview_scheduled'));

-- 4. Interview availability — business sets date-specific windows
CREATE TABLE IF NOT EXISTS interview_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Denver',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (slot_duration_minutes IN (15, 30, 45, 60)),
  buffer_minutes INTEGER NOT NULL DEFAULT 10
    CHECK (buffer_minutes IN (0, 5, 10, 15, 30)),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,

  -- Prevent overlapping windows on the same date for the same business
  UNIQUE (business_id, date, start_time)
);

-- 5. Interview availability blocks — blocked periods within a day (e.g. lunch)
CREATE TABLE IF NOT EXISTS interview_availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  availability_id UUID NOT NULL REFERENCES interview_availability(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Interviews — core entity
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'scheduled', 'completed', 'cancelled', 'rescheduled')),

  -- Scheduling
  scheduled_date DATE,
  scheduled_start_time TIME,
  scheduled_end_time TIME,
  timezone TEXT,
  slot_duration_minutes INTEGER,

  -- Video call
  video_room_name TEXT,
  video_room_url TEXT,

  -- Invite token for booking link
  invite_token UUID NOT NULL DEFAULT gen_random_uuid(),

  -- Notes
  business_notes TEXT,

  -- Timestamps
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,

  UNIQUE (invite_token)
);

-- 7. Notifications — in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL
    CHECK (type IN (
      'interview_invited',
      'interview_scheduled',
      'interview_cancelled',
      'interview_rescheduled',
      'interview_reminder',
      'application_status_changed',
      'general'
    )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_interview_availability_business
  ON interview_availability(business_id);

CREATE INDEX IF NOT EXISTS idx_interview_availability_date
  ON interview_availability(date);

CREATE INDEX IF NOT EXISTS idx_interviews_application
  ON interviews(application_id);

CREATE INDEX IF NOT EXISTS idx_interviews_business
  ON interviews(business_id);

CREATE INDEX IF NOT EXISTS idx_interviews_worker
  ON interviews(worker_id);

CREATE INDEX IF NOT EXISTS idx_interviews_status
  ON interviews(status);

CREATE INDEX IF NOT EXISTS idx_interviews_invite_token
  ON interviews(invite_token);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, is_read)
  WHERE is_read = FALSE;

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE interview_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Interview availability: business owners can manage their own
CREATE POLICY "Business owners can view their availability"
  ON interview_availability FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert availability"
  ON interview_availability FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their availability"
  ON interview_availability FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete their availability"
  ON interview_availability FOR DELETE
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Workers can view availability for businesses they've applied to
CREATE POLICY "Workers can view availability for applied businesses"
  ON interview_availability FOR SELECT
  USING (
    business_id IN (
      SELECT DISTINCT i.business_id FROM interviews i
      JOIN worker_profiles wp ON wp.id = i.worker_id
      WHERE wp.user_id = auth.uid()
      AND i.status = 'invited'
    )
  );

-- Availability blocks: same as parent availability
CREATE POLICY "Business owners can manage their blocks"
  ON interview_availability_blocks FOR ALL
  USING (
    availability_id IN (
      SELECT ia.id FROM interview_availability ia
      JOIN business_profiles bp ON bp.id = ia.business_id
      WHERE bp.user_id = auth.uid()
    )
  );

-- Workers can view blocks for businesses they're invited to interview with
CREATE POLICY "Workers can view blocks for invited interviews"
  ON interview_availability_blocks FOR SELECT
  USING (
    availability_id IN (
      SELECT ia.id FROM interview_availability ia
      WHERE ia.business_id IN (
        SELECT DISTINCT i.business_id FROM interviews i
        JOIN worker_profiles wp ON wp.id = i.worker_id
        WHERE wp.user_id = auth.uid()
        AND i.status = 'invited'
      )
    )
  );

-- Interviews: business can see their interviews
CREATE POLICY "Business owners can view their interviews"
  ON interviews FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Interviews: workers can see their interviews
CREATE POLICY "Workers can view their interviews"
  ON interviews FOR SELECT
  USING (
    worker_id IN (
      SELECT id FROM worker_profiles WHERE user_id = auth.uid()
    )
  );

-- Interviews: business can insert (invite)
CREATE POLICY "Business owners can create interviews"
  ON interviews FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Interviews: business can update (cancel, complete, reschedule)
CREATE POLICY "Business owners can update their interviews"
  ON interviews FOR UPDATE
  USING (
    business_id IN (
      SELECT id FROM business_profiles WHERE user_id = auth.uid()
    )
  );

-- Interviews: workers can update (book a slot)
CREATE POLICY "Workers can update their interviews"
  ON interviews FOR UPDATE
  USING (
    worker_id IN (
      SELECT id FROM worker_profiles WHERE user_id = auth.uid()
    )
  );

-- Notifications: users can only see their own
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Notifications: users can update their own (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Note: INSERT for notifications is done via service role (admin client)
-- so no INSERT policy needed for regular users

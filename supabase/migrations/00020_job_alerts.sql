-- Job Alerts: saved search filters for workers
CREATE TABLE IF NOT EXISTS job_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Alert',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_alerts_user ON job_alerts(user_id);
CREATE INDEX idx_job_alerts_active ON job_alerts(user_id, is_active) WHERE is_active = TRUE;

-- RLS
ALTER TABLE job_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON job_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
  ON job_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON job_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON job_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Add job_alert_match to notification type CHECK
-- (notification type is stored as TEXT, so we just need to accept the new value)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'interview_invited', 'interview_scheduled', 'interview_cancelled',
    'interview_rescheduled', 'interview_reminder',
    'application_status_changed', 'job_alert_match',
    'business_new_job', 'business_closed_job', 'business_update',
    'new_message', 'general'
  ));

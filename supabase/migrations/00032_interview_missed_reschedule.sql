-- ═══ INTERVIEW MISSED & RESCHEDULE STATUS ═══════════════════
-- Adds 'missed' and 'reschedule_requested' to interview status,
-- and 'reschedule_approved', 'reschedule_declined' notification types.

-- Expand the status CHECK constraint
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_status_check;
ALTER TABLE interviews ADD CONSTRAINT interviews_status_check
  CHECK (status IN (
    'invited', 'scheduled', 'completed', 'cancelled',
    'rescheduled', 'reschedule_requested', 'missed'
  ));

-- Add worker_notes column if not exists (for reschedule reason)
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS worker_notes TEXT;

-- Expand notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'interview_invited', 'interview_scheduled', 'interview_cancelled',
    'interview_rescheduled', 'interview_reminder',
    'application_status_changed', 'job_alert_match',
    'business_new_job', 'business_closed_job', 'business_update',
    'new_message', 'reschedule_approved', 'reschedule_declined',
    'general'
  ));

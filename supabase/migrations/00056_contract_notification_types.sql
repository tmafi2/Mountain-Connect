-- ============================================================
-- Migration 00056: Add contract_sent and contract_signed to
-- notifications.type CHECK constraint
-- ============================================================
-- The contract signing feature (migration 00055) introduces two
-- new notification types that need to be whitelisted on the
-- notifications table's CHECK constraint.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'interview_invited', 'interview_scheduled', 'interview_cancelled',
    'interview_rescheduled', 'interview_reminder',
    'application_status_changed', 'job_alert_match',
    'business_new_job', 'business_closed_job', 'business_update',
    'new_message', 'reschedule_approved', 'reschedule_declined',
    'contract_sent', 'contract_signed',
    'general'
  ));

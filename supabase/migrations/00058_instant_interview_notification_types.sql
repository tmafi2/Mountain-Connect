-- ============================================================
-- Migration 00058: Add instant interview notification types
-- ============================================================
-- Adds the three instant_interview_* types to the notifications
-- table's type CHECK constraint. Without these, the notification
-- insert in /api/interviews/instant silently fails and the worker
-- never sees the accept/decline/reschedule popup.
--
-- Also includes contract_sent / contract_signed for safety in
-- case migration 00056 was not run.

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'interview_invited', 'interview_scheduled', 'interview_cancelled',
    'interview_rescheduled', 'interview_reminder',
    'application_status_changed', 'job_alert_match',
    'business_new_job', 'business_closed_job', 'business_update',
    'new_message', 'reschedule_approved', 'reschedule_declined',
    'contract_sent', 'contract_signed',
    'instant_interview_request', 'instant_interview_declined',
    'instant_interview_rescheduled',
    'general'
  ));

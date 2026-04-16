-- 00054: Instant Interview support
-- Adds 'live' and 'declined' statuses, instant interview columns,
-- new notification types, and enables Realtime on notifications table.

-- ── 1. Expand interview status CHECK constraint ──
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_status_check;
ALTER TABLE interviews ADD CONSTRAINT interviews_status_check
  CHECK (status IN (
    'invited', 'scheduled', 'completed', 'cancelled',
    'rescheduled', 'reschedule_requested', 'missed',
    'live', 'declined'
  ));

-- ── 2. Add instant interview columns ──
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS is_instant BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS room_expires_at TIMESTAMPTZ;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

-- ── 3. Enable Realtime on notifications table ──
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Add notifications to the realtime publication (if not already there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END
$$;

-- Add throttle columns to prevent email spam on rapid messages
ALTER TABLE conversation_participants
ADD COLUMN IF NOT EXISTS last_message_email_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_read_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN conversation_participants.last_message_email_at
IS 'Tracks when the last new-message email was sent for this participant in this conversation. Used for 5-minute throttle.';

COMMENT ON COLUMN conversation_participants.last_read_at
IS 'Tracks when the user last read messages in this conversation. Used to detect active chat sessions and skip email notifications.';

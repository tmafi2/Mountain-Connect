-- ═══ MESSAGE NOTIFICATION TRIGGER ════════════════════════════
-- Creates an in-app notification when a new message is sent.
-- Deduplicates: only one unread notification per conversation.

CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  msg_preview TEXT;
  existing_notif_id UUID;
  is_business BOOLEAN;
  notif_link TEXT;
BEGIN
  -- Find the other participant in the conversation (the recipient)
  SELECT cp.user_id INTO recipient_id
  FROM conversation_participants cp
  WHERE cp.conversation_id = NEW.conversation_id
    AND cp.user_id != NEW.sender_id
  LIMIT 1;

  -- If no recipient found, exit silently
  IF recipient_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get sender name (check business_profiles first, then worker_profiles)
  SELECT bp.business_name INTO sender_name
  FROM business_profiles bp
  WHERE bp.user_id = NEW.sender_id;

  IF sender_name IS NULL THEN
    SELECT CONCAT(wp.first_name, ' ', wp.last_name) INTO sender_name
    FROM worker_profiles wp
    WHERE wp.user_id = NEW.sender_id;
  END IF;

  IF sender_name IS NULL OR TRIM(sender_name) = '' THEN
    sender_name := 'Someone';
  END IF;

  -- Truncate message content for preview
  msg_preview := LEFT(NEW.content, 100);
  IF LENGTH(NEW.content) > 100 THEN
    msg_preview := msg_preview || '...';
  END IF;

  -- Determine if recipient is a business (for correct link path)
  SELECT EXISTS(
    SELECT 1 FROM business_profiles WHERE user_id = recipient_id
  ) INTO is_business;

  IF is_business THEN
    notif_link := '/business/messages?conv=' || NEW.conversation_id::TEXT;
  ELSE
    notif_link := '/messages?conv=' || NEW.conversation_id::TEXT;
  END IF;

  -- Check for existing unread notification for this conversation
  SELECT id INTO existing_notif_id
  FROM notifications
  WHERE user_id = recipient_id
    AND type = 'new_message'
    AND is_read = FALSE
    AND metadata->>'conversation_id' = NEW.conversation_id::TEXT
  LIMIT 1;

  IF existing_notif_id IS NOT NULL THEN
    -- Update existing notification with latest message
    UPDATE notifications
    SET title = 'New message from ' || sender_name,
        message = msg_preview,
        metadata = jsonb_build_object(
          'conversation_id', NEW.conversation_id,
          'message_id', NEW.id,
          'sender_id', NEW.sender_id
        ),
        created_at = NOW()
    WHERE id = existing_notif_id;
  ELSE
    -- Create new notification
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      recipient_id,
      'new_message',
      'New message from ' || sender_name,
      msg_preview,
      notif_link,
      jsonb_build_object(
        'conversation_id', NEW.conversation_id,
        'message_id', NEW.id,
        'sender_id', NEW.sender_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_notify_on_new_message ON messages;
CREATE TRIGGER trg_notify_on_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_message();

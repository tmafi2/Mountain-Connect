-- ═══ FIX REALTIME: SECURITY DEFINER MEMBERSHIP CHECK ═════════
-- Supabase Realtime evaluates RLS policies to decide which subscribers
-- receive each event. The current messages SELECT policy does a cross-table
-- lookup to conversation_participants, which has its own RLS — creating a
-- chain that Realtime can't resolve.
--
-- Fix: create a SECURITY DEFINER function that checks conversation membership
-- directly, bypassing RLS on conversation_participants. The function still
-- uses auth.uid() to verify the current user's identity.

CREATE OR REPLACE FUNCTION public.is_conversation_member(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = conv_id
    AND user_id = auth.uid()
  );
$$;

-- ── Messages: replace all cross-table policies with function-based ones ──

DROP POLICY IF EXISTS "Users can view messages in own conversations" ON messages;
CREATE POLICY "Users can view messages in own conversations"
  ON messages FOR SELECT
  USING (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Users can send messages in own conversations" ON messages;
CREATE POLICY "Users can send messages in own conversations"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_member(conversation_id)
  );

DROP POLICY IF EXISTS "Users can update messages in own conversations" ON messages;
CREATE POLICY "Users can update messages in own conversations"
  ON messages FOR UPDATE
  USING (public.is_conversation_member(conversation_id));

-- ── Conversations: same fix ──

DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  USING (public.is_conversation_member(id));

DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  USING (public.is_conversation_member(id));

-- ── Clean up redundant policies from migration 00049 ──
-- These were workarounds; the SECURITY DEFINER function is the proper fix.
DROP POLICY IF EXISTS "Users can view own sent messages" ON messages;

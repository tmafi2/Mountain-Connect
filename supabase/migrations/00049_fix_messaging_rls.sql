-- ═══ FIX MESSAGING RLS ══════════════════════════════════════
-- The existing self-referential SELECT policy on conversation_participants
-- can fail when referenced by other tables' RLS policies (messages).
-- Add a simple, direct policy that lets users see their own participant rows.
-- PostgreSQL combines multiple permissive policies with OR, so this works
-- alongside the existing policy.

-- Simple direct policy: users can always see their own participant rows
CREATE POLICY "Users can view own participation"
  ON conversation_participants FOR SELECT
  USING (user_id = auth.uid());

-- Also ensure users can see messages they sent (direct, no subquery needed)
CREATE POLICY "Users can view own sent messages"
  ON messages FOR SELECT
  USING (sender_id = auth.uid());

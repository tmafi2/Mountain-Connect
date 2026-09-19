-- 00100_remove_seeded_conversations.sql
--
-- Removes the three conversations POST /api/seed-conversations wrote on
-- 2026-03-29 21:18 UTC, the only time it ran in production. The route is
-- deleted in the same change as this migration.
--
-- WHAT THEY ARE. A demo seeder, auto-called from /business/messages while
-- Executive Housekeeping & Concierge Service was signed in. It picked three of
-- that business's real applicants and wrote scripted threads between them:
-- 14 messages, 6 of them in the workers' names, words they never wrote,
-- including one "thrilled to accept" an offer that was never made (that
-- worker's real application is rejected). No email or notification went out;
-- both features postdate the run.
--
-- HOW THEY ARE FOUND. The seeder created each conversation "now", then
-- backdated its messages 8-72 hours, so every seeded message is older than its
-- own conversation. A real message never is. On 2026-09-19 exactly these three
-- conversations matched, each holding only backdated messages (5, 4 and 5) and
-- 2 participants. Nothing else references them: participants and messages
-- cascade, and no notification mentions their ids.
--
-- GUARDS. The ids are pinned, and every fact above is re-checked first. It
-- aborts, deleting nothing, if a thread has gained a real message, if the
-- counts differ, or if any OTHER conversation now carries the seeded
-- signature. Where the rows never existed (a local reset) it does nothing.

DO $$
DECLARE
  seeded constant uuid[] := ARRAY[
    'efba9024-5244-4f9f-a6ca-637b484f85a4',
    '48cb6e9c-5766-4410-8e4b-c7b1b10cfc8c',
    '480e2412-78fc-4ae5-8e04-c4dfb339616a'
  ]::uuid[];
  n_conversations int;
  n_messages int;
  n_participants int;
  n_real_messages int;
  n_other_matches int;
BEGIN
  SELECT count(*) INTO n_conversations FROM public.conversations WHERE id = ANY (seeded);
  IF n_conversations = 0 THEN
    RAISE NOTICE '00100: seeded conversations not present, nothing to do';
    RETURN;
  END IF;
  IF n_conversations <> 3 THEN
    RAISE EXCEPTION '00100: expected 3 seeded conversations, found %', n_conversations;
  END IF;

  SELECT count(*) INTO n_real_messages
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE c.id = ANY (seeded) AND m.created_at >= c.created_at;
  IF n_real_messages <> 0 THEN
    RAISE EXCEPTION '00100: % message(s) in the seeded threads were written after them, so real; not deleting', n_real_messages;
  END IF;

  SELECT count(*) INTO n_messages FROM public.messages WHERE conversation_id = ANY (seeded);
  SELECT count(*) INTO n_participants FROM public.conversation_participants WHERE conversation_id = ANY (seeded);
  IF n_messages <> 14 OR n_participants <> 6 THEN
    RAISE EXCEPTION '00100: expected 14 messages and 6 participants, found % and %', n_messages, n_participants;
  END IF;

  SELECT count(DISTINCT c.id) INTO n_other_matches
  FROM public.conversations c
  JOIN public.messages m ON m.conversation_id = c.id
  WHERE m.created_at < c.created_at AND NOT (c.id = ANY (seeded));
  IF n_other_matches <> 0 THEN
    RAISE EXCEPTION '00100: % other conversation(s) carry the seeded signature; investigate before deleting', n_other_matches;
  END IF;

  -- conversation_participants and messages are ON DELETE CASCADE.
  DELETE FROM public.conversations WHERE id = ANY (seeded);
  RAISE NOTICE '00100: removed 3 seeded conversations (6 participants, 14 messages)';
END $$;

-- ============================================================
-- Migration 00090: bucket-scope the storage policies that had no
--                  bucket predicate at all
-- ============================================================
-- 🔴 THIS FIXES A LIVE DATA EXPOSURE. Verified against production before
-- writing: an ANONYMOUS request carrying only the public anon key could
-- list and read every object in every PRIVATE bucket.
--
--   ANON list resumes    -> 200, 5+ entries
--   ANON list documents  -> 200, 1 entry
--   ANON list contracts  -> 200, 1 entry
--
-- The anon key ships in the client bundle, so "anonymous" here means
-- anyone at all. Worker resumes and signed employment contracts were
-- readable by the public internet given a path, and the bucket listing
-- handed over the paths.
--
-- ROOT CAUSE. Two sets of policies created through the Supabase dashboard
-- (the `1oj01fe_*` and `flreew_*` suffixes are its naming) were written
-- without a bucket_id predicate. Storage RLS is a disjunction across all
-- policies on storage.objects, so a single unscoped policy grants its
-- permission on EVERY bucket regardless of what any other policy says:
--
--   "Anyone can view avatars 1oj01fe_0"      SELECT  qual: true   public
--   "Authenticated ... documents flreew_0"   SELECT  qual: true   authenticated
--   "Authenticated ... documents flreew_1"   INSERT  check: true  authenticated
--   "Authenticated ... documents flreew_2"   UPDATE  qual: true   authenticated
--   "Authenticated ... documents flreew_3"   DELETE  qual: true   authenticated
--
-- The first is why anonymous reads worked. The rest meant any logged-in
-- account could also write to, overwrite, and DELETE any object in any
-- bucket — including other people's resumes.
--
-- This is also why 00089 alone did not close the contracts hole. Scoping
-- that bucket's own SELECT policy to the two parties is correct and
-- necessary, but irrelevant while a `qual: true` policy sits beside it
-- granting everyone everything. Both migrations are needed.
--
-- WHAT THIS DOES NOT CHANGE. avatars, blog-images and business-photos are
-- PUBLIC buckets and are meant to be world-readable; scoping the avatar
-- policy to bucket_id = 'avatars' preserves that exactly. resumes,
-- documents and contracts keep their own owner-scoped and party-scoped
-- policies, which were correct all along and were simply being bypassed.
-- ============================================================

-- ── 1. The blanket grants ────────────────────────────────────
-- Dropped rather than rewritten. Every one is `true` with no predicate of
-- any kind, and the `documents` bucket already has correctly folder-scoped
-- siblings for each verb (see section 3), so nothing legitimate depends on
-- these. Keeping a narrowed version would only invite the same mistake.
DROP POLICY IF EXISTS "Authenticated users can manage their documents flreew_0" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage their documents flreew_1" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage their documents flreew_2" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can manage their documents flreew_3" ON storage.objects;

-- ── 2. Public avatar reads, scoped to the avatars bucket ─────
-- avatars is public: true, and profile photos and business logos are shown
-- on public pages, so anonymous read is the intent HERE and only here.
DROP POLICY IF EXISTS "Anyone can view avatars 1oj01fe_0" ON storage.objects;

CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- ── 3. Owner-folder policies, now also bucket-scoped ─────────
-- These already restricted callers to their own {userId}/ folder, so they
-- were never the exposure — but without a bucket predicate they let a user
-- reach their own folder in buckets that were never theirs to touch. Paths
-- in both buckets are {userId}/..., so the predicate is unchanged apart
-- from the added bucket.

-- avatars
DROP POLICY IF EXISTS "Users can upload their own avatar 1oj01fe_0" ON storage.objects;
CREATE POLICY "Users upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own avatar 1oj01fe_0" ON storage.objects;
CREATE POLICY "Users update own avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own avatar 1oj01fe_0" ON storage.objects;
CREATE POLICY "Users delete own avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Two SELECT policies on avatars carried misleading names from the
-- dashboard ("delete"/"update" prefixes on SELECT rules). They are
-- redundant now that public read is scoped above, so they go.
DROP POLICY IF EXISTS "Users can delete their own avatar 1oj01fe_1" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar 1oj01fe_1" ON storage.objects;

-- documents
DROP POLICY IF EXISTS "Users can read their own documents flreew_0" ON storage.objects;
CREATE POLICY "Users read own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload their own documents flreew_0" ON storage.objects;
CREATE POLICY "Users upload own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete their own documents flreew_0" ON storage.objects;
CREATE POLICY "Users delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Redundant SELECT duplicate, same misleading dashboard naming.
DROP POLICY IF EXISTS "Users can delete their own documents flreew_1" ON storage.objects;

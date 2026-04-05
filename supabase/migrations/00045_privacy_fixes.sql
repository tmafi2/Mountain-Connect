-- ============================================================
-- Migration 00045: Privacy Fixes
-- ============================================================
-- 1. Scope business access to worker profiles (applicants only)
-- 2. Resume storage security policies

-- ── 1. Worker profile access — restrict to applicants only ──

-- Drop the blanket "any business can see all workers" policy
DROP POLICY IF EXISTS "Businesses can view worker profiles" ON public.worker_profiles;

-- New policy: businesses can only see profiles of workers who applied to their jobs
CREATE POLICY "Businesses can view applicant profiles"
  ON public.worker_profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.job_posts jp ON jp.id = a.job_post_id
      JOIN public.business_profiles bp ON bp.id = jp.business_id
      WHERE a.worker_id = worker_profiles.id
      AND bp.user_id = auth.uid()
    )
  );

-- ── 2. Resume storage security ──────────────────────────────

-- Create storage policies for the resumes bucket
-- Workers can upload their own resumes
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT
  'Workers can upload own resumes',
  'resumes',
  'INSERT',
  $def$(auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)$def$
WHERE EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'resumes')
ON CONFLICT DO NOTHING;

-- Workers can read their own resumes
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT
  'Workers can read own resumes',
  'resumes',
  'SELECT',
  $def$(auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)$def$
WHERE EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'resumes')
ON CONFLICT DO NOTHING;

-- Workers can delete their own resumes
INSERT INTO storage.policies (name, bucket_id, operation, definition)
SELECT
  'Workers can delete own resumes',
  'resumes',
  'DELETE',
  $def$(auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text)$def$
WHERE EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'resumes')
ON CONFLICT DO NOTHING;

-- Note: Business access to resumes is handled via signed URLs generated
-- server-side when viewing an applicant. The RLS on worker_profiles
-- already restricts which cv_url paths businesses can discover.

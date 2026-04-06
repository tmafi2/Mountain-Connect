-- ============================================================
-- Migration 00047: Revert Privacy Fixes (00045)
-- ============================================================
-- Restores the original blanket business access to worker profiles.
-- Removes the restrictive "applicants only" policy that caused issues
-- with admin and business views not loading worker data.

-- ── 1. Drop the restrictive applicant-only policy ──
DROP POLICY IF EXISTS "Businesses can view applicant profiles" ON public.worker_profiles;

-- ── 2. Restore original policy: any business can view all worker profiles ──
CREATE POLICY "Businesses can view worker profiles"
  ON public.worker_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'business_owner'
    )
  );

-- ── 3. Clean up resume storage policies (optional, harmless to keep) ──
-- These are fine to leave in place — they don't cause issues.
-- Only removing if they were causing errors on buckets that don't exist.
DELETE FROM storage.policies WHERE name = 'Workers can upload own resumes' AND bucket_id = 'resumes';
DELETE FROM storage.policies WHERE name = 'Workers can read own resumes' AND bucket_id = 'resumes';
DELETE FROM storage.policies WHERE name = 'Workers can delete own resumes' AND bucket_id = 'resumes';

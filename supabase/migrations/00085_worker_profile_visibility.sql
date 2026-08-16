-- ============================================================
-- Migration 00085: business visibility of worker profiles = relationship-based
-- ============================================================
-- History:
--   00045 restricted businesses to APPLICANTS ONLY. That broke legitimate
--         paths (interviews, messaging, follows), so
--   00047 reverted to "any business_owner can SELECT every worker profile".
--         That contradicts the Privacy page, which promises businesses can
--         only see workers who applied to their listings.
--
-- This restores a restriction that matches the promise WITHOUT re-breaking
-- the paths 00045 missed. A business can read a worker profile iff the
-- worker has a relationship with THAT business:
--   1. applied to one of the business's jobs (covers interviews, offers,
--      contracts - all hang off applications)
--   2. shares a conversation with the business owner (messaging)
--   3. follows the business (a deliberate public act toward it)
-- Workers always see their own row; admins keep their separate policy
-- (00011). Service-role paths (admin client) bypass RLS regardless.
--
-- IMPLEMENTATION NOTE: the relationship check lives in a SECURITY DEFINER
-- function, not inline in the policy. Inline subqueries against
-- applications / conversation_participants recurse: those tables' own RLS
-- policies consult worker_profiles, whose policy consults them again ->
-- "infinite recursion detected in policy" (verified during testing). A
-- SECURITY DEFINER function evaluates the lookups with the owner's
-- privileges, so RLS on the lookup tables doesn't fire. It is STABLE and
-- only ever answers a yes/no for the calling user, so it leaks nothing.
--
-- Idempotent.

CREATE OR REPLACE FUNCTION public.business_can_view_worker(p_worker_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- 1. worker applied to one of the caller's jobs
    EXISTS (
      SELECT 1
      FROM public.applications a
      JOIN public.job_posts jp ON jp.id = a.job_post_id
      JOIN public.business_profiles bp ON bp.id = jp.business_id
      WHERE a.worker_id = p_worker_profile_id
        AND bp.user_id = auth.uid()
    )
    -- 2. worker shares a conversation with the caller
    OR EXISTS (
      SELECT 1
      FROM public.worker_profiles wp
      JOIN public.conversation_participants them ON them.user_id = wp.user_id
      JOIN public.conversation_participants me
        ON me.conversation_id = them.conversation_id
       AND me.user_id = auth.uid()
      WHERE wp.id = p_worker_profile_id
        AND them.user_id <> me.user_id
    )
    -- 3. worker follows the caller's business
    OR EXISTS (
      SELECT 1
      FROM public.business_followers f
      JOIN public.business_profiles bp ON bp.id = f.business_id
      WHERE f.worker_id = p_worker_profile_id
        AND bp.user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.business_can_view_worker(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.business_can_view_worker(UUID) TO authenticated;

DROP POLICY IF EXISTS "Businesses can view worker profiles" ON public.worker_profiles;
DROP POLICY IF EXISTS "Businesses can view applicant profiles" ON public.worker_profiles;
DROP POLICY IF EXISTS "Businesses can view related worker profiles" ON public.worker_profiles;

CREATE POLICY "Businesses can view related worker profiles"
  ON public.worker_profiles FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.business_can_view_worker(id)
  );

-- Supporting indexes for the function's lookups.
CREATE INDEX IF NOT EXISTS idx_applications_worker_id ON public.applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON public.business_profiles(user_id);

COMMENT ON FUNCTION public.business_can_view_worker(UUID) IS
  'True if the calling business owner has a relationship with this worker (applied to their job, shares a conversation, or follows them). SECURITY DEFINER to avoid RLS recursion.';
COMMENT ON POLICY "Businesses can view related worker profiles" ON public.worker_profiles IS
  'Business owners see a worker profile only via a relationship. Matches the Privacy page.';

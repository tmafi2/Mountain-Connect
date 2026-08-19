-- ============================================================
-- Migration 00089: scope contract FILE access to the two parties
-- ============================================================
-- 00055 created the contracts bucket and gave it these storage policies:
--
--   SELECT  bucket_id = 'contracts' AND auth.role() = 'authenticated'
--   INSERT  bucket_id = 'contracts' AND auth.role() = 'authenticated'
--
-- Neither has a party predicate. The bucket is private, so anonymous
-- access was never possible — but signup is open, so ANY logged-in
-- account could list the bucket and download every signed employment
-- contract on the platform: names, pay terms, and handwritten signatures.
--
-- Object paths are {business_id}/{application_id}/original.pdf and
-- .../signed.pdf (api/contracts/send:54, api/contracts/sign:111), and
-- business_id is not a secret — it is the public /business/{id} URL. So
-- the folder structure that should have scoped access was instead a map
-- for enumerating it.
--
-- WHY THE READ GRANT CANNOT SIMPLY BE REMOVED. Uploads all go through the
-- admin client and so bypass RLS, which makes the INSERT grant pure
-- downside — it lets any account plant files in the bucket and buys
-- nothing. Reads are different: components/ui/ContractViewer.tsx calls
-- createSignedUrl() with the BROWSER client, so storage RLS is what
-- decides whether a party can open their own contract. Tightening SELECT
-- to service-role-only would have silently broken the viewer for
-- everyone.
--
-- WHY A SECURITY DEFINER FUNCTION. Following the precedent set by 00085:
-- an inline subquery from a storage policy into public.contracts is
-- evaluated under the CALLER's RLS, and contracts carries its own
-- party-scoped policies. Two independent policy layers would then have to
-- agree for a legitimate party to see their file, and any future drift in
-- either shows up as an opaque "object not found" rather than a
-- diagnosable denial. The function answers one yes/no question with a
-- fixed definition, and the caller can learn nothing else from it.
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_read_contract_file(
  p_business_id text,
  p_application_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.contracts c
    LEFT JOIN public.business_profiles bp ON bp.id = c.business_id
    LEFT JOIN public.worker_profiles  wp ON wp.id = c.worker_id
    -- Cast the COLUMN to text rather than the path segment to uuid. A
    -- stray object whose first folder is not a valid uuid would make the
    -- other direction raise during policy evaluation, which denies the
    -- whole bucket for everyone rather than just failing to match.
    WHERE c.business_id::text    = p_business_id
      AND c.application_id::text = p_application_id
      AND (bp.user_id = auth.uid() OR wp.user_id = auth.uid())
  );
$$;

COMMENT ON FUNCTION public.can_read_contract_file(text, text) IS
  'True when the current user is either the business that issued the contract '
  'or the worker it was issued to. Takes the first two folder segments of a '
  'contracts-bucket object path. SECURITY DEFINER so the storage policy does '
  'not depend on the caller also passing contracts'' own RLS.';

REVOKE ALL ON FUNCTION public.can_read_contract_file(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.can_read_contract_file(text, text) TO authenticated;

-- ── SELECT: the two parties only ─────────────────────────────
DROP POLICY IF EXISTS "Authenticated read contracts" ON storage.objects;

CREATE POLICY "Contract parties read contract files" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'contracts'
    AND public.can_read_contract_file(
      (storage.foldername(name))[1],
      (storage.foldername(name))[2]
    )
  );

-- ── INSERT: nothing writes here with a user session ──────────
-- Both writers (api/contracts/send and api/contracts/sign) use the admin
-- client, which is service_role and covered by the policy 00055 already
-- created. Removing this closes file-planting without affecting them.
DROP POLICY IF EXISTS "Business upload contracts" ON storage.objects;

-- 00055 defined no UPDATE or DELETE policy for this bucket beyond the
-- service-role FOR ALL, so there is nothing further to revoke. Stated
-- rather than assumed, because "no policy" and "a policy I did not look
-- for" are indistinguishable from a diff.

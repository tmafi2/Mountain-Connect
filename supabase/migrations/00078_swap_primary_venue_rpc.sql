-- ============================================================
-- Migration 00078: swap_primary_venue RPC
-- ============================================================
-- The /business/venues UI's "Make primary" action previously did
-- two sequential UPDATEs (clear existing primary, then set the new
-- one). If the second one failed, the business had no primary
-- venue. This RPC does the swap as a single statement so it's
-- atomic — Postgres evaluates the partial-unique-index check at
-- statement boundary, so flipping both rows in one UPDATE is safe.
--
-- Permissions: SECURITY DEFINER + an explicit ownership check so
-- the function can write through RLS but only when the caller owns
-- the target business.

BEGIN;

CREATE OR REPLACE FUNCTION public.swap_primary_venue(
  p_business_id UUID,
  p_venue_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  SELECT user_id INTO v_owner_id
  FROM public.business_profiles
  WHERE id = p_business_id;

  -- Owner check: caller must be the business owner OR an admin.
  -- Unclaimed businesses (user_id NULL) only admins can touch.
  IF v_owner_id IS NULL OR v_owner_id <> auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Not authorised to manage venues for business %', p_business_id
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  -- Confirm the target venue belongs to the business before flipping.
  IF NOT EXISTS (
    SELECT 1 FROM public.business_venues
    WHERE id = p_venue_id AND business_id = p_business_id
  ) THEN
    RAISE EXCEPTION 'Venue % does not belong to business %', p_venue_id, p_business_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Atomic swap: every row in this business gets is_primary set to
  -- (id = target). Single UPDATE so the partial unique index sees a
  -- consistent state at statement end.
  UPDATE public.business_venues
  SET is_primary = (id = p_venue_id)
  WHERE business_id = p_business_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.swap_primary_venue(UUID, UUID) TO authenticated;

COMMIT;

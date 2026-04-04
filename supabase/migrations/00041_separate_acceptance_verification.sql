-- ============================================================
-- Migration 00041: Separate Business Acceptance from Verification
-- ============================================================
-- Adds 'accepted' and 'pending_verification' enum values to
-- business_verification_status, enabling a two-step flow:
-- 1. Admin accepts registration → 'accepted'
-- 2. Business applies for verification → 'pending_verification'
-- 3. Admin verifies → 'verified' (public)

ALTER TYPE business_verification_status ADD VALUE 'accepted' AFTER 'pending_review';
ALTER TYPE business_verification_status ADD VALUE 'pending_verification' AFTER 'accepted';

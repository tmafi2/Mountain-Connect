-- ============================================================
-- Migration 00044: Two-Factor Authentication
-- ============================================================

-- Add 2FA flag to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;

-- OTP codes for email-based 2FA login verification
CREATE TABLE public.login_otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_login_otp_user ON public.login_otp_codes(user_id);
CREATE INDEX idx_login_otp_expires ON public.login_otp_codes(expires_at);

-- RLS — only service role should access this table (via admin client)
ALTER TABLE public.login_otp_codes ENABLE ROW LEVEL SECURITY;

-- No user-facing policies — all access goes through admin client (service role)

-- Cleanup: delete expired codes older than 1 hour (run periodically or on insert)
CREATE OR REPLACE FUNCTION public.cleanup_expired_otp_codes()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.login_otp_codes
  WHERE expires_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cleanup_expired_otp
  AFTER INSERT ON public.login_otp_codes
  FOR EACH STATEMENT EXECUTE FUNCTION public.cleanup_expired_otp_codes();

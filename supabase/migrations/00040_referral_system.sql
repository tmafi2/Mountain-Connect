-- Referral system: users get unique referral codes, track signups from referrals

-- Store each user's referral code on the users table
ALTER TABLE public.users ADD COLUMN referral_code TEXT UNIQUE;

-- Track completed referrals
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referral_type TEXT CHECK (referral_type IN ('worker', 'business')),
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(referrer_id, referred_user_id)
);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_user_id);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (where they are the referrer)
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid());

-- System inserts referrals via admin client, so no INSERT policy needed for regular users

-- Admins full access
CREATE POLICY "Admins can manage all referrals"
  ON public.referrals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

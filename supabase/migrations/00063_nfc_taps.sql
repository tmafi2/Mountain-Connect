-- Migration 00063: NFC card tap tracking
--
-- Each row is one tap on a physical NFC card that redirected through
-- /card?c=<code>. Admin-only read access.

CREATE TABLE IF NOT EXISTS public.nfc_taps (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_code   TEXT NOT NULL,
  tapped_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_agent  TEXT,
  referrer    TEXT,
  country     TEXT
);

CREATE INDEX IF NOT EXISTS idx_nfc_taps_tapped_at ON public.nfc_taps(tapped_at DESC);
CREATE INDEX IF NOT EXISTS idx_nfc_taps_card_code ON public.nfc_taps(card_code);

ALTER TABLE public.nfc_taps ENABLE ROW LEVEL SECURITY;

-- Service role inserts via admin client — no user-facing INSERT policy needed.
CREATE POLICY "Admins can view nfc taps"
  ON public.nfc_taps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

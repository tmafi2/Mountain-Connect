-- ============================================================
-- Migration 00043: Support Reports
-- ============================================================
-- Stores bug reports, feature requests, and support messages
-- submitted via the floating widget or /support page.

CREATE TABLE public.support_reports (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_email     TEXT NOT NULL,
  user_name      TEXT NOT NULL,
  category       TEXT NOT NULL CHECK (category IN (
                   'bug', 'feature_request', 'content_issue',
                   'account_issue', 'other'
                 )),
  subject        TEXT NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 200),
  message        TEXT NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
  page_url       TEXT,
  user_agent     TEXT,
  status         TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'resolved', 'dismissed')),
  admin_note     TEXT,
  resolved_at    TIMESTAMPTZ,
  resolved_by    UUID REFERENCES public.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_support_reports_user     ON public.support_reports(user_id);
CREATE INDEX idx_support_reports_status   ON public.support_reports(status);
CREATE INDEX idx_support_reports_category ON public.support_reports(category);
CREATE INDEX idx_support_reports_created  ON public.support_reports(created_at DESC);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_support_reports_updated_at
  BEFORE UPDATE ON public.support_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.support_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own support reports"
  ON public.support_reports FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own support reports"
  ON public.support_reports FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all support reports"
  ON public.support_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

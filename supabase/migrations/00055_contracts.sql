-- ============================================================
-- Migration 00055: Contract signing feature
-- ============================================================

-- Contracts table
CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id),
  worker_id UUID NOT NULL REFERENCES public.worker_profiles(id),
  original_pdf_path TEXT NOT NULL,
  signed_pdf_path TEXT,
  signature_data TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'signed')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contracts_application ON public.contracts(application_id);
CREATE INDEX IF NOT EXISTS idx_contracts_worker ON public.contracts(worker_id);
CREATE INDEX IF NOT EXISTS idx_contracts_business ON public.contracts(business_id);

-- RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Workers can view their own contracts
CREATE POLICY "Workers can view own contracts" ON public.contracts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.worker_profiles WHERE id = contracts.worker_id AND user_id = auth.uid()
  ));

-- Businesses can view contracts they sent
CREATE POLICY "Business can view own contracts" ON public.contracts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.business_profiles WHERE id = contracts.business_id AND user_id = auth.uid()
  ));

-- Admin full access
CREATE POLICY "Admin full access to contracts" ON public.contracts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role bypass (for API routes using admin client)
CREATE POLICY "Service role full access to contracts" ON public.contracts FOR ALL
  USING (auth.role() = 'service_role');

-- Storage bucket for contracts (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
-- Business can upload contracts
CREATE POLICY "Business upload contracts" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contracts'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can read their contracts
CREATE POLICY "Authenticated read contracts" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contracts'
    AND auth.role() = 'authenticated'
  );

-- Service role full access to contract files
CREATE POLICY "Service role contract storage" ON storage.objects FOR ALL
  USING (
    bucket_id = 'contracts'
    AND auth.role() = 'service_role'
  );

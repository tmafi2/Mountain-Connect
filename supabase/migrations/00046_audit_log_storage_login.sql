-- ============================================================
-- Migration 00046: Audit Logs, Resume Storage Fix, Login Tracking
-- ============================================================

-- ── 1. Audit Logs ───────────────────────────────────────────

CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID NOT NULL REFERENCES public.users(id),
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT NOT NULL,
  details     JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_admin ON public.audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role inserts (via admin client) — no user-facing insert policy needed

-- ── 2. Login Tracking ───────────────────────────────────────

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

-- ── 3. Resume Storage RLS Fix ───────────────────────────────
-- Note: Run these in the Supabase Dashboard → Storage → resumes → Policies
-- if the SQL below fails (Supabase hosted may not support direct policy creation)

DO $$
BEGIN
  -- Only create if the bucket exists
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'resumes') THEN
    -- Make the bucket private if it's currently public
    UPDATE storage.buckets SET public = false WHERE id = 'resumes' AND public = true;

    -- Create policies on storage.objects (the standard Supabase approach)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workers upload own resumes' AND tablename = 'objects') THEN
      CREATE POLICY "Workers upload own resumes"
        ON storage.objects FOR INSERT TO authenticated
        WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workers read own resumes' AND tablename = 'objects') THEN
      CREATE POLICY "Workers read own resumes"
        ON storage.objects FOR SELECT TO authenticated
        USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workers delete own resumes' AND tablename = 'objects') THEN
      CREATE POLICY "Workers delete own resumes"
        ON storage.objects FOR DELETE TO authenticated
        USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins access all resumes' AND tablename = 'objects') THEN
      CREATE POLICY "Admins access all resumes"
        ON storage.objects FOR ALL TO authenticated
        USING (
          bucket_id = 'resumes' AND EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
          )
        );
    END IF;
  END IF;
END $$;

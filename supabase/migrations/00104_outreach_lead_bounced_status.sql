-- ═══ 00104: A 'bounced' STATUS FOR OUTREACH LEADS ══════════════════════
-- The 2026-09-21 outreach run sent 180 emails: 171 delivered, 2 in flight
-- and SEVEN hard bounces — addresses that do not exist. Nothing in this
-- codebase watches for that. There is no Resend webhook, the send path
-- records a row the moment Resend accepts the message, and Resend accepts
-- a message long before any mailbox rejects it. So a dead address stays
-- `active` and the drip cron emails it again three days later, forever.
--
-- 7 of 180 is a 3.9% bounce rate. Mailbox providers treat 2% as a warning
-- and Amazon SES, which Resend delivers through, reviews senders above 5%,
-- so this is the same domain reputation the unsubscribe work (79789b8) was
-- protecting — arriving from the other direction.
--
-- No new skip logic is needed: `/api/admin/outreach/leads/bulk-send`, the
-- single send and `/api/cron/outreach-drip` all already refuse anything
-- whose status is not 'active'. The status column just could not SAY
-- bounced, so widening the CHECK is the entire mechanism.
--
-- 'bounced' is deliberately not 'unsubscribed': they did not ask us to
-- stop, their mailbox does not exist. Keeping them apart keeps the
-- unsubscribe list honest — `lib/outreach/suppression.ts` reads it to
-- decide who has opted out, and a bounce is not an opt-out.

ALTER TABLE public.outreach_leads DROP CONSTRAINT outreach_leads_status_check;
ALTER TABLE public.outreach_leads ADD CONSTRAINT outreach_leads_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'signed_up'::text, 'unsubscribed'::text, 'bounced'::text]));

-- ── Mark the seven that hard-bounced on 2026-09-21 ─────────────────────
-- Pinned by address and guarded on 'active', so this cannot touch a lead
-- that has since signed up or unsubscribed, and re-running is a no-op.
UPDATE public.outreach_leads
SET status = 'bounced',
    notes = COALESCE(NULLIF(notes, ''), 'Hard-bounced 2026-09-21 on winter-outreach — address does not exist')
WHERE status = 'active'
  AND lower(email) IN (
    'tallen@skisilverstar.com',
    'info@silverstarstays.com',
    'info@revelstokevacation.com',
    'info@monodsports.com',
    'hello@theloaf.ca',
    'hello@purebread.ca',
    'info@oyasunpeaks.com'
  );

-- ═══ VERIFY ════════════════════════════════════════════════════════════
DO $$
DECLARE
  marked INT;
  still_active INT;
  total INT;
BEGIN
  SELECT count(*) INTO marked FROM public.outreach_leads WHERE status = 'bounced';
  IF marked <> 7 THEN
    RAISE EXCEPTION '00104: expected 7 bounced leads, found %', marked;
  END IF;

  SELECT count(*) INTO still_active FROM public.outreach_leads
   WHERE status = 'active' AND lower(email) IN (
     'tallen@skisilverstar.com','info@silverstarstays.com','info@revelstokevacation.com',
     'info@monodsports.com','hello@theloaf.ca','hello@purebread.ca','info@oyasunpeaks.com');
  IF still_active <> 0 THEN
    RAISE EXCEPTION '00104: % bounced addresses are still active', still_active;
  END IF;

  -- Nothing is deleted here, so the row count must not move.
  SELECT count(*) INTO total FROM public.outreach_leads;
  IF total <> 222 THEN
    RAISE EXCEPTION '00104: lead count changed to % (expected 222)', total;
  END IF;

  RAISE NOTICE '00104 ok: 7 marked bounced, 222 leads intact';
END $$;

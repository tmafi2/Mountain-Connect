-- Migration 00064: Richer NFC tap tracking
--
-- Adds geo detail (city, region, timezone, lat/long), parsed device info
-- (os, browser, device_type), and an event_type column so we can log
-- multiple event kinds on the same table (tap vs vcard_download).

ALTER TABLE public.nfc_taps
  ADD COLUMN IF NOT EXISTS event_type  TEXT NOT NULL DEFAULT 'tap',
  ADD COLUMN IF NOT EXISTS city        TEXT,
  ADD COLUMN IF NOT EXISTS region      TEXT,
  ADD COLUMN IF NOT EXISTS timezone    TEXT,
  ADD COLUMN IF NOT EXISTS latitude    NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS longitude   NUMERIC(9, 6),
  ADD COLUMN IF NOT EXISTS os          TEXT,
  ADD COLUMN IF NOT EXISTS browser     TEXT,
  ADD COLUMN IF NOT EXISTS device_type TEXT;

CREATE INDEX IF NOT EXISTS idx_nfc_taps_event_type ON public.nfc_taps(event_type);

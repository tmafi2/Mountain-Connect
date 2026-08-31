-- ============================================================
-- Migration 00095: one Odin, not three
-- ============================================================
-- The Facebook monitor found three posts from the same operator and had no
-- way to know they were one company, so it created three business records:
--
--   Odin Living / Odin Hills   recruitment@odin-living.com    2 live jobs
--   Odin Living                hrmanager@odin-living.com      2 live jobs
--   The Barn by Odin           recuritment@odin-living.com    1 live job
--
-- All three have already had the import outreach. Odin has therefore had two
-- emails delivered and one bounce — the third address is misspelled,
-- "recuritment" for "recruitment", which came from the scraped post and not
-- from us. Tomorrow's dormancy sweep would have sent two more, and a third
-- bounce the day after: four near-identical emails in three days from a
-- company they have never dealt with, which reads as spam and is the
-- fastest way to lose them.
--
-- All five listings move onto the record with the proper recruitment
-- address. The other two are left in place rather than deleted — nothing is
-- destroyed, their claim tokens still work, and with no active listings the
-- dormancy sweep skips them by the guard it already has. They are renamed so
-- the duplication is obvious in /admin/businesses rather than looking like
-- three unrelated prospects.
--
-- Safe to move because none of these job posts has a venue_id, so the
-- venue-belongs-to-business trigger from 00077 has nothing to object to.
-- Verified before writing this.
--
-- The proper long-term model is one business with venues — Odin Hills and
-- The Barn are venues, and business_venues exists for exactly this. That is
-- the claimant's to set up once they own the account, not ours to guess at.
-- ============================================================

-- ── 1. Everything belongs to the recruitment@ record ────────
UPDATE public.job_posts
SET business_id = '27378dfe-7a23-49b4-b6b4-9d423ffabb06'
WHERE business_id IN (
  '14d8d3ce-55dc-4054-ba8b-a442e0b3e61a',  -- Odin Living, hrmanager@
  'ea266074-c42d-4b16-9ff4-cdf08975b898'   -- The Barn by Odin, typo'd address
);

-- ── 2. Name the survivor plainly ────────────────────────────
UPDATE public.business_profiles
SET business_name = 'Odin Living'
WHERE id = '27378dfe-7a23-49b4-b6b4-9d423ffabb06';

-- ── 3. Mark the emptied records so they read as what they are ──
UPDATE public.business_profiles
SET business_name = business_name || ' (duplicate import — merged into Odin Living)'
WHERE id IN (
  '14d8d3ce-55dc-4054-ba8b-a442e0b3e61a',
  'ea266074-c42d-4b16-9ff4-cdf08975b898'
);

-- ── 4. Fix the misspelled address ───────────────────────────
-- Corrected even though this record is now dormant: an address that only
-- differs by two transposed letters is exactly the kind of thing that gets
-- copied back out of the database later and quietly bounces again.
UPDATE public.business_profiles
SET email = 'recruitment@odin-living.com'
WHERE id = 'ea266074-c42d-4b16-9ff4-cdf08975b898'
  AND email = 'recuritment@odin-living.com';

-- 00097_consolidate_odin_duplicates.sql
--
-- Collapse the eleven Odin business records back into the three real ones.
--
-- WHAT HAPPENED. 00095 merged three Odin Living records and, in doing so,
-- corrected a misspelled `recuritment@odin-living.com` to `recruitment@`.
-- That gave the renamed leftover row the SAME email as the live record — and
-- both import routes looked businesses up with `.eq("email", …).maybeSingle()`
-- while discarding the error. PostgREST answers that with PGRST116 when more
-- than one row matches, so `data` came back null, the caller read it as "no
-- such business", and inserted another. Two rows on 31 Aug became six by
-- 4 Sep and eleven by 7 Sep, and every new row made the match fail harder.
--
-- The code fix (lib/admin/business-by-email.ts) stopped the growth. This
-- migration cleans up what was already created.
--
-- THREE BUSINESSES SURVIVE, NOT ONE. Odin Living, Mūsu Bar & Bistro and The
-- Barn by Odin share a recruitment address but are three establishments a job
-- seeker would rightly see as separate, so each keeps its own record. The
-- lookup now prefers a row whose name matches the incoming post, which is what
-- makes that survivable: a Mūsu advert finds Mūsu rather than whichever record
-- happens to be oldest.
--
-- The Barn's surviving row is the one 00095 renamed to
-- "The Barn by Odin (duplicate import — merged into Odin Living)". That
-- rename rested on the assumption it was a duplicate; it is not, so the name
-- is restored. It is also the oldest Barn record and the one already emailed.
--
-- NOTHING IS DELETED, matching 00092 and 00095. Retired rows keep their id and
-- history; they lose their email (so nothing can find or write to them again)
-- and are renamed to say where their listings went. Listings are MOVED to the
-- survivor rather than dropped — leaving job_posts pointed at a tombstoned row
-- is precisely what left 00095's leftover serving a live "Receptionist" under
-- a name reading "(duplicate import — merged into Odin Living)" on the public
-- site for nineteen days.
--
-- ⚠️ LEAVES DUPLICATE DRAFTS FOR A HUMAN. Moving the listings gives Odin
-- Living three "Restaurant Manager" rows (one active, two drafts), Mūsu two
-- "Head Chef" (one active, one draft) and The Barn two "Chef" drafts. Every
-- duplicate is a DRAFT — invisible to the public — with zero expressions of
-- interest, applications and saves, verified against prod before writing this.
-- They are left in the pending queue at /admin/jobs to be binned by hand,
-- because deciding which of two scrapes of one advert to keep is a judgement
-- call and this file has never been the place to make those silently.
--
-- Idempotent: every statement is guarded, so a second run is a no-op.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Move every listing onto the business that survives.
-- ---------------------------------------------------------------------------

-- Into Odin Living: two later "Odin Living" shells, the "Odin Living / Odin
-- Hills" name variant, and the hrmanager@ record 00095 retired while it still
-- held a live listing.
UPDATE public.job_posts
SET business_id = '27378dfe-7a23-49b4-b6b4-9d423ffabb06'
WHERE business_id IN (
  'df2e23c5-74df-40c5-a89a-0c5ad41c430b',  -- Odin Living (4 Sep)
  '9556569b-106e-41f4-9a65-fad838e6b3e4',  -- Odin Living (6 Sep)
  'a1fd8a1d-9d78-4138-b614-bed430d7424c',  -- Odin Living / Odin Hills (4 Sep)
  '14d8d3ce-55dc-4054-ba8b-a442e0b3e61a'   -- hrmanager@, retired by 00095
);

-- Into Mūsu Bar & Bistro.
UPDATE public.job_posts
SET business_id = '5bd16257-36a2-4d4a-a330-a67698fd31b7'
WHERE business_id IN (
  'b3e61b8c-8acd-403e-953e-c72a710dec10',  -- Mūsu (6 Sep)
  'e82fced6-090c-4c7e-9bd3-981f0c3ef5f6'   -- Mūsu (7 Sep), holds the live Head Chef
);

-- Into The Barn by Odin.
UPDATE public.job_posts
SET business_id = 'ea266074-c42d-4b16-9ff4-cdf08975b898'
WHERE business_id IN (
  'dab6fbef-b506-441a-8e5d-bb1ba2cf662b',  -- The Barn by Odin (6 Sep)
  'f5f9274b-c403-4cee-aa38-d15e24bf7d91'   -- The Barn by Odin (7 Sep)
);

-- ---------------------------------------------------------------------------
-- 2. Restore The Barn's name.
--
-- 00095 renamed this row on the understanding it was a duplicate of Odin
-- Living. It is a separate business, and the name has been public since.
-- Guarded on the tombstone text so a re-run cannot clobber a later edit.
-- ---------------------------------------------------------------------------
UPDATE public.business_profiles
SET business_name = 'The Barn by Odin'
WHERE id = 'ea266074-c42d-4b16-9ff4-cdf08975b898'
  AND business_name LIKE '%duplicate import%';

-- ---------------------------------------------------------------------------
-- 3. Retire the rows the bug created.
--
-- The email goes first and matters most: it is the only handle the importer,
-- the claim flow and the outreach cadence have on a row, so clearing it takes
-- these permanently out of circulation without deleting anything. The rename
-- is for whoever finds one of these in the admin list a year from now.
--
-- Guarded on `email IS NOT NULL` so re-running neither renames twice nor
-- re-clears a row somebody has since repurposed.
-- ---------------------------------------------------------------------------
UPDATE public.business_profiles
SET email = NULL,
    business_name = business_name || ' (duplicate — see Odin Living)'
WHERE id IN (
  'df2e23c5-74df-40c5-a89a-0c5ad41c430b',
  '9556569b-106e-41f4-9a65-fad838e6b3e4',
  'a1fd8a1d-9d78-4138-b614-bed430d7424c'
) AND email IS NOT NULL;

UPDATE public.business_profiles
SET email = NULL,
    business_name = business_name || ' (duplicate — see Mūsu Bar & Bistro)'
WHERE id IN (
  'b3e61b8c-8acd-403e-953e-c72a710dec10',
  'e82fced6-090c-4c7e-9bd3-981f0c3ef5f6'
) AND email IS NOT NULL;

UPDATE public.business_profiles
SET email = NULL,
    business_name = business_name || ' (duplicate — see The Barn by Odin)'
WHERE id IN (
  'dab6fbef-b506-441a-8e5d-bb1ba2cf662b',
  'f5f9274b-c403-4cee-aa38-d15e24bf7d91'
) AND email IS NOT NULL;

-- The hrmanager@ row 00095 already renamed. Its listing has moved to Odin
-- Living above; clearing the address stops a post sent to that second inbox
-- reviving it as a separate business.
UPDATE public.business_profiles
SET email = NULL
WHERE id = '14d8d3ce-55dc-4054-ba8b-a442e0b3e61a'
  AND email IS NOT NULL;

COMMIT;

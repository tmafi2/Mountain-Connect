-- 00101_retire_odin_typo_row_and_unname_barn_tombstones.sql
--
-- Two leftovers from the Odin cleanup. Both look cosmetic; neither is.
--
-- 1. A THIRD "The Barn by Odin" record, created 2026-09-09 from a post
--    carrying the misspelled address `recuritment@odin-living.com`. 00097
--    had collapsed eleven Odin rows two days earlier, but it can only match
--    on email, and this address is one edit away from the real one, so the
--    next scrape made a new row rather than finding the old. It holds no
--    listings, no EOIs and no applications. Clearing its email retires it
--    exactly as 00095 and 00097 retired theirs: the row, its id and its
--    history stay, but outreach can no longer reach a typo and the importer
--    can no longer match it.
--    ⚠️ ALONE THIS COMES STRAIGHT BACK on the next scrape of that post.
--    `lib/admin/business-by-email.ts` now maps the misspelling onto the real
--    address; this migration without that code is pointless.
--
-- 2. SEVEN rows still publicly named "<business> (duplicate — see
--    <business>)" by 00095 and 00097. 00098 took that kind of note off one
--    tombstone — the only one that still had a live listing pointing at it —
--    and left the rest, on the reasoning that `business_name` renders in the
--    <h1>, <title> and meta description of /business/{id}. But `app/sitemap.ts`
--    lists EVERY business row, listings or not, so all seven have been
--    offering Google a page whose title is a note to ourselves. The note is
--    stripped rather than rewritten, which keeps each row's own name,
--    including the scraped variant "Odin Living / Odin Hills". What tells
--    these rows apart in the admin list is their empty listing count.
--
-- Nothing is deleted. Each statement is guarded on the exact text it expects,
-- so a re-run cannot touch a row somebody has since given a real name or a
-- real address.

DO $$
DECLARE
  typo_id constant uuid := 'aa76091c-574e-40a6-a5f8-a60fe6d4e85a';
  canonical_id uuid;
  n_jobs int;
  n_retired int;
  n_renamed int;
  n_skipped int;
BEGIN
  -- The real Barn record must still hold the correctly spelled address, or
  -- retiring the typo row would leave that business with no address at all.
  SELECT id INTO canonical_id
    FROM public.business_profiles
   WHERE business_name = 'The Barn by Odin'
     AND email = 'recruitment@odin-living.com';
  IF canonical_id IS NULL THEN
    RAISE EXCEPTION '00101: no Barn row holds recruitment@odin-living.com; aborting';
  END IF;

  -- Retiring a row that has gained listings would strand them.
  SELECT count(*) INTO n_jobs FROM public.job_posts WHERE business_id = typo_id;
  IF n_jobs <> 0 THEN
    RAISE EXCEPTION '00101: the typo row now holds % listing(s); move them first', n_jobs;
  END IF;

  UPDATE public.business_profiles
     SET email = NULL
   WHERE id = typo_id
     AND email = 'recuritment@odin-living.com'
     AND user_id IS NULL;
  GET DIAGNOSTICS n_retired = ROW_COUNT;

  -- Only inert rows: a tombstone has no address and no listings. Anything
  -- carrying a note AND real content is a mistake to look at by hand, not to
  -- rename in a migration, so it is counted and left alone.
  UPDATE public.business_profiles b
     SET business_name = regexp_replace(b.business_name, '\s*\(duplicate[^)]*\)\s*$', '')
   WHERE b.business_name LIKE '%(duplicate%'
     AND b.email IS NULL
     AND b.user_id IS NULL
     AND NOT EXISTS (SELECT 1 FROM public.job_posts j WHERE j.business_id = b.id)
     AND length(regexp_replace(b.business_name, '\s*\(duplicate[^)]*\)\s*$', '')) > 0;
  GET DIAGNOSTICS n_renamed = ROW_COUNT;

  SELECT count(*) INTO n_skipped
    FROM public.business_profiles
   WHERE business_name LIKE '%(duplicate%';
  IF n_skipped > 0 THEN
    RAISE NOTICE '00101: % row(s) still carry a note and were left for a human (they have an address, an owner or listings)', n_skipped;
  END IF;

  RAISE NOTICE '00101: retired % typo row(s), took the note off % tombstone(s)', n_retired, n_renamed;
END $$;

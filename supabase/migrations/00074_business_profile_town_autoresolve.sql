-- 00074_business_profile_town_autoresolve.sql
--
-- Belt-and-braces enforcement of the platform rule that nearby_town_id
-- is the source of truth for "where the business is". Adds a BEFORE
-- INSERT OR UPDATE trigger on business_profiles that auto-stamps
-- nearby_town_id from the location text when the FK is null.
--
-- Mirrors the application-level resolver at lib/data/resolve-town.ts:
--   - Only acts when nearby_town_id IS NULL (never overwrites an
--     explicit value)
--   - Exact match only (no fuzzy correction — typos still surface so
--     they can be fixed in admin)
--   - Tries the full location string first, then the first
--     comma-separated chunk
--
-- The trigger means even ad-hoc updates from the Supabase Studio,
-- one-off scripts, or any future write path stay in sync without
-- needing to remember the rule.

BEGIN;

CREATE OR REPLACE FUNCTION public.business_profiles_autoresolve_town()
RETURNS TRIGGER AS $$
DECLARE
  loc_full text;
  loc_first_chunk text;
  matched_id uuid;
BEGIN
  -- Skip if the row already has a town set or no location to resolve
  -- from. Lower(trim()) keeps the match insensitive to whitespace and
  -- case without rewriting the underlying location text.
  IF NEW.nearby_town_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.location IS NULL OR length(trim(NEW.location)) = 0 THEN
    RETURN NEW;
  END IF;

  loc_full := lower(trim(NEW.location));
  loc_first_chunk := lower(trim(split_part(NEW.location, ',', 1)));

  SELECT id INTO matched_id
  FROM public.nearby_towns
  WHERE lower(name) = loc_full
     OR lower(name) = loc_first_chunk
  LIMIT 1;

  IF matched_id IS NOT NULL THEN
    NEW.nearby_town_id := matched_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_profiles_autoresolve_town_trigger
  ON public.business_profiles;

CREATE TRIGGER business_profiles_autoresolve_town_trigger
BEFORE INSERT OR UPDATE OF location, nearby_town_id
ON public.business_profiles
FOR EACH ROW
EXECUTE FUNCTION public.business_profiles_autoresolve_town();

-- Run it once across existing rows to catch anything that slipped
-- through past inserts. Cheap (only touches NULL rows where location
-- happens to match a town name); safe to run on every migration apply
-- because the trigger function itself is a no-op when there's nothing
-- to resolve.
UPDATE public.business_profiles
SET location = location  -- no-op write to fire the trigger
WHERE nearby_town_id IS NULL
  AND location IS NOT NULL
  AND length(trim(location)) > 0;

COMMIT;

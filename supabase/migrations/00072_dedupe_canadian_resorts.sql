-- 00072_dedupe_canadian_resorts.sql
--
-- Cleans up the duplicate Canadian resort rows (legacy_ids 57–69) that
-- snuck in when migration 00029 was run twice. Each legacy_id has two
-- rows; the references (resort_nearby_towns links) are scattered across
-- both copies so we can't blindly keep the older one.
--
-- Strategy: for every duplicate legacy_id, keep the row with the most
-- references (ties broken by oldest), reassign any references on the
-- losers to the winner first, then delete the losers. Finally, add a
-- UNIQUE constraint on legacy_id so a re-run of any seeding migration
-- can't recreate this mess (the previous ON CONFLICT DO NOTHING was
-- silently matching on the UUID id, which is always unique).

BEGIN;

-- Pick the winning row for each legacy_id in the duplicate range.
-- Note: business_resorts.resort_id is TEXT and stores the legacy_id,
-- not the UUID — both duplicate rows share the same legacy_id so
-- business_resorts links don't need rewriting and don't affect the
-- "which row has refs" decision.
WITH ref_counts AS (
  SELECT
    r.id,
    r.legacy_id,
    r.created_at,
    (
      (SELECT COUNT(*) FROM public.resort_nearby_towns rnt WHERE rnt.resort_id = r.id) +
      (SELECT COUNT(*) FROM public.business_profiles bp WHERE bp.resort_id = r.id::text) +
      (SELECT COUNT(*) FROM public.job_posts jp WHERE jp.resort_id = r.id)
    ) AS ref_total
  FROM public.resorts r
  WHERE r.legacy_id BETWEEN '57' AND '69'
),
winners AS (
  SELECT DISTINCT ON (legacy_id) id, legacy_id
  FROM ref_counts
  ORDER BY legacy_id, ref_total DESC, created_at ASC
),
losers AS (
  SELECT r.id, r.legacy_id, w.id AS winner_id
  FROM public.resorts r
  JOIN winners w USING (legacy_id)
  WHERE r.legacy_id BETWEEN '57' AND '69'
    AND r.id <> w.id
)
-- Reassign any references that happen to point at a loser. With current
-- data the bizs/jobs/business_resorts counts are all zero, but safer to
-- include them so this is correct if the data shifts before run.
UPDATE public.resort_nearby_towns rnt
SET resort_id = l.winner_id
FROM losers l
WHERE rnt.resort_id = l.id
  -- Avoid creating a duplicate (resort_id, town_id) row if the winner
  -- already links to that town.
  AND NOT EXISTS (
    SELECT 1 FROM public.resort_nearby_towns x
    WHERE x.resort_id = l.winner_id AND x.town_id = rnt.town_id
  );

-- Any rnt rows that would have collided are dropped — the winner
-- already covers that town link.
DELETE FROM public.resort_nearby_towns rnt
USING (
  WITH ref_counts AS (
    SELECT
      r.id, r.legacy_id, r.created_at,
      (SELECT COUNT(*) FROM public.resort_nearby_towns rnt2 WHERE rnt2.resort_id = r.id) AS ref_total
    FROM public.resorts r
    WHERE r.legacy_id BETWEEN '57' AND '69'
  ),
  winners AS (
    SELECT DISTINCT ON (legacy_id) id, legacy_id
    FROM ref_counts
    ORDER BY legacy_id, ref_total DESC, created_at ASC
  )
  SELECT r.id AS loser_id
  FROM public.resorts r
  JOIN winners w USING (legacy_id)
  WHERE r.legacy_id BETWEEN '57' AND '69'
    AND r.id <> w.id
) l
WHERE rnt.resort_id = l.loser_id;

-- Same for business_profiles, job_posts, business_resorts — point at the winner.
WITH winners AS (
  SELECT DISTINCT ON (legacy_id) r.id, r.legacy_id
  FROM public.resorts r
  WHERE r.legacy_id BETWEEN '57' AND '69'
  ORDER BY r.legacy_id,
    (SELECT COUNT(*) FROM public.resort_nearby_towns rnt WHERE rnt.resort_id = r.id) DESC,
    r.created_at ASC
),
losers AS (
  SELECT r.id, w.id AS winner_id
  FROM public.resorts r
  JOIN winners w USING (legacy_id)
  WHERE r.legacy_id BETWEEN '57' AND '69'
    AND r.id <> w.id
)
-- business_profiles.resort_id is a TEXT column that stores UUID
-- strings, so explicit casts on both sides are required.
UPDATE public.business_profiles bp
SET resort_id = l.winner_id::text
FROM losers l
WHERE bp.resort_id = l.id::text;

WITH winners AS (
  SELECT DISTINCT ON (legacy_id) r.id, r.legacy_id
  FROM public.resorts r
  WHERE r.legacy_id BETWEEN '57' AND '69'
  ORDER BY r.legacy_id,
    (SELECT COUNT(*) FROM public.resort_nearby_towns rnt WHERE rnt.resort_id = r.id) DESC,
    r.created_at ASC
),
losers AS (
  SELECT r.id, w.id AS winner_id
  FROM public.resorts r
  JOIN winners w USING (legacy_id)
  WHERE r.legacy_id BETWEEN '57' AND '69'
    AND r.id <> w.id
)
UPDATE public.job_posts jp
SET resort_id = l.winner_id
FROM losers l
WHERE jp.resort_id = l.id;

-- business_resorts links by text legacy_id (not UUID) so duplicates
-- there don't exist — both copies share the same legacy_id.

-- Now drop the loser rows themselves.
WITH winners AS (
  SELECT DISTINCT ON (legacy_id) r.id, r.legacy_id
  FROM public.resorts r
  WHERE r.legacy_id BETWEEN '57' AND '69'
  ORDER BY r.legacy_id,
    (SELECT COUNT(*) FROM public.resort_nearby_towns rnt WHERE rnt.resort_id = r.id) DESC,
    r.created_at ASC
)
DELETE FROM public.resorts r
WHERE r.legacy_id BETWEEN '57' AND '69'
  AND r.id NOT IN (SELECT id FROM winners);

-- Lock it down: legacy_id must be unique going forward so an accidental
-- re-run of any seeding migration fails loudly instead of silently
-- duplicating rows.
ALTER TABLE public.resorts
  ADD CONSTRAINT resorts_legacy_id_key UNIQUE (legacy_id);

COMMIT;

-- 00099_move_full_time_to_position_type.sql
--
-- Take "full_time" out of worker_profiles.preferred_job_types, where it never
-- belonged, and put it in position_type, where it did.
--
-- Two columns, easily confused:
--   preferred_job_types — ROLES: the profile editor's JOB_TYPE_OPTIONS
--                         ("Hospitality", "Lift Operator", …)
--   position_type       — full_time | part_time | casual (CHECK constraint)
-- Onboarding's "Work — I'm looking for seasonal work" answer wrote
-- ["full_time"] into the roles column from the day it shipped in March 2026.
-- The intent was "looking for work → full-time" (the accommodation answer
-- beside it maps to a housing_preference default the same way); "job type"
-- simply reads both ways, and /admin/jobs labels position_type "Job Type".
--
-- What it did: on 2026-09-19, 300 of 337 worker profiles showed a "Full Time"
-- chip under Preferred Job Types, on their own profile and on the page
-- businesses see, including 48 workers who had chosen part-time or casual.
-- The profile editor could not remove it, because its chips come from
-- JOB_TYPE_OPTIONS and "full_time" is not one of them.
--
-- One statement, per row:
--   * array_remove 'full_time' from preferred_job_types. Every other value in
--     the column is a JOB_TYPE_OPTIONS label, and 'part_time' and 'casual'
--     never appear, so onboarding is the only thing that ever wrote this.
--   * position_type = 'full_time' only where it is NULL (170 rows). That is
--     exactly what fixed onboarding now does for "Work", so these rows end up
--     as if the bug never happened, and it is what their profiles already
--     showed, now in a field the worker can change. COALESCE cannot touch the
--     130 who chose a position type themselves; they just lose the chip.
--
-- A row whose only job type was 'full_time' (157) is left with '{}', which
-- every reader treats the same as NULL.
--
-- Side effects, both accepted:
--   * the worker_profiles_updated_at trigger stamps updated_at on all 300
--     rows. Nothing in the app reads worker_profiles.updated_at.
--   * profile_completion_pct is only recomputed when the worker next saves in
--     the editor. 17 rows gain a filled field (roles kept, position_type
--     filled) and 4 lose one (their only role was 'full_time'), so their
--     stored % is about 6 points off until then.
--
-- Apply AFTER the onboarding fix is live, or signups in between write the
-- chip again. Guarded on the value itself, so re-running matches nothing.

UPDATE public.worker_profiles
SET
  preferred_job_types = array_remove(preferred_job_types, 'full_time'),
  position_type       = COALESCE(position_type, 'full_time')
WHERE 'full_time' = ANY (preferred_job_types);

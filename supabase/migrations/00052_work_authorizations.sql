-- Per-country work authorization replaces single visa_status/visa_expiry_date
-- Each entry: { country, visa_status, visa_expiry }
ALTER TABLE worker_profiles
ADD COLUMN IF NOT EXISTS work_authorizations jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN worker_profiles.work_authorizations
IS 'Array of per-country work authorizations. Each entry: {country: string, visa_status: string, visa_expiry: string|null}. Replaces the old single visa_status/visa_expiry_date fields.';

-- Migrate existing data into the new column where possible
UPDATE worker_profiles
SET work_authorizations = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'country', c,
      'visa_status', COALESCE(visa_status, 'other'),
      'visa_expiry', visa_expiry_date::text
    )
  )
  FROM unnest(work_eligible_countries) AS c
)
WHERE work_eligible_countries IS NOT NULL
  AND array_length(work_eligible_countries, 1) > 0
  AND (work_authorizations IS NULL OR work_authorizations = '[]'::jsonb);

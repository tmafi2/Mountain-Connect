-- Rename "Oceania" region to "Australia / New Zealand" in the regions table
UPDATE public.regions
SET name = 'Australia / New Zealand'
WHERE name = 'Oceania';

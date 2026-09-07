-- 00098_unname_public_odin_tombstone.sql
--
-- Take a bookkeeping note off a public page.
--
-- 00095 renamed this record to "Odin Living (duplicate import — merged into
-- Odin Living)" to mark it as merged. Nothing about that name was meant for
-- anybody outside the admin panel — but business_profiles.business_name is
-- what /business/{id} renders, in the <h1>, the <title> and the meta
-- description, and the row kept a live "Receptionist" listing linking to it
-- from the job board. It was public for nineteen days on a page served
-- `index, follow`, so it is very likely in Google's index.
--
-- 00097 moved that listing onto the real Odin Living record and cleared this
-- row's email, so it is now inert: nothing links to it, the importer cannot
-- match it, and no email can reach it. All that is left is the name, and
-- "Odin Living" is both truthful and unembarrassing. The empty listing count
-- is what distinguishes it in the admin list.
--
-- The lesson worth keeping: a column that renders on a public page is not a
-- place to write notes to yourself. If a future merge needs an audit trail,
-- it belongs in a column nothing renders.
--
-- Guarded on the tombstone text, so re-running cannot rename a row somebody
-- has since given a real name.

UPDATE public.business_profiles
SET business_name = 'Odin Living'
WHERE id = '14d8d3ce-55dc-4054-ba8b-a442e0b3e61a'
  AND business_name LIKE '%duplicate import%';

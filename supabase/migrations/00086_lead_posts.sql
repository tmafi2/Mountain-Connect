-- ============================================================
-- Migration 00086: lead_posts — seasonal-worker lead monitor
-- ============================================================
-- Backing table for the lead monitor: posts collected from ski-region
-- community groups where someone says they are looking for seasonal work.
-- Written only by scripts/lead-monitor (service role, PostgREST), read only
-- by us.
--
-- ACCESS MODEL: RLS is enabled with ZERO policies, so every non-service-role
-- caller is denied by default — anon, authenticated, workers, businesses,
-- admins. The service key used by the CLI bypasses RLS. There is deliberately
-- no user-facing path to this table.
--
-- WHY THAT MATTERS: unlike every other table in this schema, the people in
-- here never signed up for Mountain Connects. The rows are personal data
-- about third parties (name, the text they wrote, a link back to them),
-- gathered from public posts across four jurisdictions. Keep it service-role
-- only, and prefer a retention sweep over hoarding.
--
-- DEDUP: dedup_key is a 16-char FNV-1a 64 hex digest computed in application
-- code — see scripts/lead-monitor/dedup-key.ts. Its UNIQUE constraint is what
-- `on_conflict=dedup_key` upserts resolve against, and it is the ONLY thing
-- stopping the same post from re-inserting every run. The algorithm is pinned
-- by tests; changing it orphans every row in this table.

create table if not exists public.lead_posts (
  id uuid primary key default gen_random_uuid(),

  -- Application-computed hash of (group | poster | first 120 code points of
  -- post text). See scripts/lead-monitor/dedup-key.ts.
  dedup_key text not null unique,

  region text not null,
  source_group text not null,
  post_type text not null default 'Seeking Work',

  role_category text,
  poster_name text,
  post_content text,
  post_url text,
  availability text,
  language text default 'en',

  -- When the author posted it. Null whenever the timestamp could not be
  -- parsed — the ingest CLI never guesses a date.
  date_posted date,
  -- When we collected it. current_date is evaluated in the database's
  -- timezone (UTC on Supabase).
  date_found date not null default current_date,

  status text not null default 'new',
  contacted_at timestamptz,
  converted_user_id uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),

  constraint lead_posts_region_check
    check (region in ('Canada', 'USA', 'Japan', 'Australia')),
  constraint lead_posts_post_type_check
    check (post_type in ('Seeking Work', 'Hiring', 'Unknown')),
  constraint lead_posts_status_check
    check (status in ('new', 'reviewing', 'contacted', 'converted', 'rejected'))
);

-- Region browse, newest first. Also the index that serves `fetch-keys`,
-- which pulls dedup_keys for one region within a recent created_at window.
create index if not exists lead_posts_region_created_at_idx
  on public.lead_posts (region, created_at desc);

-- The review queue. Partial, so it stays small as contacted/converted/
-- rejected rows accumulate and drop out of it.
create index if not exists lead_posts_open_status_idx
  on public.lead_posts (status)
  where status in ('new', 'reviewing');

alter table public.lead_posts enable row level security;

-- No policies, by design: service role only.

-- Defence in depth. RLS with zero policies already denies anon and
-- authenticated everything, so this is belt-and-braces for a table holding
-- other people's personal data: if someone later adds a permissive policy by
-- mistake, the missing grant still blocks reads.
--
-- If you deliberately want to expose this table (an admin review screen, say),
-- you must re-grant as well as add a policy:
--   grant select on public.lead_posts to authenticated;
revoke all on public.lead_posts from anon, authenticated;

comment on table public.lead_posts is
  'Seasonal-work leads collected from public community-group posts. Service role only — no RLS policies exist. Contains personal data about people who are not Mountain Connects users; see scripts/lead-monitor/README.md.';

comment on column public.lead_posts.dedup_key is
  'FNV-1a 64 hex digest of group|poster|first 120 code points of post text, computed by scripts/lead-monitor/dedup-key.ts. Changing that algorithm orphans every row here.';

comment on column public.lead_posts.date_posted is
  'Date the author posted, or null when the source timestamp was unparseable. Never inferred.';

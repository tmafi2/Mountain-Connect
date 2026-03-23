-- Mountain Connect Database Schema
-- Run this migration in Supabase SQL Editor or via Supabase CLI

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- USERS
-- ============================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  role text check (role in ('worker', 'business_owner')),
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own data"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own data"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own data"
  on public.users for insert
  with check (auth.uid() = id);

-- ============================================
-- WORKER PROFILES
-- ============================================
create table public.worker_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  bio text,
  skills text[],
  work_history jsonb default '[]'::jsonb,
  location text,
  availability_start date,
  availability_end date,
  cv_url text,
  unique (user_id)
);

alter table public.worker_profiles enable row level security;

create policy "Workers can read own profile"
  on public.worker_profiles for select
  using (auth.uid() = user_id);

create policy "Workers can update own profile"
  on public.worker_profiles for update
  using (auth.uid() = user_id);

create policy "Workers can insert own profile"
  on public.worker_profiles for insert
  with check (auth.uid() = user_id);

create policy "Businesses can view worker profiles"
  on public.worker_profiles for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'business_owner'
    )
  );

-- ============================================
-- BUSINESS PROFILES
-- ============================================
create table public.business_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  business_name text not null,
  description text,
  website text,
  location text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.business_profiles enable row level security;

create policy "Business owners can read own profile"
  on public.business_profiles for select
  using (auth.uid() = user_id);

create policy "Business owners can update own profile"
  on public.business_profiles for update
  using (auth.uid() = user_id);

create policy "Business owners can insert own profile"
  on public.business_profiles for insert
  with check (auth.uid() = user_id);

create policy "Public can view verified businesses"
  on public.business_profiles for select
  using (is_verified = true);

-- ============================================
-- REGIONS
-- ============================================
create table public.regions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  country text not null,
  description text
);

alter table public.regions enable row level security;

create policy "Anyone can view regions"
  on public.regions for select
  using (true);

-- ============================================
-- RESORTS
-- ============================================
create table public.resorts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  region_id uuid references public.regions(id),
  country text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  season_start date,
  season_end date,
  vertical_drop_m integer,
  num_runs integer,
  num_lifts integer,
  created_at timestamptz not null default now()
);

alter table public.resorts enable row level security;

create policy "Anyone can view resorts"
  on public.resorts for select
  using (true);

-- ============================================
-- JOB POSTS
-- ============================================
create table public.job_posts (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid not null references public.business_profiles(id) on delete cascade,
  resort_id uuid not null references public.resorts(id),
  title text not null,
  description text not null,
  requirements text,
  accommodation_included boolean not null default false,
  salary_range text,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.job_posts enable row level security;

create policy "Anyone can view active jobs"
  on public.job_posts for select
  using (is_active = true);

create policy "Business owners can manage own jobs"
  on public.job_posts for all
  using (
    exists (
      select 1 from public.business_profiles
      where id = job_posts.business_id and user_id = auth.uid()
    )
  );

-- ============================================
-- APPLICATIONS
-- ============================================
create table public.applications (
  id uuid primary key default uuid_generate_v4(),
  job_post_id uuid not null references public.job_posts(id) on delete cascade,
  worker_id uuid not null references public.worker_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'accepted', 'rejected')),
  applied_at timestamptz not null default now(),
  unique (job_post_id, worker_id)
);

alter table public.applications enable row level security;

create policy "Workers can view own applications"
  on public.applications for select
  using (
    exists (
      select 1 from public.worker_profiles
      where id = applications.worker_id and user_id = auth.uid()
    )
  );

create policy "Workers can create applications"
  on public.applications for insert
  with check (
    exists (
      select 1 from public.worker_profiles
      where id = applications.worker_id and user_id = auth.uid()
    )
  );

create policy "Business owners can view applications for their jobs"
  on public.applications for select
  using (
    exists (
      select 1 from public.job_posts
      join public.business_profiles on business_profiles.id = job_posts.business_id
      where job_posts.id = applications.job_post_id and business_profiles.user_id = auth.uid()
    )
  );

create policy "Business owners can update application status"
  on public.applications for update
  using (
    exists (
      select 1 from public.job_posts
      join public.business_profiles on business_profiles.id = job_posts.business_id
      where job_posts.id = applications.job_post_id and business_profiles.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTION: Auto-create user record on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

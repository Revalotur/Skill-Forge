-- SkillForge — Database Schema
-- Jalankan di Supabase: Dashboard > SQL Editor > New Query

-- =========================================================
-- EXTENSIONS
-- =========================================================
create extension if not exists "uuid-ossp";

-- =========================================================
-- TABLES
-- =========================================================

-- 1. assessments — hasil skill assessment user
create table if not exists public.assessments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_career text not null,
  current_skills text not null default '',
  learning_hours text,
  deadline date,
  experience text,
  created_at timestamptz not null default now()
);

create index if not exists assessments_user_id_idx
  on public.assessments (user_id);

-- 2. roadmaps — roadmap hasil generate AI
create table if not exists public.roadmaps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete set null,
  target_career text not null,
  duration_weeks integer not null default 12,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'generating'
    check (status in ('generating', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roadmaps_user_id_idx
  on public.roadmaps (user_id);

-- 3. roadmap_tasks — task per minggu dalam roadmap
create table if not exists public.roadmap_tasks (
  id uuid primary key default uuid_generate_v4(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  week integer not null,
  title text not null,
  description text default '',
  resources jsonb not null default '[]'::jsonb,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists roadmap_tasks_roadmap_id_idx
  on public.roadmap_tasks (roadmap_id);

-- 4. daily_missions — misi harian / streak
create table if not exists public.daily_missions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.roadmap_tasks(id) on delete set null,
  title text not null,
  date date not null default current_date,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index if not exists daily_missions_user_id_idx
  on public.daily_missions (user_id, date);

-- 5. github_analysis — hasil analisis profil GitHub user
create table if not exists public.github_analysis (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  username text,
  analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists github_analysis_user_id_idx
  on public.github_analysis (user_id);

-- 6. users — profil tambahan user (di samping auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  bio text,
  target_career text,
  github_username text,
  streak_count integer not null default 0,
  last_active_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- TRIGGERS
-- =========================================================

-- Buat baris users otomatis saat user baru daftar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Update updated_at otomatis
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_roadmaps_updated_at on public.roadmaps;
create trigger set_roadmaps_updated_at
  before update on public.roadmaps
  for each row execute function public.set_updated_at();

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.assessments enable row level security;
alter table public.roadmaps enable row level security;
alter table public.roadmap_tasks enable row level security;
alter table public.daily_missions enable row level security;
alter table public.github_analysis enable row level security;
alter table public.users enable row level security;

-- users: hanya pemilik yang bisa baca/tulis datanya
create policy "users select own" on public.users
  for select using (auth.uid() = id);
create policy "users update own" on public.users
  for update using (auth.uid() = id);
create policy "users insert own" on public.users
  for insert with check (auth.uid() = id);

-- assessments
create policy "assessments select own" on public.assessments
  for select using (auth.uid() = user_id);
create policy "assessments insert own" on public.assessments
  for insert with check (auth.uid() = user_id);
create policy "assessments update own" on public.assessments
  for update using (auth.uid() = user_id);
create policy "assessments delete own" on public.assessments
  for delete using (auth.uid() = user_id);

-- roadmaps
create policy "roadmaps select own" on public.roadmaps
  for select using (auth.uid() = user_id);
create policy "roadmaps insert own" on public.roadmaps
  for insert with check (auth.uid() = user_id);
create policy "roadmaps update own" on public.roadmaps
  for update using (auth.uid() = user_id);
create policy "roadmaps delete own" on public.roadmaps
  for delete using (auth.uid() = user_id);

-- roadmap_tasks (melalui roadmap pemilik)
create policy "roadmap_tasks select own" on public.roadmap_tasks
  for select using (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_id and r.user_id = auth.uid()
    )
  );
create policy "roadmap_tasks insert own" on public.roadmap_tasks
  for insert with check (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_id and r.user_id = auth.uid()
    )
  );
create policy "roadmap_tasks update own" on public.roadmap_tasks
  for update using (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_id and r.user_id = auth.uid()
    )
  );
create policy "roadmap_tasks delete own" on public.roadmap_tasks
  for delete using (
    exists (
      select 1 from public.roadmaps r
      where r.id = roadmap_id and r.user_id = auth.uid()
    )
  );

-- daily_missions
create policy "daily_missions select own" on public.daily_missions
  for select using (auth.uid() = user_id);
create policy "daily_missions insert own" on public.daily_missions
  for insert with check (auth.uid() = user_id);
create policy "daily_missions update own" on public.daily_missions
  for update using (auth.uid() = user_id);
create policy "daily_missions delete own" on public.daily_missions
  for delete using (auth.uid() = user_id);

-- github_analysis
create policy "github_analysis select own" on public.github_analysis
  for select using (auth.uid() = user_id);
create policy "github_analysis insert own" on public.github_analysis
  for insert with check (auth.uid() = user_id);
create policy "github_analysis update own" on public.github_analysis
  for update using (auth.uid() = user_id);
create policy "github_analysis delete own" on public.github_analysis
  for delete using (auth.uid() = user_id);

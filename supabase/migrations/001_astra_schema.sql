-- ASTRA // ECHO PostgreSQL schema
-- Apply once in the Supabase SQL Editor for this project.

create table if not exists public.astra_teams (
  id text primary key,
  name text not null,
  name_key text generated always as (lower(btrim(name))) stored,
  score integer not null default 0 check (score >= 0),
  solved_challenge_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(solved_challenge_ids) = 'array'),
  unlocked_hint_keys jsonb not null default '[]'::jsonb check (jsonb_typeof(unlocked_hint_keys) = 'array'),
  wrong_attempts_count integer not null default 0 check (wrong_attempts_count >= 0),
  echo_state text not null default 'OBSERVING' check (echo_state in ('OBSERVING', 'ADAPTING', 'AWAKE', 'CORE')),
  threat_level integer not null default 1 check (threat_level between 1 and 5),
  achievements jsonb not null default '[]'::jsonb check (jsonb_typeof(achievements) = 'array'),
  evidence_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_ids) = 'array'),
  created_at timestamptz not null default now(),
  last_solve_at timestamptz,
  password_hash text not null
);

create unique index if not exists astra_teams_name_key_uidx
  on public.astra_teams (name_key);

create table if not exists public.astra_sessions (
  token text primary key,
  team_id text not null references public.astra_teams(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists astra_sessions_team_id_idx
  on public.astra_sessions (team_id);

create table if not exists public.astra_submissions (
  id uuid primary key,
  team_id text not null references public.astra_teams(id) on delete cascade,
  team_name text not null,
  challenge_id text not null,
  challenge_title text not null,
  is_correct boolean not null,
  attempted_flag text not null,
  points_delta integer not null,
  submitted_at timestamptz not null default now()
);

create index if not exists astra_submissions_submitted_at_idx
  on public.astra_submissions (submitted_at desc);

create table if not exists public.astra_disabled_challenges (
  challenge_id text primary key,
  disabled_at timestamptz not null default now()
);

-- Restrict direct API access. The Express backend connects using its private
-- PostgreSQL connection string; browser clients should not query these tables.
alter table public.astra_teams enable row level security;
alter table public.astra_sessions enable row level security;
alter table public.astra_submissions enable row level security;
alter table public.astra_disabled_challenges enable row level security;


-- Admin dashboard telemetry, also included in 001_astra_multiplayer.sql.
-- Safe to apply to databases that already ran the base multiplayer schema.
create table if not exists public.system_events (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('INFO', 'WARN', 'ERROR')),
  event_type text not null,
  message text not null,
  team_id text references public.teams(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists system_events_created_at_idx on public.system_events(created_at desc);
create index if not exists system_events_team_id_idx on public.system_events(team_id);

alter table public.system_events enable row level security;

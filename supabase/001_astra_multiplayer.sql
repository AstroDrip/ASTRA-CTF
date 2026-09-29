create extension if not exists pgcrypto;

create table if not exists public.teams (
  id text primary key,
  name text not null,
  name_normalized text not null unique,
  password_hash text not null,
  score integer not null default 0,
  solved_challenge_ids jsonb not null default '[]'::jsonb,
  unlocked_hint_keys jsonb not null default '[]'::jsonb,
  wrong_attempts_count integer not null default 0,
  last_solve_at timestamptz,
  echo_state text not null default 'OBSERVING',
  threat_level integer not null default 1,
  achievements jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  token_hash text primary key,
  team_id text not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create index if not exists sessions_team_id_idx on public.sessions(team_id);
create index if not exists sessions_expires_at_idx on public.sessions(expires_at);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  team_id text not null references public.teams(id) on delete cascade,
  team_name text not null,
  challenge_id text not null,
  challenge_title text not null,
  is_correct boolean not null,
  timestamp timestamptz not null default now(),
  attempted_flag text not null,
  points_delta integer not null
);

create index if not exists submissions_timestamp_idx on public.submissions(timestamp desc);
create index if not exists submissions_team_id_idx on public.submissions(team_id);
create unique index if not exists submissions_one_correct_solve_idx
  on public.submissions(team_id, challenge_id)
  where is_correct = true;

create table if not exists public.competition_settings (
  id integer primary key default 1 check (id = 1),
  disabled_challenge_ids jsonb not null default '[]'::jsonb
);

insert into public.competition_settings(id)
values (1)
on conflict (id) do nothing;

create or replace function public.astra_unlock_hint(
  p_team_id text,
  p_challenge_id text,
  p_hint_key text,
  p_cost integer,
  p_prerequisites text[],
  p_disabled boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.teams%rowtype;
  solved jsonb;
  hints jsonb;
begin
  select * into t from public.teams where id = p_team_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;

  if p_disabled then
    return jsonb_build_object('ok', false, 'error', 'This challenge is currently locked by the administrator.');
  end if;

  solved := coalesce(t.solved_challenge_ids, '[]'::jsonb);
  hints := coalesce(t.unlocked_hint_keys, '[]'::jsonb);

  if p_prerequisites is not null and array_length(p_prerequisites, 1) is not null then
    if exists (
      select 1 from unnest(p_prerequisites) req
      where not (solved @> to_jsonb(req))
    ) then
      return jsonb_build_object('ok', false, 'error', 'This challenge is still locked. Complete its prerequisite nodes first.');
    end if;
  end if;

  if hints @> to_jsonb(p_hint_key) then
    return jsonb_build_object('ok', true, 'cost_deducted', 0);
  end if;

  if t.score < p_cost then
    return jsonb_build_object('ok', false, 'error', 'Insufficient score to unlock this hint.');
  end if;

  update public.teams
  set score = score - p_cost,
      unlocked_hint_keys = hints || to_jsonb(p_hint_key)
  where id = p_team_id;

  return jsonb_build_object('ok', true, 'cost_deducted', p_cost);
end;
$$;

create or replace function public.astra_submit_flag(
  p_team_id text,
  p_challenge_id text,
  p_submitted_flag text,
  p_expected_flag text,
  p_points integer,
  p_challenge_title text,
  p_evidence_id text,
  p_prerequisites text[],
  p_disabled boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.teams%rowtype;
  normalized text := trim(p_submitted_flag);
  is_correct boolean := normalized = p_expected_flag;
  old_state text;
  solved jsonb;
  evidence jsonb;
  achievements jsonb;
  new_achievements jsonb := '[]'::jsonb;
  solved_count integer;
begin
  select * into t from public.teams where id = p_team_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Unauthorized'); end if;

  if p_disabled then
    return jsonb_build_object('ok', false, 'error', 'This challenge is currently locked by the administrator.');
  end if;

  solved := coalesce(t.solved_challenge_ids, '[]'::jsonb);
  if solved @> to_jsonb(p_challenge_id) then
    return jsonb_build_object('ok', true, 'already_solved', true);
  end if;

  if p_prerequisites is not null and array_length(p_prerequisites, 1) is not null then
    if exists (
      select 1 from unnest(p_prerequisites) req
      where not (solved @> to_jsonb(req))
    ) then
      return jsonb_build_object('ok', false, 'error', 'This challenge is still locked. Complete its prerequisite nodes first.');
    end if;
  end if;

  insert into public.submissions(
    team_id, team_name, challenge_id, challenge_title,
    is_correct, timestamp, attempted_flag, points_delta
  ) values (
    t.id, t.name, p_challenge_id, p_challenge_title,
    is_correct, now(), normalized, case when is_correct then p_points else -5 end
  );

  if not is_correct then
    update public.teams
    set wrong_attempts_count = wrong_attempts_count + 1,
        score = greatest(0, score - 5)
    where id = p_team_id;

    return jsonb_build_object('ok', true, 'correct', false);
  end if;

  old_state := t.echo_state;
  solved := solved || to_jsonb(p_challenge_id);
  solved_count := jsonb_array_length(solved);
  evidence := coalesce(t.evidence_ids, '[]'::jsonb);
  achievements := coalesce(t.achievements, '[]'::jsonb);

  if p_evidence_id is not null and not (evidence @> to_jsonb(p_evidence_id)) then
    evidence := evidence || to_jsonb(p_evidence_id);
  end if;

  if solved_count >= 13 then
    update public.teams set echo_state = 'CORE', threat_level = 5 where id = p_team_id;
  elsif solved_count >= 7 then
    update public.teams set echo_state = 'AWAKE', threat_level = 4 where id = p_team_id;
  elsif solved_count >= 3 then
    update public.teams set echo_state = 'ADAPTING', threat_level = 3 where id = p_team_id;
  else
    update public.teams set echo_state = 'OBSERVING', threat_level = 2 where id = p_team_id;
  end if;

  if solved_count >= 1 and not (achievements @> '"ach-01"'::jsonb) then
    achievements := achievements || '"ach-01"'::jsonb;
    new_achievements := new_achievements || '"ach-01"'::jsonb;
  end if;

  if not exists (
    select 1 from jsonb_array_elements_text(coalesce(t.unlocked_hint_keys, '[]'::jsonb)) h
    where h like p_challenge_id || '_hint_%'
  ) and not (achievements @> '"ach-02"'::jsonb) then
    achievements := achievements || '"ach-02"'::jsonb;
    new_achievements := new_achievements || '"ach-02"'::jsonb;
  end if;

  if solved_count >= 3 and t.wrong_attempts_count = 0 and not (achievements @> '"ach-03"'::jsonb) then
    achievements := achievements || '"ach-03"'::jsonb;
    new_achievements := new_achievements || '"ach-03"'::jsonb;
  end if;

  if jsonb_array_length(evidence) >= 10 and not (achievements @> '"ach-04"'::jsonb) then
    achievements := achievements || '"ach-04"'::jsonb;
    new_achievements := new_achievements || '"ach-04"'::jsonb;
  end if;

  if solved_count >= 9 and not (achievements @> '"ach-05"'::jsonb) then
    achievements := achievements || '"ach-05"'::jsonb;
    new_achievements := new_achievements || '"ach-05"'::jsonb;
  end if;

  if solved_count >= 7 and not (achievements @> '"ach-06"'::jsonb) then
    achievements := achievements || '"ach-06"'::jsonb;
    new_achievements := new_achievements || '"ach-06"'::jsonb;
  end if;

  if p_challenge_id = 'ch-18' and not (achievements @> '"ach-07"'::jsonb) then
    achievements := achievements || '"ach-07"'::jsonb;
    new_achievements := new_achievements || '"ach-07"'::jsonb;
  end if;

  update public.teams
  set score = score + p_points,
      solved_challenge_ids = solved,
      evidence_ids = evidence,
      achievements = achievements,
      last_solve_at = now()
  where id = p_team_id;

  return jsonb_build_object(
    'ok', true,
    'correct', true,
    'old_echo_state', old_state,
    'new_achievements', new_achievements
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', true, 'already_solved', true);
end;
$$;

create or replace function public.astra_toggle_challenge(
  p_challenge_id text,
  p_disable boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ids jsonb;
begin
  select disabled_challenge_ids into ids
  from public.competition_settings
  where id = 1
  for update;

  ids := coalesce(ids, '[]'::jsonb);

  if p_disable and not (ids @> to_jsonb(p_challenge_id)) then
    ids := ids || to_jsonb(p_challenge_id);
  elsif not p_disable then
    select coalesce(jsonb_agg(value), '[]'::jsonb) into ids
    from jsonb_array_elements(ids) value
    where value #>> '{}' <> p_challenge_id;
  end if;

  update public.competition_settings
  set disabled_challenge_ids = ids
  where id = 1;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.astra_reset_competition()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.submissions;
  delete from public.sessions;
  delete from public.teams;
  update public.competition_settings set disabled_challenge_ids = '[]'::jsonb where id = 1;
  return jsonb_build_object('ok', true);
end;
$$;

-- These RPCs are called only with the server-side Supabase service key.
revoke all on function public.astra_unlock_hint(text,text,text,integer,text[],boolean) from public, anon, authenticated;
revoke all on function public.astra_submit_flag(text,text,text,text,integer,text,text,text[],boolean) from public, anon, authenticated;
revoke all on function public.astra_toggle_challenge(text,boolean) from public, anon, authenticated;
revoke all on function public.astra_reset_competition() from public, anon, authenticated;

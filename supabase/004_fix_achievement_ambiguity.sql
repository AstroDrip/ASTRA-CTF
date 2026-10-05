-- Fix the PL/pgSQL variable/column name collision in flag submissions.
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
  team_achievements jsonb;
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
  team_achievements := coalesce(t.achievements, '[]'::jsonb);

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

  if solved_count >= 1 and not (team_achievements @> '"ach-01"'::jsonb) then
    team_achievements := team_achievements || '"ach-01"'::jsonb;
    new_achievements := new_achievements || '"ach-01"'::jsonb;
  end if;

  if not exists (
    select 1 from jsonb_array_elements_text(coalesce(t.unlocked_hint_keys, '[]'::jsonb)) h
    where h like p_challenge_id || '_hint_%'
  ) and not (team_achievements @> '"ach-02"'::jsonb) then
    team_achievements := team_achievements || '"ach-02"'::jsonb;
    new_achievements := new_achievements || '"ach-02"'::jsonb;
  end if;

  if solved_count >= 3 and t.wrong_attempts_count = 0 and not (team_achievements @> '"ach-03"'::jsonb) then
    team_achievements := team_achievements || '"ach-03"'::jsonb;
    new_achievements := new_achievements || '"ach-03"'::jsonb;
  end if;

  if jsonb_array_length(evidence) >= 10 and not (team_achievements @> '"ach-04"'::jsonb) then
    team_achievements := team_achievements || '"ach-04"'::jsonb;
    new_achievements := new_achievements || '"ach-04"'::jsonb;
  end if;

  if solved_count >= 9 and not (team_achievements @> '"ach-05"'::jsonb) then
    team_achievements := team_achievements || '"ach-05"'::jsonb;
    new_achievements := new_achievements || '"ach-05"'::jsonb;
  end if;

  if solved_count >= 7 and not (team_achievements @> '"ach-06"'::jsonb) then
    team_achievements := team_achievements || '"ach-06"'::jsonb;
    new_achievements := new_achievements || '"ach-06"'::jsonb;
  end if;

  if p_challenge_id = 'ch-18' and not (team_achievements @> '"ach-07"'::jsonb) then
    team_achievements := team_achievements || '"ach-07"'::jsonb;
    new_achievements := new_achievements || '"ach-07"'::jsonb;
  end if;

  update public.teams
  set score = score + p_points,
      solved_challenge_ids = solved,
      evidence_ids = evidence,
      achievements = team_achievements,
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

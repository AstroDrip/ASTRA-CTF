-- Hint penalties are deferred until the matching challenge is solved.
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
    return jsonb_build_object('ok', true, 'penalty_deferred', 0);
  end if;

  if solved @> to_jsonb(p_challenge_id) then
    return jsonb_build_object('ok', false, 'error', 'Hints cannot be unlocked after this challenge is solved.');
  end if;

  update public.teams
  set unlocked_hint_keys = hints || to_jsonb(p_hint_key)
  where id = p_team_id;

  return jsonb_build_object('ok', true, 'penalty_deferred', greatest(p_cost, 0));
end;
$$;

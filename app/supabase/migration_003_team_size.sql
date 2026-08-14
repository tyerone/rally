-- Raises the per-team cap from 6 to 10. Run once in the Supabase SQL Editor
-- (migration_002_teams.sql must already have run). Safe to re-run.

create or replace function join_team_by_code(p_code text)
returns teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_team teams;
  v_count int;
begin
  select id into v_player_id from players where auth_user_id = auth.uid();
  if v_player_id is null then
    raise exception 'NO_PLAYER_PROFILE';
  end if;

  select * into v_team from teams where code = upper(trim(coalesce(p_code, '')));
  if v_team.id is null then
    raise exception 'CODE_NOT_FOUND';
  end if;

  select count(*) into v_count from players where team_id = v_team.id;
  if v_count >= 10 then
    raise exception 'TEAM_FULL';
  end if;

  update players set team_id = v_team.id where id = v_player_id;
  return v_team;
end;
$$;

grant execute on function join_team_by_code(text) to authenticated;

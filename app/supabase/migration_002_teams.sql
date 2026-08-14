-- Adds team creation/joining on top of migration.sql. Run this once in the
-- Supabase SQL Editor, after migration.sql + seed.sql have already run.

-- ============================================================== columns ===

alter table teams add column if not exists code text unique;
alter table teams add column if not exists created_by uuid references players(id) on delete set null;

-- ============================================================ security ===

-- Team invite codes are only meaningful if they're actually secret — a
-- player can read their OWN team's row (name/code/etc), not everyone's.
-- The public leaderboard doesn't need this table at all; it reads
-- team_points, which has no code column.
drop policy if exists "teams are publicly readable" on teams;
create policy "team members can read own team" on teams
  for select using (
    id in (select team_id from players where auth_user_id = auth.uid())
  );

-- The existing "players can update own row" RLS policy is row-scoped, not
-- column-scoped — without this, a signed-in player could set their own
-- team_id directly (skipping the invite code and the 6-member cap). Column
-- privileges close that: team_id can only change via the SECURITY DEFINER
-- functions below, which run with elevated privilege and enforce the rules.
revoke update on players from authenticated;
grant update (player_type) on players to authenticated;

-- ======================================================================
-- get_team_members: your own teammates' names — not other teams', and
-- never phone numbers. Used to render the member avatar row.
-- ======================================================================
create or replace function get_team_members()
returns table(id uuid, name text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.name
  from players p
  where p.team_id = (select team_id from players where auth_user_id = auth.uid())
  order by p.created_at;
$$;

grant execute on function get_team_members() to authenticated;

-- ======================================================================
-- create_team: generates a unique invite code and creates the team with
-- the calling player as leader (teams.created_by).
-- ======================================================================
create or replace function create_team(p_name text)
returns teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
  v_code text;
  v_team teams;
  v_attempt int := 0;
begin
  select id into v_player_id from players where auth_user_id = auth.uid();
  if v_player_id is null then
    raise exception 'NO_PLAYER_PROFILE';
  end if;
  if trim(coalesce(p_name, '')) = '' then
    raise exception 'NAME_REQUIRED';
  end if;

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    begin
      insert into teams (name, code, created_by) values (trim(p_name), v_code, v_player_id) returning * into v_team;
      exit;
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt > 8 then
        raise exception 'CODE_GENERATION_FAILED';
      end if;
    end;
  end loop;

  update players set team_id = v_team.id where id = v_player_id;
  return v_team;
end;
$$;

grant execute on function create_team(text) to authenticated;

-- ======================================================================
-- join_team_by_code: validates the code and the 6-member cap server-side
-- (the client never gets to decide either of those on its own).
-- ======================================================================
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

-- ======================================================================
-- leave_team: clears the caller's team. If they were the leader and
-- teammates remain, leadership passes to the earliest-joined teammate.
-- ======================================================================
create or replace function leave_team()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_team_id uuid;
  v_next_leader uuid;
begin
  select id, team_id into v_player_id, v_team_id from players where auth_user_id = auth.uid();
  if v_team_id is null then
    return;
  end if;

  update players set team_id = null where id = v_player_id;

  if exists (select 1 from teams where id = v_team_id and created_by = v_player_id) then
    select id into v_next_leader from players where team_id = v_team_id order by created_at limit 1;
    update teams set created_by = v_next_leader where id = v_team_id;
  end if;
end;
$$;

grant execute on function leave_team() to authenticated;

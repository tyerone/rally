-- Adds a hidden-team concept (for an admin/GM team) and sets one up. Run
-- once in the Supabase SQL Editor, after migration_002_teams.sql has run.
--
-- Hidden teams are excluded from team_points at the RLS level — not just
-- filtered out client-side — so their existence/points aren't visible to
-- regular players even if they inspect network requests directly.
-- Creating a hidden team is NOT exposed through the app's normal
-- create_team flow (a regular player can't self-designate one); it's a
-- manual SQL action, done below for "GM".

-- ============================================================== columns ===

alter table teams add column if not exists is_hidden boolean not null default false;
alter table team_points add column if not exists is_hidden boolean not null default false;

-- ======================================================= keep in sync ===

create or replace function seed_team_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into team_points (team_id, name, color, points, is_hidden) values (new.id, new.name, new.color, 0, new.is_hidden)
  on conflict (team_id) do update set name = excluded.name, color = excluded.color, is_hidden = excluded.is_hidden;
  return new;
end;
$$;

drop trigger if exists trg_seed_team_points on teams;
create trigger trg_seed_team_points
after insert or update of name, color, is_hidden on teams
for each row execute function seed_team_points();

-- ============================================================ security ===

drop policy if exists "team points are publicly readable" on team_points;
create policy "team points are publicly readable" on team_points
  for select using (not is_hidden);

-- players_public already runs with owner privilege (bypassing teams' own
-- RLS) so it needs its own explicit mask — otherwise a hidden team's name
-- would leak through the roster search step for anyone searching one of
-- its members' names.
create or replace view players_public as
select
  p.id, p.name, p.team_id,
  case when t.is_hidden then null else t.name end as team_name,
  right(p.phone, 4) as phone_last4
from players p
left join teams t on t.id = p.team_id;

grant select on players_public to anon, authenticated;

-- ================================================================ setup ===
-- One-time: create the hidden "GM" team (no join code — never joinable via
-- join_team_by_code, only ever assigned directly like this) and move
-- Tyrone Dukay-Remulta onto it.

insert into teams (name, is_hidden)
values ('GM', true)
on conflict (name) do update set is_hidden = true;

update players
set team_id = (select id from teams where name = 'GM')
where lower(name) = lower('Tyrone Dukay-Remulta');

-- Makes the Profile screen show "Leader" instead of "Member" for Tyrone on
-- this team — purely cosmetic, not an access-control concept yet.
update teams
set created_by = (select id from players where lower(name) = lower('Tyrone Dukay-Remulta'))
where name = 'GM';

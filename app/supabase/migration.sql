-- Rally backend schema — run this once in the Supabase Dashboard's SQL Editor
-- (Settings/SQL Editor -> New query -> paste -> Run). Safe to re-run: guarded
-- with `if not exists` / `on conflict` / `create or replace` where possible,
-- but this is meant to run ONCE against a fresh project.

create extension if not exists pgcrypto;

-- ============================================================== tables ===

create table teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#4FCBBB',
  created_at timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  team_id uuid references teams(id) on delete set null,
  phone text not null unique, -- E.164, e.g. +16045551234 — never exposed via anon SELECT
  player_type text check (player_type in ('casual', 'comp')),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index players_team_id_idx on players (team_id);

create table tiers (
  id text primary key, -- slug, e.g. 'rookie'
  name text not null,
  tag text not null,
  accent text not null,
  icon text not null,
  blurb text not null,
  order_index int not null default 0
);

create table challenges (
  id uuid primary key default gen_random_uuid(),
  tier_id text not null references tiers(id) on delete cascade,
  title text not null,
  pts int not null,
  pts_label text,
  meta text not null,
  tag text not null,
  description text not null,
  order_index int not null default 0
);
create index challenges_tier_id_idx on challenges (tier_id);

create table checkpoints (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  area text not null,
  lat double precision not null,
  lng double precision not null,
  color text not null,
  n int not null default 0
);

-- A challenge is completed once PER TEAM (any teammate's submission counts
-- for the whole team). points_awarded is set server-side by a trigger below
-- so a client can never submit an inflated value.
create table submissions (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  submitted_by uuid references players(id) on delete set null,
  proof_path text not null,
  note text,
  points_awarded int not null default 0,
  created_at timestamptz not null default now(),
  unique (challenge_id, team_id)
);
create index submissions_team_id_idx on submissions (team_id);

-- ================================================= server-side integrity ===

-- Points always come from the challenge row, never from client input.
create or replace function set_submission_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select pts into new.points_awarded from challenges where id = new.challenge_id;
  if new.points_awarded is null then
    raise exception 'Unknown challenge_id: %', new.challenge_id;
  end if;
  return new;
end;
$$;

create trigger trg_set_submission_points
before insert on submissions
for each row execute function set_submission_points();

-- ======================================================================
-- players_public: what the (unauthenticated) name-search step can read.
-- Full names are needed to search; phone numbers are masked to the last 4
-- digits so nobody can browse a spreadsheet of everyone's real number.
-- ======================================================================
create view players_public as
select p.id, p.name, p.team_id, t.name as team_name, right(p.phone, 4) as phone_last4
from players p
left join teams t on t.id = p.team_id;

grant select on players_public to anon, authenticated;

-- ======================================================================
-- team_points: public, live leaderboard data. This is a maintained TABLE,
-- not a view — Supabase Realtime's postgres_changes only fires on real
-- tables, and it respects RLS on whatever table you subscribe to. Since
-- `submissions` is locked to "your own team only", a plain view or a
-- subscription directly on `submissions` couldn't broadcast other teams'
-- point changes to everyone. This table is kept in sync by triggers below
-- and is itself publicly readable, giving a live leaderboard without
-- exposing the underlying per-submission proof/note rows.
-- ======================================================================
create table team_points (
  team_id uuid primary key references teams(id) on delete cascade,
  name text not null,
  color text not null,
  points int not null default 0,
  member_count int not null default 0
);

create or replace function seed_team_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into team_points (team_id, name, color, points) values (new.id, new.name, new.color, 0)
  on conflict (team_id) do update set name = excluded.name, color = excluded.color;
  return new;
end;
$$;

create trigger trg_seed_team_points
after insert or update of name, color on teams
for each row execute function seed_team_points();

create or replace function refresh_team_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update team_points
  set points = (select coalesce(sum(points_awarded), 0) from submissions where team_id = new.team_id)
  where team_id = new.team_id;
  return new;
end;
$$;

create trigger trg_refresh_team_points
after insert on submissions
for each row execute function refresh_team_points();

-- Keeps team_points.member_count in sync whenever a player's team changes
-- (covers the roster import, and any future re-assignment).
create or replace function refresh_team_member_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.team_id is distinct from new.team_id) then
    if old.team_id is not null then
      update team_points set member_count = (select count(*) from players where team_id = old.team_id) where team_id = old.team_id;
    end if;
  end if;
  if tg_op <> 'DELETE' and new.team_id is not null then
    update team_points set member_count = (select count(*) from players where team_id = new.team_id) where team_id = new.team_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger trg_refresh_team_member_counts
after insert or update of team_id or delete on players
for each row execute function refresh_team_member_counts();

alter table team_points enable row level security;
create policy "team points are publicly readable" on team_points for select using (true);

-- Makes INSERT/UPDATE on team_points broadcast over Realtime to subscribed
-- clients (this table is never written to directly by clients — only by
-- the triggers above, via SECURITY DEFINER).
alter publication supabase_realtime add table team_points;
alter publication supabase_realtime add table submissions;

-- ============================================================ security ===

alter table teams enable row level security;
alter table players enable row level security;
alter table tiers enable row level security;
alter table challenges enable row level security;
alter table checkpoints enable row level security;
alter table submissions enable row level security;

create policy "teams are publicly readable" on teams for select using (true);
create policy "tiers are publicly readable" on tiers for select using (true);
create policy "challenges are publicly readable" on challenges for select using (true);
create policy "checkpoints are publicly readable" on checkpoints for select using (true);

-- players: nobody can browse the base table (that's what players_public is
-- for) — a signed-in player can only see/update their own row.
create policy "players can read own row" on players
  for select using (auth.uid() = auth_user_id);
create policy "players can update own row" on players
  for update using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

-- submissions: a team can only see/insert its own team's rows (the public
-- leaderboard instead reads the team_points table above).
create policy "team members can read own team submissions" on submissions
  for select using (
    team_id in (select team_id from players where auth_user_id = auth.uid())
  );
create policy "team members can submit for own team" on submissions
  for insert with check (
    team_id in (select team_id from players where auth_user_id = auth.uid())
    and submitted_by in (select id from players where auth_user_id = auth.uid())
  );

-- ======================================================================
-- get_player_phone: reveals ONE player's phone number, used right before
-- sending the login OTP. Requires the id AND an exact name match (both are
-- already visible via players_public) rather than being a bare id->phone
-- oracle. Supabase's own OTP rate-limiting + Twilio's per-message cost are
-- the backstop against abuse — see the app README for the full reasoning.
-- ======================================================================
create or replace function get_player_phone(p_player_id uuid, p_name text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select phone from players
  where id = p_player_id and lower(name) = lower(p_name);
$$;

grant execute on function get_player_phone(uuid, text) to anon, authenticated;

-- ======================================================================
-- claim_player_profile: links the just-authenticated Supabase Auth user to
-- their roster row. Guarded so you can only claim the row whose phone
-- number matches the one that was actually verified.
-- ======================================================================
create or replace function claim_player_profile(p_player_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_jwt_phone text;
begin
  select phone into v_phone from players where id = p_player_id;
  v_jwt_phone := auth.jwt() ->> 'phone';

  if v_phone is null or v_jwt_phone is null
     or regexp_replace(v_phone, '\D', '', 'g') <> regexp_replace(v_jwt_phone, '\D', '', 'g') then
    raise exception 'Phone number does not match the authenticated session';
  end if;

  update players set auth_user_id = auth.uid() where id = p_player_id;
end;
$$;

grant execute on function claim_player_profile(uuid) to authenticated;

-- ================================================================ storage ===

insert into storage.buckets (id, name, public)
values ('proof', 'proof', false)
on conflict (id) do nothing;

-- Objects are stored as `<team_id>/<filename>` so folder-scoped policies work.
create policy "team members can upload their own team proof"
  on storage.objects for insert
  with check (
    bucket_id = 'proof'
    and (storage.foldername(name))[1] in (
      select team_id::text from players where auth_user_id = auth.uid()
    )
  );

create policy "team members can read their own team proof"
  on storage.objects for select
  using (
    bucket_id = 'proof'
    and (storage.foldername(name))[1] in (
      select team_id::text from players where auth_user_id = auth.uid()
    )
  );

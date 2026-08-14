// Real backend for Rally, on top of Supabase. Every export here is async and
// shaped the same way the mock version (which this replaced) was — the
// screens and AppStateContext were built against these signatures, not
// against Supabase directly, so this is the only file most backend changes
// should ever need to touch.

import { supabase } from "./supabaseClient";

export interface RosterEntry {
  id: string;
  name: string;
  teamName: string | null;
  phoneLast4: string;
}

export interface Session {
  playerId: string;
  name: string;
  teamId: string | null; // null until the player creates or joins a team
  teamName: string | null;
  playerType: "casual" | "comp" | null;
  phoneLast4: string;
}

export interface ChallengeCard {
  id: string;
  title: string;
  pts: number;
  ptsLabel?: string;
  meta: string;
  tag: string;
  desc: string;
}

export interface Tier {
  id: string;
  name: string;
  tag: string;
  accent: string;
  icon: string;
  blurb: string;
  cards: ChallengeCard[];
}

export interface Team {
  id: string;
  name: string;
  color: string;
  points: number;
  memberCount: number;
}

export interface Checkpoint {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  color: string;
  n: number;
}

// ---- auth / onboarding ----

interface OwnPlayerRow {
  id: string;
  name: string;
  player_type: "casual" | "comp" | null;
  phone: string;
  team_id: string | null;
}

async function fetchOwnPlayerSession(): Promise<Session | null> {
  const { data, error } = await supabase
    .from("players")
    .select("id, name, player_type, phone, team_id")
    .maybeSingle<OwnPlayerRow>();
  if (error) throw error; // surface real DB/permission errors instead of masking them as "no session"
  if (!data) return null;

  let teamName: string | null = null;
  if (data.team_id) {
    const { data: team } = await supabase.from("teams").select("name").eq("id", data.team_id).maybeSingle();
    teamName = team?.name ?? null;
  }

  return {
    playerId: data.id,
    name: data.name,
    teamId: data.team_id,
    teamName,
    playerType: data.player_type,
    phoneLast4: data.phone.slice(-4),
  };
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  return fetchOwnPlayerSession();
}

export async function searchRoster(query: string): Promise<RosterEntry[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("players_public")
    .select("id, name, team_name, phone_last4")
    .ilike("name", `%${q}%`)
    .limit(4);
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id, name: r.name, teamName: r.team_name, phoneLast4: r.phone_last4 }));
}

/** Sends the login SMS and returns the phone number so the caller can hold
 *  it for verifyCode — the caller already identified this as their own
 *  roster row via the search step, so returning it here isn't a new leak. */
export async function requestCode(playerId: string, name: string): Promise<string> {
  const { data: phone, error } = await supabase.rpc("get_player_phone", { p_player_id: playerId, p_name: name });
  if (error || !phone) throw new Error("Couldn't find that player's phone number.");
  const { error: otpErr } = await supabase.auth.signInWithOtp({ phone });
  if (otpErr) throw otpErr;
  return phone;
}

export async function verifyCode(playerId: string, phone: string, code: string): Promise<boolean> {
  const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: "sms" });
  if (error) return false;
  const { error: claimErr } = await supabase.rpc("claim_player_profile", { p_player_id: playerId });
  return !claimErr;
}

export async function completeOnboarding(playerType: "casual" | "comp"): Promise<Session> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  const { error } = await supabase.from("players").update({ player_type: playerType }).eq("auth_user_id", data.user.id);
  if (error) throw error;
  const session = await fetchOwnPlayerSession();
  if (!session) throw new Error("Could not load player profile after onboarding");
  return session;
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}

// ---- team formation ----

export interface MyTeam {
  id: string;
  name: string;
  code: string;
  isLeader: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
}

export async function getMyTeam(): Promise<MyTeam | null> {
  const { data: player } = await supabase.from("players").select("id, team_id").maybeSingle();
  if (!player?.team_id) return null;
  const { data: team, error } = await supabase
    .from("teams")
    .select("id, name, code, created_by")
    .eq("id", player.team_id)
    .maybeSingle();
  if (error || !team) return null;
  return { id: team.id, name: team.name, code: team.code, isLeader: team.created_by === player.id };
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase.rpc("get_team_members");
  if (error || !data) return [];
  return data;
}

interface TeamRow {
  id: string;
  name: string;
  code: string;
}

/** Team-formation RPC errors carry a short machine-readable code as their
 *  message (e.g. "CODE_NOT_FOUND", "TEAM_FULL") — screens match on these. */
export async function createTeam(name: string): Promise<MyTeam> {
  const { data, error } = await supabase.rpc("create_team", { p_name: name }).single<TeamRow>();
  if (error) throw error;
  return { id: data.id, name: data.name, code: data.code, isLeader: true };
}

export async function joinTeamByCode(code: string): Promise<MyTeam> {
  const { data, error } = await supabase.rpc("join_team_by_code", { p_code: code }).single<TeamRow>();
  if (error) throw error;
  return { id: data.id, name: data.name, code: data.code, isLeader: false };
}

export async function leaveTeam(): Promise<void> {
  const { error } = await supabase.rpc("leave_team");
  if (error) throw error;
}

// ---- challenges ----

export async function getTiers(): Promise<Tier[]> {
  const [tiersRes, challengesRes] = await Promise.all([
    supabase.from("tiers").select("id, name, tag, accent, icon, blurb").order("order_index"),
    supabase.from("challenges").select("id, tier_id, title, pts, pts_label, meta, tag, description").order("order_index"),
  ]);
  if (tiersRes.error) throw tiersRes.error;
  if (challengesRes.error) throw challengesRes.error;

  return tiersRes.data.map((t) => ({
    id: t.id,
    name: t.name,
    tag: t.tag,
    accent: t.accent,
    icon: t.icon,
    blurb: t.blurb,
    cards: challengesRes.data
      .filter((c) => c.tier_id === t.id)
      .map((c) => ({
        id: c.id,
        title: c.title,
        pts: c.pts,
        ptsLabel: c.pts_label ?? undefined,
        meta: c.meta,
        tag: c.tag,
        desc: c.description,
      })),
  }));
}

/** Challenge ids the given team has already completed. */
export async function getDoneChallengeIds(teamId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("submissions").select("challenge_id").eq("team_id", teamId);
  if (error || !data) return new Set();
  return new Set(data.map((r) => r.challenge_id));
}

export async function uploadProof(teamId: string, challengeId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${teamId}/${challengeId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("proof").upload(path, file);
  if (error) throw error;
  return path;
}

export async function submitChallenge(params: {
  teamId: string;
  challengeId: string;
  playerId: string;
  proofPath: string;
  note: string;
}): Promise<void> {
  const { error } = await supabase.from("submissions").insert({
    team_id: params.teamId,
    challenge_id: params.challengeId,
    submitted_by: params.playerId,
    proof_path: params.proofPath,
    note: params.note || null,
  });
  if (error) throw error;
}

// ---- leaderboard ----

export async function getTeams(): Promise<Team[]> {
  const { data, error } = await supabase
    .from("team_points")
    .select("team_id, name, color, points, member_count")
    .order("points", { ascending: false });
  if (error) throw error;
  return data.map((t) => ({ id: t.team_id, name: t.name, color: t.color, points: t.points, memberCount: t.member_count }));
}

// ---- map ----

export async function getCheckpoints(): Promise<Checkpoint[]> {
  const { data, error } = await supabase.from("checkpoints").select("id, name, area, lat, lng, color, n");
  if (error) throw error;
  return data;
}

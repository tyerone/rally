import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "../services/api";
import type { Session, Tier, Team, Checkpoint } from "../services/api";
import { supabase } from "../services/supabaseClient";

interface AppStateValue {
  loading: boolean;
  loadError: boolean;
  session: Session | null;
  setSession: (s: Session) => void;
  refreshSession: () => Promise<void>; // re-fetches session, e.g. after joining/leaving a team
  logout: () => Promise<void>;

  tiers: Tier[];
  teams: Team[]; // live, sorted by points descending
  checkpoints: Checkpoint[];

  isDone: (challengeId: string) => boolean;
  submit: (challengeId: string, file: File, note: string) => Promise<number>; // resolves with points earned

  totalPoints: number; // own team's live total
  doneCount: number;
  totalCount: number;
  leagueRank: number;
}

const AppStateContext = createContext<AppStateValue | null>(null);

function sortByPoints(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => b.points - a.points);
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [session, setSessionState] = useState<Session | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());

  // initial load — each call is isolated so one failure (e.g. Supabase
  // briefly unreachable) can't leave `loading` stuck true forever and the
  // whole app blank; failures just leave that slice empty and set loadError.
  useEffect(() => {
    (async () => {
      const [s, t, tm, cp] = await Promise.allSettled([
        api.getSession(),
        api.getTiers(),
        api.getTeams(),
        api.getCheckpoints(),
      ]);
      if (s.status === "fulfilled") setSessionState(s.value);
      if (t.status === "fulfilled") setTiers(t.value);
      if (tm.status === "fulfilled") setTeams(sortByPoints(tm.value));
      if (cp.status === "fulfilled") setCheckpoints(cp.value);
      const failed = [s, t, tm, cp].some((r) => r.status === "rejected");
      if (failed) {
        setLoadError(true);
        for (const r of [s, t, tm, cp]) if (r.status === "rejected") console.error(r.reason);
      }
      setLoading(false);
    })();
  }, []);

  // fetch this team's completed challenges whenever the logged-in team changes
  useEffect(() => {
    if (!session?.teamId) { setDone(new Set()); return; }
    let alive = true;
    api.getDoneChallengeIds(session.teamId).then((d) => { if (alive) setDone(d); });
    return () => { alive = false; };
  }, [session?.teamId]);

  // live leaderboard: team_points is a maintained table (see supabase/migration.sql)
  // kept in sync by DB triggers, so this just mirrors it into local state.
  useEffect(() => {
    const channel = supabase
      .channel("team_points_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_points" },
        (payload) => {
          const row = payload.new as { team_id: string; name: string; color: string; points: number; member_count: number } | undefined;
          if (!row) return;
          setTeams((prev) => {
            const next: Team = { id: row.team_id, name: row.name, color: row.color, points: row.points, memberCount: row.member_count };
            const idx = prev.findIndex((t) => t.id === next.id);
            const merged = idx === -1 ? [...prev, next] : prev.map((t, i) => (i === idx ? next : t));
            return sortByPoints(merged);
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // live "done" state: pick up a teammate submitting from a different device.
  useEffect(() => {
    if (!session?.teamId) return;
    const channel = supabase
      .channel(`submissions_team_${session.teamId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions", filter: `team_id=eq.${session.teamId}` },
        (payload) => {
          const row = payload.new as { challenge_id: string };
          setDone((prev) => new Set(prev).add(row.challenge_id));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session?.teamId]);

  const setSession = useCallback((s: Session) => setSessionState(s), []);

  const refreshSession = useCallback(async () => {
    const s = await api.getSession();
    setSessionState(s);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setSessionState(null);
    setDone(new Set());
  }, []);

  const isDone = useCallback((challengeId: string) => done.has(challengeId), [done]);

  const submit = useCallback(async (challengeId: string, file: File, note: string) => {
    if (!session) throw new Error("Not logged in");
    if (!session.teamId) throw new Error("Join or create a team before submitting challenges");
    const proofPath = await api.uploadProof(session.teamId, challengeId, file);
    await api.submitChallenge({ teamId: session.teamId, challengeId, playerId: session.playerId, proofPath, note });
    setDone((prev) => new Set(prev).add(challengeId));
    const card = tiers.flatMap((t) => t.cards).find((c) => c.id === challengeId);
    return card?.pts ?? 0;
  }, [session, tiers]);

  const totalCount = useMemo(() => tiers.reduce((sum, t) => sum + t.cards.length, 0), [tiers]);
  const doneCount = done.size;

  const totalPoints = useMemo(
    () => (session ? teams.find((t) => t.id === session.teamId)?.points ?? 0 : 0),
    [teams, session]
  );
  const leagueRank = useMemo(() => {
    if (!session) return 0;
    const idx = teams.findIndex((t) => t.id === session.teamId);
    return idx === -1 ? 0 : idx + 1;
  }, [teams, session]);

  const value: AppStateValue = {
    loading, loadError, session, setSession, refreshSession, logout,
    tiers, teams, checkpoints,
    isDone, submit,
    totalPoints, doneCount, totalCount, leagueRank,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";
import { useToast } from "../components/Toast";
import { BottomSheet } from "../components/BottomSheet";
import * as api from "../services/api";
import type { MyTeam, TeamMember } from "../services/api";

const MEMBER_COLORS = ["#4FCBBB", "#F0A500", "#7F60DC", "#4C9BE0", "#E0576B", "#E08A3C", "#5BC0A8", "#9B6BD6", "#C7566B", "#6E86C7"];

function monogram(name: string) {
  const w = name.trim().split(/\s+/);
  return (w[0][0] + (w[1] ? w[1][0] : "")).toUpperCase();
}

function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "";
}

type Sheet = "create" | "created" | "join" | null;

export function Profile() {
  const navigate = useNavigate();
  const { session, totalPoints, leagueRank, doneCount, totalCount, logout, refreshSession } = useAppState();
  const { ping } = useToast();

  const [myTeam, setMyTeam] = useState<MyTeam | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [teamNameDraft, setTeamNameDraft] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    if (!session?.teamId) { setMyTeam(null); setMembers([]); return; }
    Promise.all([api.getMyTeam(), api.getTeamMembers()]).then(([t, m]) => {
      if (!alive) return;
      setMyTeam(t);
      setMembers(m);
    });
    return () => { alive = false; };
  }, [session?.teamId]);

  if (!session) return null;

  function openSheet(s: Sheet) {
    setSheet(s);
    setJoinError(null);
    if (s === "create") setTimeout(() => nameInputRef.current?.focus(), 260);
    if (s === "join") setTimeout(() => codeInputRef.current?.focus(), 260);
  }

  async function onCreate() {
    const name = teamNameDraft.trim();
    if (!name || busy) { nameInputRef.current?.focus(); return; }
    setBusy(true);
    try {
      const team = await api.createTeam(name);
      setMyTeam(team);
      setMembers([{ id: session!.playerId, name: session!.name }]);
      setSheet("created");
      setTeamNameDraft("");
      await refreshSession();
    } catch {
      ping("Couldn't create the team — try again.", 2400);
    } finally {
      setBusy(false);
    }
  }

  async function onJoin() {
    if (codeInput.length < 6 || busy) { codeInputRef.current?.focus(); return; }
    setBusy(true);
    setJoinError(null);
    try {
      const team = await api.joinTeamByCode(codeInput);
      setMyTeam(team);
      setSheet(null);
      setCodeInput("");
      await refreshSession();
      setMembers(await api.getTeamMembers());
      ping(`Welcome to ${team.name}! 🏁`);
    } catch (e) {
      const msg = errMsg(e);
      setJoinError(msg.includes("TEAM_FULL") ? "That team is already full (10 racers max)." : "That code didn't match a team. Check it and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function onCopyCode(code: string) {
    try { await navigator.clipboard.writeText(code); } catch { /* clipboard unavailable */ }
    ping(`Code ${code} copied`);
  }

  async function onShareCode(team: MyTeam) {
    const text = `Join my Rally crew "${team.name}" — code ${team.code}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Join my Rally team", text }); return; } catch { /* cancelled/unsupported — fall through to copy */ }
    }
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard unavailable */ }
    ping("Invite link ready to share");
  }

  async function onLeave() {
    if (busy) return;
    setBusy(true);
    try {
      await api.leaveTeam();
      setMyTeam(null);
      setMembers([]);
      await refreshSession();
      ping("You left the team");
    } catch {
      ping("Couldn't leave the team — try again.", 2400);
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#15161B" }}>
      <div className="ry-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 16px 12px" }}>
        {/* header */}
        <div style={{ textAlign: "center", padding: "8px 0 4px", animation: "ryHdrIn .5s cubic-bezier(.2,.7,.2,1) both" }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", background: "#4FCBBB", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 5px 0 #37948A" }}>
            <img src="/assets/nav-profile.svg" alt="" width={66} height={66} style={{ display: "block" }} />
          </div>
          <h1 style={{ margin: "14px 0 0", color: "#fff", fontSize: 24, fontWeight: 900, letterSpacing: -0.4 }}>{session.name}</h1>
          <div style={{ margin: "3px 0 0", color: "rgba(255,255,255,.45)", fontSize: 14, fontWeight: 700 }}>{myTeam?.name ?? "No Team Yet"}</div>
        </div>

        {/* stats row */}
        <div style={{ display: "flex", gap: 10, marginTop: 18, animation: "rySecIn .5s .05s cubic-bezier(.2,.7,.2,1) both" }}>
          <StatCard icon="/assets/ic-points.svg" value={totalPoints.toLocaleString()} label="Points" color="#4FCBBB" />
          <StatCard icon="/assets/ic-trophy.svg" value={leagueRank ? ordinal(leagueRank) : "—"} label="League" color="#F8C949" />
          <StatCard icon="/assets/ic-challenges.svg" value={`${doneCount}/${totalCount}`} label="Done" color="#fff" />
        </div>

        <div style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase", margin: "26px 2px 12px", animation: "rySecIn .5s .1s cubic-bezier(.2,.7,.2,1) both" }}>
          My team
        </div>

        {!myTeam ? (
          <div style={{ background: "#1b1e2b", border: "1px solid #2a3047", borderRadius: 20, padding: "24px 20px", textAlign: "center", animation: "rySecIn .5s .12s cubic-bezier(.2,.7,.2,1) both" }}>
            <img src="/assets/mascot.svg" alt="" width={84} height={84} style={{ display: "block", margin: "0 auto" }} />
            <div style={{ color: "#fff", fontSize: 18, fontWeight: 900, marginTop: 12 }}>You're riding solo</div>
            <p style={{ margin: "6px auto 0", maxWidth: 270, color: "rgba(255,255,255,.5)", fontSize: 13.5, fontWeight: 700, lineHeight: 1.5 }}>
              Teams climb the league together. Start a crew and share the code, or hop into a friend's.
            </p>
            <button
              type="button"
              onClick={() => openSheet("create")}
              style={{ width: "100%", marginTop: 20, background: "#4FCBBB", color: "#15161B", border: 0, borderRadius: 16, padding: 16, fontFamily: "inherit", fontSize: 16, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 0 #37948A" }}
            >
              Create a team
            </button>
            <button
              type="button"
              onClick={() => openSheet("join")}
              style={{ width: "100%", marginTop: 12, background: "transparent", color: "#fff", border: "1.5px solid #343A56", borderRadius: 16, padding: 15, fontFamily: "inherit", fontSize: 15, fontWeight: 900, cursor: "pointer" }}
            >
              Join a team
            </button>
          </div>
        ) : (
          <div style={{ background: "#1b1e2b", border: "1px solid #2a3047", borderRadius: 20, padding: 20, animation: "rySecIn .5s .12s cubic-bezier(.2,.7,.2,1) both" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 52, height: 52, borderRadius: 15, flexShrink: 0, background: "#4FCBBB", color: "#15161B", fontSize: 19, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 0 #37948A" }}>
                {monogram(myTeam.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#fff", fontSize: 19, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{myTeam.name}</div>
                <span style={{ display: "inline-block", marginTop: 5, background: myTeam.isLeader ? "#4FCBBB22" : "#7F60DC22", color: myTeam.isLeader ? "#4FCBBB" : "#B9A6F0", fontSize: 10.5, fontWeight: 900, letterSpacing: 0.6, padding: "3px 9px", borderRadius: 7, textTransform: "uppercase" }}>
                  {myTeam.isLeader ? "Leader" : "Member"}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 18, background: "#15161B", border: "1px dashed #3a4160", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "rgba(255,255,255,.4)", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>Team code</div>
                <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: 3, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{myTeam.code}</div>
              </div>
              <button
                type="button"
                onClick={() => onCopyCode(myTeam.code)}
                title="Copy code"
                style={{ width: 42, height: 42, flexShrink: 0, background: "#23273B", border: "1px solid #343A56", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="6" y="6" width="11" height="11" rx="2.5" stroke="#4FCBBB" strokeWidth="2" /><path d="M13.5 4.5H5A1.5 1.5 0 0 0 3.5 6v8.5" stroke="#4FCBBB" strokeWidth="2" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div style={{ marginTop: 16, color: "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase" }}>{members.length} of 10 racers</div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              {members.map((m, i) => (
                <div key={m.id} title={m.name} style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, background: MEMBER_COLORS[i % MEMBER_COLORS.length], color: "#15161B", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 0 rgba(0,0,0,.28)" }}>
                  {monogram(m.name)}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onShareCode(myTeam)}
              style={{ width: "100%", marginTop: 20, background: "#4FCBBB", color: "#15161B", border: 0, borderRadius: 16, padding: 16, fontFamily: "inherit", fontSize: 16, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 0 #37948A", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M15 6.5a2.5 2.5 0 1 0-2.4-3.1L7.9 6.1a2.5 2.5 0 1 0 0 4.8l4.7 2.7a2.5 2.5 0 1 0 .8-1.4L8.9 9.6a2.5 2.5 0 0 0 0-1.2l4.4-2.5c.45.37 1.03.6 1.7.6Z" fill="#15161B" /></svg>
              Share invite code
            </button>
            <button
              type="button"
              onClick={onLeave}
              disabled={busy}
              style={{ width: "100%", marginTop: 10, background: "none", border: 0, color: "#E0576B", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: busy ? "default" : "pointer", padding: 8, opacity: busy ? 0.6 : 1 }}
            >
              Leave team
            </button>
          </div>
        )}

        <div style={{ marginTop: 22, background: "#1b1e2b", border: "1px solid #2a3047", borderRadius: 18, overflow: "hidden", animation: "rySecIn .5s .16s cubic-bezier(.2,.7,.2,1) both" }}>
          <button
            type="button"
            onClick={onLogout}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: 0, padding: "16px 18px", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
          >
            <span style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>Log out</span>
            <svg width="8" height="14" viewBox="0 0 11 18" fill="none"><path d="M1.5 1.5L9 9l-7.5 7.5" stroke="#5b6178" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>

        <div style={{ height: 8 }} />
      </div>

      <BottomSheet open={sheet !== null} onClose={() => setSheet(null)}>
        {sheet === "create" && (
          <div style={{ padding: "14px 4px 4px" }}>
            <h2 style={{ margin: 0, color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: -0.3 }}>Create your team</h2>
            <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,.5)", fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>Name your crew. You'll get a code to invite up to 10 racers.</p>
            <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", margin: "22px 2px 8px" }}>Team name</div>
            <input
              ref={nameInputRef}
              value={teamNameDraft}
              onChange={(e) => setTeamNameDraft(e.target.value)}
              maxLength={22}
              placeholder="e.g. Loop Wolves"
              style={{ width: "100%", background: "#15161B", border: "1.5px solid #343A56", borderRadius: 14, padding: "15px 16px", color: "#fff", fontFamily: "inherit", fontSize: 17, fontWeight: 800, outline: "none" }}
            />
            <button
              type="button"
              onClick={onCreate}
              disabled={busy}
              style={{ width: "100%", marginTop: 24, border: 0, borderRadius: 16, padding: 16, fontFamily: "inherit", fontSize: 16, fontWeight: 900, cursor: "pointer", background: "#4FCBBB", color: "#15161B", boxShadow: "0 4px 0 #37948A", opacity: teamNameDraft.trim() ? 1 : 0.5, transition: "opacity .15s" }}
            >
              {busy ? "Creating…" : "Create team"}
            </button>
          </div>
        )}

        {sheet === "created" && myTeam && (
          <div style={{ padding: "14px 4px 4px", textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#4FCBBB22", margin: "2px auto 0", display: "flex", alignItems: "center", justifyContent: "center", animation: "ryPop .5s cubic-bezier(.2,.8,.2,1) both" }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7" stroke="#4FCBBB" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h2 style={{ margin: "14px 0 0", color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: -0.3 }}>Team created!</h2>
            <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,.55)", fontSize: 14, fontWeight: 700 }}>
              <b style={{ color: "#fff" }}>{myTeam.name}</b> is ready to roll.
            </p>
            <div style={{ margin: "22px 0 0", background: "#15161B", border: "1px dashed #3a4160", borderRadius: 16, padding: 18 }}>
              <div style={{ color: "rgba(255,255,255,.4)", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>Share this code</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
                {myTeam.code.split("").map((ch, i) => (
                  <div key={i} style={{ width: 38, height: 52, borderRadius: 11, background: "#1b1e2b", border: "1px solid #343A56", color: "#fff", fontSize: 26, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", animation: "ryCharIn .35s cubic-bezier(.2,.8,.2,1) both" }}>
                    {ch}
                  </div>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onShareCode(myTeam)}
              style={{ width: "100%", marginTop: 20, background: "#4FCBBB", color: "#15161B", border: 0, borderRadius: 16, padding: 16, fontFamily: "inherit", fontSize: 16, fontWeight: 900, cursor: "pointer", boxShadow: "0 4px 0 #37948A", display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M15 6.5a2.5 2.5 0 1 0-2.4-3.1L7.9 6.1a2.5 2.5 0 1 0 0 4.8l4.7 2.7a2.5 2.5 0 1 0 .8-1.4L8.9 9.6a2.5 2.5 0 0 0 0-1.2l4.4-2.5c.45.37 1.03.6 1.7.6Z" fill="#15161B" /></svg>
              Share code
            </button>
            <button
              type="button"
              onClick={() => onCopyCode(myTeam.code)}
              style={{ width: "100%", marginTop: 10, background: "transparent", color: "#fff", border: "1.5px solid #343A56", borderRadius: 16, padding: 15, fontFamily: "inherit", fontSize: 15, fontWeight: 900, cursor: "pointer" }}
            >
              Copy code
            </button>
            <button
              type="button"
              onClick={() => setSheet(null)}
              style={{ width: "100%", marginTop: 6, background: "none", border: 0, color: "rgba(255,255,255,.5)", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", padding: 10 }}
            >
              Done
            </button>
          </div>
        )}

        {sheet === "join" && (
          <div style={{ padding: "14px 4px 4px" }}>
            <h2 style={{ margin: 0, color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: -0.3 }}>Join a team</h2>
            <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,.5)", fontSize: 14, fontWeight: 700, lineHeight: 1.5 }}>Enter the 6-character code your team leader shared with you.</p>
            <div onClick={() => codeInputRef.current?.focus()} style={{ position: "relative", marginTop: 24 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                {Array.from({ length: 6 }).map((_, i) => {
                  const ch = codeInput[i] || "";
                  const isCursor = i === codeInput.length && codeInput.length < 6;
                  const borderColor = ch ? "#4FCBBB" : isCursor ? "#4FCBBB88" : "#343A56";
                  return (
                    <div key={i} style={{ width: 46, height: 58, borderRadius: 12, background: "#15161B", border: `2px solid ${borderColor}`, color: "#fff", fontSize: 26, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", transition: "border-color .15s" }}>
                      {ch}
                    </div>
                  );
                })}
              </div>
              <input
                ref={codeInputRef}
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6));
                  setJoinError(null);
                }}
                maxLength={6}
                autoComplete="off"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, border: 0, fontSize: 16, color: "transparent", background: "transparent", caretColor: "transparent" }}
              />
            </div>
            <div style={{ textAlign: "center", color: "#E0576B", fontSize: 13, fontWeight: 800, marginTop: 14, height: 16, opacity: joinError ? 1 : 0, transition: "opacity .15s" }}>
              {joinError || " "}
            </div>
            <button
              type="button"
              onClick={onJoin}
              disabled={busy}
              style={{ width: "100%", marginTop: 20, border: 0, borderRadius: 16, padding: 16, fontFamily: "inherit", fontSize: 16, fontWeight: 900, cursor: "pointer", background: "#4FCBBB", color: "#15161B", boxShadow: "0 4px 0 #37948A", opacity: codeInput.length === 6 ? 1 : 0.5, transition: "opacity .15s" }}
            >
              {busy ? "Joining…" : "Join team"}
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <div style={{ flex: 1, background: "#1b1e2b", border: "1px solid #2a3047", borderRadius: 16, padding: "13px 8px 11px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <img src={icon} alt="" height={24} style={{ display: "block", width: "auto" }} />
      <div style={{ color, fontSize: 19, fontWeight: 900 }}>{value}</div>
      <div style={{ color: "rgba(255,255,255,.42)", fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

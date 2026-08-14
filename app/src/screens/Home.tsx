import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function Home() {
  const navigate = useNavigate();
  const { session, tiers, checkpoints, totalPoints, leagueRank, doneCount, isDone } = useAppState();

  const rookie = tiers[0];
  const first = session?.name.split(" ")[0] ?? "racer";

  if (!rookie) return null; // still loading, or the DB hasn't been seeded yet

  const rookieDone = rookie.cards.filter((c) => isDone(c.id)).length;
  const rookiePct = rookie.cards.length ? Math.round((rookieDone / rookie.cards.length) * 100) : 0;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#15161B" }}>
      {/* header */}
      <div style={{ flexShrink: 0, padding: "26px 20px 12px", display: "flex", alignItems: "center", gap: 14, animation: "rySecIn .5s cubic-bezier(.2,.7,.2,1) both" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#4FCBBB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 0 #37948A" }}>
          <img src="/assets/nav-profile.svg" alt="" width={42} height={42} style={{ display: "block" }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: "rgba(255,255,255,.45)", fontSize: 11.5, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase" }}>Welcome back</div>
          <div style={{ color: "#fff", fontSize: 23, fontWeight: 900, letterSpacing: -0.3, lineHeight: 1.1 }}>Hey, {first}</div>
        </div>
      </div>

      {/* scroll body */}
      <div className="ry-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "6px 0 12px" }}>
        {/* stats row */}
        <div style={{ display: "flex", gap: 10, padding: "0 16px", animation: "rySecIn .5s .04s cubic-bezier(.2,.7,.2,1) both" }}>
          <StatCard icon="/assets/ic-points.svg" value={totalPoints.toLocaleString()} label="Points" color="#4FCBBB" />
          <StatCard icon="/assets/ic-trophy.svg" value={leagueRank ? ordinal(leagueRank) : "—"} label="League" color="#F8C949" />
          <StatCard icon="/assets/ic-challenges.svg" value={String(doneCount)} label="Done" color="#fff" />
        </div>

        {/* hero: continue */}
        <div style={{ padding: "22px 16px 0", animation: "rySecIn .5s .08s cubic-bezier(.2,.7,.2,1) both" }}>
          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase", margin: "0 2px 10px" }}>
            Pick up where you left off
          </div>
          <div style={{ background: "#1b1e2b", border: "1px solid #2a3047", borderRadius: 20, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "#FF6B6B1f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src={rookie.icon} alt="" width={30} height={30} style={{ display: "block" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#fff", fontSize: 17, fontWeight: 900 }}>Rookie tier</div>
                <div style={{ color: "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 700, marginTop: 1 }}>
                  {rookieDone} of {rookie.cards.length} done · keep it rolling
                </div>
              </div>
            </div>
            <div style={{ marginTop: 15, height: 10, borderRadius: 6, background: "#2a3047", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${rookiePct}%`, borderRadius: 6, background: "#FF6B6B", transition: "width .3s" }} />
            </div>
            <button
              type="button"
              onClick={() => navigate("/challenges")}
              style={{ width: "100%", marginTop: 16, background: "#4FCBBB", color: "#15161B", border: 0, borderRadius: 16, padding: 16, fontFamily: "inherit", fontSize: 16, fontWeight: 900, letterSpacing: 0.2, cursor: "pointer", boxShadow: "0 4px 0 #37948A" }}
            >
              Browse challenges
            </button>
          </div>
        </div>

        {/* highlight: Quicktimes */}
        <div style={{ padding: "22px 16px 0", animation: "rySecIn .5s .12s cubic-bezier(.2,.7,.2,1) both" }}>
          <div style={{ background: "#272727", border: "1px solid #7F60DC", borderRadius: 18, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: "#7F60DC2e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <img src="/assets/ic-quicktime.svg" alt="" width={26} height={30} style={{ display: "block" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: "#fff", fontSize: 17, fontWeight: 900 }}>Quicktimes</span>
                <div style={{ color: "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 700, marginTop: 1 }}>Time-limited challenges, dropped live</div>
              </div>
            </div>
            <p style={{ margin: "13px 0 0", color: "rgba(255,255,255,.6)", fontSize: 13.5, fontWeight: 700, lineHeight: 1.5 }}>
              Quicktimes pop up during the night with a countdown — first team to finish wins the bonus.
            </p>
            <button
              type="button"
              disabled
              style={{ width: "100%", marginTop: 15, background: "#fff", color: "#15161B", border: 0, borderRadius: 13, padding: 13, fontFamily: "inherit", fontSize: 14.5, fontWeight: 900, cursor: "not-allowed", opacity: 0.4, boxShadow: "none" }}
            >
              No Quicktimes available
            </button>
          </div>
        </div>

        {/* map preview */}
        <div style={{ padding: "22px 16px 6px", animation: "rySecIn .5s .16s cubic-bezier(.2,.7,.2,1) both" }}>
          <button
            type="button"
            onClick={() => navigate("/map")}
            style={{ width: "100%", textAlign: "left", background: "#1b1e2b", border: "1px solid #2a3047", borderRadius: 18, overflow: "hidden", cursor: "pointer", fontFamily: "inherit", padding: 0, display: "block" }}
          >
            <div style={{ padding: "16px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ color: "#fff", fontSize: 16, fontWeight: 900 }}>City map</div>
                <div style={{ color: "rgba(255,255,255,.5)", fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>{checkpoints.length} checkpoints live tonight</div>
              </div>
              <svg width="9" height="16" viewBox="0 0 11 18" fill="none"><path d="M1.5 1.5L9 9l-7.5 7.5" stroke="#5b6178" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <div style={{ height: 118, background: "radial-gradient(120% 140% at 30% 0%,#26304a 0%,#1a2033 60%,#161b29 100%)", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1px solid #232a40" }}>
              <img src="/assets/ic-map.svg" alt="" width={74} height={68} style={{ display: "block", opacity: 0.92, filter: "drop-shadow(0 6px 14px rgba(0,0,0,.4))" }} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <div style={{ flex: 1, background: "#1b1e2b", border: "1px solid #2a3047", borderRadius: 16, padding: "13px 8px 11px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <img src={icon} alt="" height={26} style={{ display: "block", width: "auto" }} />
      <div style={{ color, fontSize: 19, fontWeight: 900 }}>{value}</div>
      <div style={{ color: "rgba(255,255,255,.42)", fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

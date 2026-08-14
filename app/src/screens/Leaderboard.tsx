import { useToast } from "../components/Toast";
import { useAppState } from "../state/AppStateContext";
import { useCountUp } from "../hooks/useCountUp";

const MEDAL = ["#F0A500", "#C7CCD6", "#C1834A"];

export function Leaderboard() {
  const { ping } = useToast();
  const { teams, session } = useAppState();
  const prog = useCountUp(100, 1100) / 100;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#15161B" }}>
      {/* league header */}
      <div style={{ flexShrink: 0, padding: "22px 20px 18px", textAlign: "center", animation: "ryHdrIn .5s cubic-bezier(.2,.7,.2,1) both" }}>
        <img src="/assets/ic-trophy.svg" alt="" width={56} height={57} style={{ filter: "drop-shadow(0 6px 14px rgba(240,165,0,.35))", animation: "ryBadgeIn .55s .1s cubic-bezier(.2,.8,.2,1) both" }} />
        <h1 style={{ margin: "12px 0 0", color: "#fff", fontSize: 24, fontWeight: 900, letterSpacing: -0.4 }}>League</h1>
        <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,.5)", fontSize: 14, fontWeight: 700 }}>Live standings, updated as teams submit</p>
      </div>

      {/* rankings */}
      <div className="ry-scroll" style={{ flex: 1, minHeight: 0, padding: "0 16px 8px" }}>
        {teams.map((tm, i) => {
          const rank = i + 1;
          const isTop3 = i < 3;
          const isYou = tm.id === session?.teamId;

          return (
            <button
              key={tm.id}
              type="button"
              onClick={() => ping(isYou ? "That's your crew — keep climbing!" : `${tm.name} · ${tm.points.toLocaleString()} pts`)}
              style={{
                position: "relative", width: "100%", display: "flex", alignItems: "center", gap: 12,
                padding: "11px 14px 11px 8px", border: 0, borderRadius: 16, cursor: "pointer", fontFamily: "inherit",
                marginBottom: 8, transition: "background .12s", animation: `ryRowIn .4s cubic-bezier(.2,.7,.2,1) ${(0.05 + i * 0.045).toFixed(2)}s both`,
                background: isYou ? "rgba(79,203,187,.08)" : "#23273B",
                boxShadow: isYou ? "inset 0 0 0 2px #4FCBBB" : "none",
              }}
            >
              <div style={{ width: 30, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                {isTop3 ? (
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: MEDAL[i], color: "#15161B", fontSize: 13, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 0 rgba(0,0,0,.25)" }}>{rank}</div>
                ) : (
                  <span style={{ color: "rgba(255,255,255,.55)", fontSize: 16, fontWeight: 900 }}>{rank}</span>
                )}
              </div>
              <div style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0, background: tm.color, color: "#15161B", fontSize: 15, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 0 rgba(0,0,0,.28)" }}>
                {monogram(tm.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ color: "#fff", fontSize: 16, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tm.name}</span>
                  {isYou && <span style={{ background: "#4FCBBB", color: "#15161B", fontSize: 10, fontWeight: 900, letterSpacing: 0.5, padding: "2px 6px", borderRadius: 6 }}>YOU</span>}
                </div>
                <div style={{ color: "rgba(255,255,255,.4)", fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>{tm.memberCount} racers</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, width: 86, justifyContent: "flex-end" }}>
                <img src="/assets/ic-points.svg" alt="" width={15} height={19} style={{ display: "block" }} />
                <span style={{ color: "#fff", fontSize: 16, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{Math.round(tm.points * prog).toLocaleString()}</span>
              </div>
            </button>
          );
        })}
        <div style={{ height: 6 }} />
      </div>
    </div>
  );
}

function monogram(name: string) {
  const w = name.split(" ");
  return (w[0][0] + (w[1] ? w[1][0] : "")).toUpperCase();
}

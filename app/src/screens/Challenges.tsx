import { useRef, useState } from "react";
import { useAppState } from "../state/AppStateContext";
import type { ChallengeCard, Tier } from "../services/api";
import { useToast } from "../components/Toast";
import { useCountUp } from "../hooks/useCountUp";
import { usePressHold } from "../hooks/usePressHold";
import { BottomSheet } from "../components/BottomSheet";

const PREVIEW_N = 3;

type SheetState = { kind: "list"; tierId: string } | { kind: "submit"; tierId: string; challengeId: string } | null;

export function Challenges() {
  const { tiers, isDone, submit, totalPoints, doneCount, totalCount } = useAppState();
  const { ping } = useToast();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayPts = useCountUp(totalPoints, 750);
  const mountProgress = useCountUp(100, 900) / 100;

  const submitTier = sheet?.kind === "submit" ? tiers.find((t) => t.id === sheet.tierId) ?? null : null;
  const submitCard = submitTier && sheet?.kind === "submit" ? submitTier.cards.find((c) => c.id === sheet.challengeId) ?? null : null;

  const listTier = sheet?.kind === "list" ? tiers.find((t) => t.id === sheet.tierId) ?? null : null;

  function openSubmit(tierId: string, challengeId: string) {
    setSheet({ kind: "submit", tierId, challengeId });
    setFile(null);
    setNote("");
  }

  async function onSubmit() {
    if (!submitCard || sheet?.kind !== "submit" || !file || submitting) return;
    setSubmitting(true);
    try {
      const pts = await submit(sheet.challengeId, file, note);
      setSheet(null);
      ping(`Submitted! +${pts} pts · ${submitCard.title}`, 2100);
    } catch {
      ping("Couldn't submit that — check your connection and try again.", 2600);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#15161B" }}>
      {/* header */}
      <div style={{ flexShrink: 0, padding: "22px 20px 16px", animation: "ryHdrIn .5s cubic-bezier(.2,.7,.2,1) both" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ margin: 0, color: "#fff", fontSize: 28, fontWeight: 900, letterSpacing: -0.5 }}>Challenges</h1>
            <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.5)", fontSize: 14, fontWeight: 700 }}>{doneCount} of {totalCount} completed</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#23273B", border: "1px solid #343A56", padding: "8px 13px", borderRadius: 14 }}>
            <img src="/assets/ic-points.svg" alt="" width={15} height={19} style={{ display: "block" }} />
            <span style={{ color: "#fff", fontSize: 16, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{displayPts.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* tiers */}
      <div className="ry-scroll" style={{ flex: 1, minHeight: 0, padding: "0 16px 8px" }}>
        {tiers.map((tier) => (
          <TierSection
            key={tier.id}
            tier={tier}
            isDone={isDone}
            mountProgress={mountProgress}
            expanded={expanded}
            setExpanded={setExpanded}
            onOpenSubmit={(challengeId) => openSubmit(tier.id, challengeId)}
            onSeeAll={() => setSheet({ kind: "list", tierId: tier.id })}
          />
        ))}
        <div style={{ height: 4 }} />
      </div>

      {/* see-all sheet */}
      <BottomSheet open={sheet?.kind === "list"} onClose={() => setSheet(null)} heightPct={80} zIndex={16}>
        {listTier && (
          <>
            <div style={{ flexShrink: 0, padding: "10px 20px 6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${listTier.accent}1f` }}>
                  <img src={listTier.icon} alt="" style={{ maxWidth: 32, maxHeight: 32, display: "block" }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, color: "#fff", fontSize: 20, fontWeight: 900 }}>{listTier.name}</h2>
                  <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 700 }}>
                    {listTier.cards.filter((c) => isDone(c.id)).length} of {listTier.cards.length} completed · {listTier.tag.toLowerCase()}
                  </p>
                </div>
              </div>
              <p style={{ margin: "12px 0 0", color: "rgba(255,255,255,.62)", fontSize: 13.5, fontWeight: 700, lineHeight: 1.5 }}>{listTier.blurb}</p>
            </div>
            <div className="ry-scroll" style={{ flex: 1, minHeight: 0, padding: "6px 16px 24px", display: "flex", flexDirection: "column", gap: 9 }}>
              {listTier.cards.map((card, i) => {
                const done = isDone(card.id);
                const key = `list-${card.id}`;
                return (
                  <ListRow
                    key={key}
                    card={card}
                    index={i}
                    tier={listTier}
                    done={done}
                    expanded={expanded === key}
                    onToggleExpand={() => setExpanded((e) => (e === key ? null : key))}
                    onTap={() => {
                      if (!done) openSubmit(listTier.id, card.id);
                      else ping(`${card.title} · already done ✓`);
                    }}
                  />
                );
              })}
            </div>
          </>
        )}
      </BottomSheet>

      {/* submission sheet */}
      <BottomSheet open={sheet?.kind === "submit"} onClose={() => setSheet(null)} heightPct={86} zIndex={16}>
        {submitTier && submitCard && (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "10px 22px 22px" }}>
            <div className="ry-scroll" style={{ flex: 1, minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ background: `${submitTier.accent}22`, color: submitTier.accent, fontSize: 11, fontWeight: 900, letterSpacing: 0.6, padding: "5px 11px", borderRadius: 8 }}>{submitCard.tag}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5, color: submitTier.accent, fontSize: 15, fontWeight: 900 }}>
                  <img src="/assets/ic-points.svg" alt="" width={14} height={17} style={{ display: "block" }} />
                  {submitCard.ptsLabel || submitCard.pts} pts
                </span>
              </div>
              <h2 style={{ margin: "12px 0 0", color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: -0.3 }}>{submitCard.title}</h2>
              <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.6)", fontSize: 14.5, fontWeight: 600, lineHeight: 1.5 }}>{submitCard.desc}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, color: "rgba(255,255,255,.45)", fontSize: 13, fontWeight: 700 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                {submitCard.meta}
              </div>

              <p style={{ margin: "22px 0 10px", color: "#fff", fontSize: 14, fontWeight: 900, letterSpacing: 0.2 }}>YOUR PROOF</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                capture="environment"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => (file ? setFile(null) : fileInputRef.current?.click())}
                style={{ width: "100%", border: `2px dashed ${file ? "#4FCBBB" : "#343A56"}`, borderRadius: 18, background: file ? "rgba(79,203,187,.06)" : "#15161B", padding: "24px 16px", cursor: "pointer", fontFamily: "inherit", transition: "border-color .15s, background .15s" }}
              >
                {!file ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M4 16l4-4 3 3 5-5 4 4M4 6h16v12H4z" stroke="#4FCBBB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span style={{ color: "#fff", fontSize: 15, fontWeight: 800 }}>Add a photo or video</span>
                    <span style={{ color: "rgba(255,255,255,.4)", fontSize: 12.5, fontWeight: 700 }}>Tap to capture your proof</span>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#4FCBBB", display: "flex", alignItems: "center", justifyContent: "center", animation: "ryPop .4s cubic-bezier(.2,.8,.2,1) both" }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M4 12.5L9.5 18L20 6.5" stroke="#15161B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <span style={{ color: "#fff", fontSize: 15, fontWeight: 800, marginTop: 10 }}>{file.name}</span>
                    <span style={{ color: "#4FCBBB", fontSize: 12.5, fontWeight: 800 }}>Tap to remove</span>
                  </div>
                )}
              </button>

              <p style={{ margin: "18px 0 8px", color: "#fff", fontSize: 14, fontWeight: 900, letterSpacing: 0.2 }}>
                ADD A NOTE <span style={{ color: "rgba(255,255,255,.35)", fontWeight: 700 }}>(optional)</span>
              </p>
              <textarea
                className="ry-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tell the judges what went down…"
                style={{ width: "100%", height: 68, resize: "none", borderRadius: 14, background: "#15161B", border: "1px solid #343A56", color: "#fff", fontFamily: "inherit", fontSize: 14.5, fontWeight: 700, padding: "12px 14px", lineHeight: 1.4 }}
              />
              <div style={{ height: 10 }} />
            </div>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!file || submitting}
              style={{ flexShrink: 0, marginTop: 10, width: "100%", height: 50, border: 0, borderRadius: 14, background: "#4FCBBB", boxShadow: file ? "0 4px 0 0 #379488" : "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: file && !submitting ? "pointer" : "not-allowed", opacity: file ? 1 : 0.45, fontFamily: "inherit" }}
            >
              <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: 0.6, color: "#fff", textTransform: "uppercase" }}>
                {submitting ? "Submitting…" : file ? "Submit challenge" : "Add proof to submit"}
              </span>
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function TierSection({
  tier, isDone, mountProgress, expanded, setExpanded, onOpenSubmit, onSeeAll,
}: {
  tier: Tier;
  isDone: (challengeId: string) => boolean;
  mountProgress: number;
  expanded: string | null;
  setExpanded: (key: string | null) => void;
  onOpenSubmit: (challengeId: string) => void;
  onSeeAll: () => void;
}) {
  const total = tier.cards.length;
  const doneN = tier.cards.filter((c) => isDone(c.id)).length;
  const pct = total ? doneN / total : 0;
  const cleared = total > 0 && doneN === total;
  const openCards = tier.cards.map((cd, i) => ({ cd, i })).filter((x) => !isDone(x.cd.id));
  const preview = openCards.slice(0, PREVIEW_N);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 12, padding: "0 2px" }}>
        <div style={{ width: 52, height: 52, borderRadius: 15, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${tier.accent}1f` }}>
          <img src={tier.icon} alt="" style={{ maxWidth: 38, maxHeight: 38, display: "block" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#fff", fontSize: 18, fontWeight: 900, letterSpacing: -0.2 }}>{tier.name}</span>
            <span style={{ background: `${tier.accent}22`, color: tier.accent, fontSize: 10, fontWeight: 900, letterSpacing: 0.6, padding: "3px 8px", borderRadius: 7 }}>{tier.tag}</span>
          </div>
          <div style={{ marginTop: 7, height: 8, borderRadius: 5, background: "#2a3047", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 5, background: tier.accent, width: `${Math.round(pct * mountProgress * 100)}%`, transition: "width .3s" }} />
          </div>
        </div>
        <span style={{ color: "rgba(255,255,255,.55)", fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{doneN}/{total}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {preview.map(({ cd, i }) => (
          <PreviewCard
            key={cd.id}
            card={cd}
            index={i}
            tier={tier}
            expanded={expanded === cd.id}
            onToggleExpand={() => setExpanded(expanded === cd.id ? null : cd.id)}
            onTap={() => onOpenSubmit(cd.id)}
          />
        ))}

        {cleared && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: 16, border: "2px solid rgba(79,203,187,.3)", borderRadius: 16, color: "#4FCBBB", fontSize: 13.5, fontWeight: 800, background: "rgba(79,203,187,.06)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12.5L9.5 18L20 6.5" stroke="#4FCBBB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <span>Tier cleared — every challenge conquered!</span>
          </div>
        )}

        {!cleared && (
          <button
            type="button"
            onClick={onSeeAll}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 2, padding: 11, background: "none", border: 0, borderRadius: 12, color: "rgba(255,255,255,.55)", fontFamily: "inherit", fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}
          >
            See all {tier.cards.length} {tier.name} challenges
            <svg width="8" height="13" viewBox="0 0 9 15" fill="none" style={{ marginLeft: 2 }}><path d="M1.5 1.5L7 7.5l-5.5 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}

function PreviewCard({
  card, index, tier, expanded, onToggleExpand, onTap,
}: {
  card: ChallengeCard; index: number; tier: Tier; expanded: boolean; onToggleExpand: () => void; onTap: () => void;
}) {
  const { onDown, onUp, wasHold } = usePressHold(onToggleExpand, 300);
  return (
    <button
      type="button"
      onClick={() => { if (wasHold()) return; onTap(); }}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "stretch",
        padding: 14, border: 0, borderRadius: 16, cursor: "pointer", fontFamily: "inherit", textAlign: "left",
        background: expanded ? "#2b3049" : "#23273B", boxShadow: "0 4px 0 0 #1a1d2a",
        userSelect: "none", transition: "background .12s", animation: "ryCardIn .4s cubic-bezier(.2,.7,.2,1) both",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 13, width: "100%" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${tier.accent}22` }}>
          <span style={{ color: tier.accent, fontWeight: 900, fontSize: 15 }}>{index + 1}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, letterSpacing: -0.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: tier.accent, fontSize: 13, fontWeight: 800 }}>
              <img src="/assets/ic-points.svg" alt="" width={12} height={15} style={{ display: "block" }} />
              {card.ptsLabel || card.pts}
            </span>
            <span style={{ color: "rgba(255,255,255,.4)", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.4 }}>{card.meta}</span>
          </div>
        </div>
        <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", background: "#4FCBBB", boxShadow: "0 3px 0 #379488", display: "flex", alignItems: "center", justifyContent: "center", transition: "transform .25s", transform: `rotate(${expanded ? "90deg" : "0deg"})` }}>
          <svg width="9" height="15" viewBox="0 0 9 15" fill="none"><path d="M1.5 1.5L7 7.5l-5.5 6" stroke="#15161B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
      <div style={{ overflow: "hidden", textAlign: "left", color: "rgba(255,255,255,.62)", fontSize: 13.5, fontWeight: 700, lineHeight: 1.45, paddingLeft: 47, maxHeight: expanded ? 160 : 0, opacity: expanded ? 1 : 0, marginTop: expanded ? 11 : 0, transition: "max-height .3s ease, opacity .25s ease, margin-top .3s ease" }}>
        {card.desc}
      </div>
    </button>
  );
}

function ListRow({
  card, index, tier, done, expanded, onToggleExpand, onTap,
}: {
  card: ChallengeCard; index: number; tier: Tier; done: boolean; expanded: boolean; onToggleExpand: () => void; onTap: () => void;
}) {
  const { onDown, onUp, wasHold } = usePressHold(onToggleExpand, 300);
  return (
    <button
      type="button"
      onClick={() => { if (wasHold()) return; onTap(); }}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onContextMenu={(e) => e.preventDefault()}
      style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "stretch", padding: "12px 13px", border: 0, borderRadius: 14, cursor: "pointer", fontFamily: "inherit", textAlign: "left", background: expanded ? "#2b3049" : "#23273B", userSelect: "none", transition: "background .12s" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: done ? "#4FCBBB" : `${tier.accent}22` }}>
          {done
            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12.5L9.5 18L20 6.5" stroke="#15161B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
            : <span style={{ color: tier.accent, fontWeight: 900, fontSize: 14 }}>{index + 1}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={{ color: done ? "rgba(255,255,255,.55)" : "#fff", fontSize: 15, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textDecoration: done ? "line-through" : "none", textDecorationColor: "rgba(79,203,187,.6)" }}>
            {card.title}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: done ? "rgba(255,255,255,.4)" : tier.accent, fontSize: 12.5, fontWeight: 800 }}>
              <img src="/assets/ic-points.svg" alt="" width={11} height={14} style={{ display: "block", filter: done ? "grayscale(1)" : "none", opacity: done ? 0.6 : 1 }} />
              {card.ptsLabel || card.pts}
            </span>
            <span style={{ color: "rgba(255,255,255,.4)", fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: 0.4 }}>{card.meta}</span>
          </div>
        </div>
        <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 900, letterSpacing: 0.4, padding: "5px 10px", borderRadius: 20, background: done ? "rgba(79,203,187,.14)" : "#4FCBBB", color: done ? "#4FCBBB" : "#15161B" }}>
          {done ? "DONE" : "START"}
        </span>
      </div>
      <div style={{ overflow: "hidden", textAlign: "left", color: "rgba(255,255,255,.6)", fontSize: 13, fontWeight: 700, lineHeight: 1.45, paddingLeft: 44, maxHeight: expanded ? 160 : 0, opacity: expanded ? 1 : 0, marginTop: expanded ? 10 : 0, transition: "max-height .3s ease, opacity .25s ease, margin-top .3s ease" }}>
        {card.desc}
      </div>
    </button>
  );
}

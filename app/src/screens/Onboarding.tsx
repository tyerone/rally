import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChunkyButton } from "../components/ChunkyButton";
import { BottomSheet } from "../components/BottomSheet";
import { useToast } from "../components/Toast";
import { useAppState } from "../state/AppStateContext";
import * as api from "../services/api";
import type { RosterEntry } from "../services/api";

type Step = "name" | "ptype" | "newplayer" | "returning";

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function maskPhone(phone: string) {
  const last4 = phone.slice(-4);
  return `•••• •••-${last4}`;
}

export function Onboarding() {
  const navigate = useNavigate();
  const { ping } = useToast();
  const { setSession } = useAppState();

  const [step, setStep] = useState<Step>("name");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<RosterEntry | null>(null);
  const [matches, setMatches] = useState<RosterEntry[]>([]);
  const [ptype, setPtype] = useState<"casual" | "comp" | null>(null);

  const [sheet, setSheet] = useState(false);
  const [phoneForOtp, setPhoneForOtp] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(false);
  const [resend, setResend] = useState(30);
  const codeRef = useRef<HTMLInputElement>(null);
  const resendTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    if (query.trim().length > 0) {
      api.searchRoster(query).then((r) => alive && setMatches(r));
    } else {
      setMatches([]);
    }
    return () => { alive = false; };
  }, [query]);

  useEffect(() => () => clearInterval(resendTimer.current), []);

  const isInfo = step === "newplayer" || step === "returning";
  let progress = 0.2;
  if (sheet && !verified) progress = 0.4;
  if (step === "ptype") progress = 0.6;
  if (isInfo) progress = 0.85;

  const first = selected ? selected.name.split(" ")[0] : "";
  let bubbleTitle = "What's your name?";
  let bubbleSub = "I'll match you to the roster.";
  if (step === "name" && selected) {
    bubbleTitle = `Found you, ${first}!`;
    bubbleSub = "Tap continue to verify it's really you.";
  }
  if (step === "ptype") {
    bubbleTitle = "Are you a NEW or RETURNING PLAYER?";
    bubbleSub = "Select the option right for you.";
  }

  function startResendTimer() {
    setResend(30);
    clearInterval(resendTimer.current);
    resendTimer.current = setInterval(() => {
      setResend((s) => {
        if (s <= 1) { clearInterval(resendTimer.current); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  async function openSheet() {
    if (!selected) return;
    try {
      const phone = await api.requestCode(selected.id, selected.name);
      setPhoneForOtp(phone);
      setSheet(true);
      setCode("");
      setVerified(false);
      setError(false);
      startResendTimer();
      setTimeout(() => codeRef.current?.focus(), 420);
    } catch {
      ping("Couldn't send that code — check your connection and try again.", 2600);
    }
  }

  async function onResend() {
    if (!selected) return;
    try {
      const phone = await api.requestCode(selected.id, selected.name);
      setPhoneForOtp(phone);
      setCode("");
      setError(false);
      startResendTimer();
      ping("New code sent ✓");
    } catch {
      ping("Couldn't resend — try again in a moment.", 2600);
    }
  }

  async function onVerify() {
    if (code.length < 6 || verifying || !selected || !phoneForOtp) return;
    setVerifying(true);
    setError(false);
    const ok = await api.verifyCode(selected.id, phoneForOtp, code);
    setVerifying(false);
    if (ok) setVerified(true);
    else setError(true);
  }

  async function onFinish() {
    if (!selected) return;
    setSheet(false);
    // Returning player who's already finished onboarding before — no need
    // to ask player type again or show the how-to-play screen, just sign in.
    try {
      const existing = await api.getSession();
      if (existing?.playerType) {
        setSession(existing);
        navigate("/home", { replace: true });
        return;
      }
    } catch (e) {
      console.error("Failed to check for an existing session:", e);
      // fall through to onboarding if this lookup fails for any reason
    }
    setStep("ptype");
  }

  async function onContinue() {
    if (step === "name") {
      if (selected) openSheet();
    } else if (step === "ptype") {
      if (ptype) setStep(ptype === "comp" ? "returning" : "newplayer");
    } else if (isInfo) {
      try {
        const session = await api.completeOnboarding(ptype ?? "casual");
        setSession(session);
        navigate("/home", { replace: true });
      } catch (e) {
        console.error("Failed to complete onboarding:", e);
        ping("Something went wrong finishing setup — try again.", 2600);
      }
    }
  }

  const contDisabled = step === "ptype" ? !ptype : step === "name" ? !selected : false;

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", background: "#15161B", minHeight: 0 }}>
      {/* header: back + progress — hidden on info steps, whose baked illustration already includes this chrome */}
      {!isInfo && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 14, padding: "26px 20px 0" }}>
          <button
            type="button"
            aria-label="Back"
            onClick={() => {
              if (step === "ptype") setStep("name");
              else ping("← Back to welcome");
            }}
            style={{ background: "none", border: 0, padding: 0, cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}
          >
            <svg width="22" height="18" viewBox="0 0 26 22" fill="none">
              <path d="M24 11H2M2 11L11 2M2 11L11 20" stroke="#343A56" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div style={{ flex: 1, height: 12, borderRadius: 13, background: "#343A56", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 13, background: "#4FCBBB", transition: "width .55s cubic-bezier(.2,.7,.2,1)", width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>
      )}

      {/* mascot + bubble */}
      {!isInfo && (
        <div style={{ flexShrink: 0, display: "flex", alignItems: "flex-start", gap: 14, padding: "22px 16px 0", animation: "ryMascotIn .5s ease both" }}>
          <img
            src="/assets/mascot.svg"
            alt=""
            width={78}
            height={82}
            style={{ display: "block", flexShrink: 0, transformOrigin: "50% 88%", animation: "ryIdle 3.4s ease-in-out infinite" }}
          />
          <div style={{ position: "relative", flex: 1, minWidth: 0, background: "#000", border: "1px solid #7F60DC", borderRadius: 20, padding: "15px 18px", animation: "ryBubbleIn .4s ease both" }}>
            <p style={{ margin: 0, color: "#fff", fontSize: 15.5, fontWeight: 800, lineHeight: 1.25 }}>{bubbleTitle}</p>
            <p style={{ margin: "5px 0 0", color: "#7F60DC", fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>{bubbleSub}</p>
          </div>
        </div>
      )}

      {/* content */}
      <div className="ry-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "22px 16px 0" }}>
        {step === "name" && (
          <div>
            <input
              className="ry-inp"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null); setFocused(true); }}
              onFocus={() => setFocused(true)}
              placeholder="Type your name"
              autoComplete="off"
              style={{ width: "100%", height: 46, borderRadius: 12, background: "#23273B", border: "1px solid #343A56", color: "#fff", fontSize: 16, fontWeight: 700, padding: "0 16px" }}
            />
            {focused && query.trim().length > 0 && !selected && (
              <div style={{ marginTop: 10, background: "#1c1f2e", border: "1px solid #343A56", borderRadius: 14, padding: 6 }}>
                {matches.length > 0 ? matches.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setSelected(r); setQuery(r.name); setFocused(false); }}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", background: "none", border: 0, borderRadius: 12, cursor: "pointer", animation: "ryRowIn .28s ease both" }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#343A56", color: "#4FCBBB", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {initials(r.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <div style={{ color: "#fff", fontSize: 15.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                      <div style={{ color: "rgba(255,255,255,.42)", fontSize: 12.5, fontWeight: 700 }}>{r.teamName ?? "No team yet"} &nbsp;·&nbsp; •••• •••-{r.phoneLast4}</div>
                    </div>
                  </button>
                )) : (
                  <div style={{ padding: "16px 14px", color: "rgba(255,255,255,.5)", fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>
                    No one on the roster matches that. Check your spelling, or ask an organizer.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === "ptype" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <PTypeCard
              active={ptype === "casual"}
              title="I AM A NEW PLAYER"
              desc="I have never played Car Rally before."
              bars={[30, 47, 62]}
              barsActive={1}
              onClick={() => setPtype("casual")}
            />
            <PTypeCard
              active={ptype === "comp"}
              title="I AM A RETURNING PLAYER"
              desc="We are so back (it means you've played Car Rally before)."
              bars={[30, 47, 62]}
              barsActive={3}
              onClick={() => setPtype("comp")}
            />
          </div>
        )}

        {isInfo && (
          <div style={{ position: "relative", margin: "-22px -16px 0", animation: "ryInfoIn .5s cubic-bezier(.2,.7,.2,1) both" }}>
            {/* The baked illustration includes its own "CONTINUE" button art
               (~y 841-887 of its 440x956 canvas) that isn't clickable — we
               already render a real one below, so crop that strip off
               rather than show a second, dead-looking button. */}
            <div style={{ position: "relative", width: "100%", height: 0, paddingBottom: `${(841 / 440) * 100}%`, overflow: "hidden" }}>
              <img
                src={step === "newplayer" ? "/assets/ob-new-player.svg" : "/assets/ob-returning-player.svg"}
                alt={step === "newplayer" ? "Welcome to your first Rally — how to play" : "Welcome back to Rally"}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "auto", display: "block" }}
              />
            </div>
            <button
              type="button"
              aria-label="Back"
              onClick={() => setStep("ptype")}
              style={{ position: "absolute", left: 0, top: 0, width: 64, height: 60, background: "none", border: 0, cursor: "pointer" }}
            />
          </div>
        )}
      </div>

      {/* continue */}
      <div style={{ flexShrink: 0, padding: "16px 16px calc(20px + env(safe-area-inset-bottom, 0px))" }}>
        <ChunkyButton disabled={contDisabled} onClick={onContinue}>
          <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: 0.8, color: "#fff", textTransform: "uppercase" }}>
            {isInfo ? "Enter Rally" : "Continue"}
          </span>
        </ChunkyButton>
      </div>

      {/* 2FA sheet */}
      <BottomSheet open={sheet} onClose={() => { clearInterval(resendTimer.current); setSheet(false); }} heightPct={verified ? 48 : 56}>
        <div style={{ padding: "0 24px 26px", flex: 1, minHeight: 0, overflowY: "auto" }}>
          {!verified ? (
            <div>
              <div style={{ width: 52, height: 52, borderRadius: 15, background: "rgba(79,203,187,.14)", display: "flex", alignItems: "center", justifyContent: "center", margin: "18px 0 16px" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M17 9V7a5 5 0 0 0-10 0v2M5 9h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" stroke="#4FCBBB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h2 style={{ margin: 0, color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: -0.3 }}>Verify it's you</h2>
              <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.55)", fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>
                We texted a 6-digit code to the number on file for <span style={{ color: "#fff", fontWeight: 800 }}>{selected?.name}</span> — <span style={{ color: "#fff", fontWeight: 800, whiteSpace: "nowrap" }}>{phoneForOtp ? maskPhone(phoneForOtp) : ""}</span>
              </p>
              <div onClick={() => codeRef.current?.focus()} style={{ position: "relative", display: "flex", gap: 9, margin: "22px 0 0", cursor: "text" }}>
                <input
                  ref={codeRef}
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(false); }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", border: 0, fontSize: 16 }}
                />
                {Array.from({ length: 6 }).map((_, i) => {
                  const ch = code[i] || "";
                  const active = i === code.length && code.length < 6;
                  const borderColor = error ? "#e0576b" : ch || active ? "#4FCBBB" : "#343A56";
                  return (
                    <div
                      key={i}
                      style={{ width: 42, height: 52, borderRadius: 12, background: "#15161B", border: `2px solid ${borderColor}`, color: "#fff", fontSize: 22, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", transition: "border-color .15s" }}
                    >
                      {ch}
                    </div>
                  );
                })}
              </div>
              {error && (
                <div style={{ marginTop: 10, color: "#e0576b", fontSize: 13, fontWeight: 800, textAlign: "center" }}>
                  That code didn't match. Try again.
                </div>
              )}
              <div style={{ marginTop: 16, color: "rgba(255,255,255,.5)", fontSize: 13.5, fontWeight: 700 }}>
                {resend > 0 ? `Didn't get it? You can resend in 0:${String(resend).padStart(2, "0")}` : "Didn't get a code?"}{" "}
                {resend === 0 && (
                  <a onClick={onResend} style={{ fontWeight: 800, cursor: "pointer" }}>
                    Resend code
                  </a>
                )}
              </div>
              <ChunkyButton disabled={code.length < 6 || verifying} onClick={onVerify} style={{ marginTop: 22 }}>
                <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: 0.8, color: "#fff", textTransform: "uppercase" }}>
                  {verifying ? "Verifying…" : "Verify"}
                </span>
              </ChunkyButton>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 18, textAlign: "center" }}>
              <div style={{ width: 84, height: 84, borderRadius: "50%", background: "#4FCBBB", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 0 0 #379488", animation: "ryPop .5s cubic-bezier(.2,.8,.2,1) both" }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none"><path d="M4 12.5L9.5 18L20 6.5" stroke="#15161B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h2 style={{ margin: "20px 0 0", color: "#fff", fontSize: 24, fontWeight: 900, letterSpacing: -0.3 }}>You're verified!</h2>
              <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,.55)", fontSize: 14.5, fontWeight: 600, textAlign: "center", lineHeight: 1.45 }}>
                Welcome to Rally, <span style={{ color: "#fff", fontWeight: 800 }}>{first}</span>. One quick thing before we go.
              </p>
              <ChunkyButton onClick={onFinish} style={{ marginTop: 26 }}>
                <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: 0.8, color: "#fff", textTransform: "uppercase" }}>Continue</span>
              </ChunkyButton>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

function PTypeCard({
  active, title, desc, bars, barsActive, onClick,
}: {
  active: boolean; title: string; desc: string; bars: number[]; barsActive: number; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        width: "100%",
        minHeight: 96,
        borderRadius: 14,
        background: active ? "rgba(79,203,187,.06)" : "none",
        border: active ? "2px solid #4FCBBB" : "2px solid #343A56",
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "16px 18px",
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "border-color .15s, background .15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, width: 56, flexShrink: 0 }}>
        {bars.map((h, i) => (
          <div key={i} style={{ width: 16, height: h, borderRadius: 6, background: i < barsActive ? "#33847A" : "#25302E" }} />
        ))}
      </div>
      <div style={{ flex: 1, textAlign: "left" }}>
        <div style={{ color: "#fff", fontSize: 16, fontWeight: 900, letterSpacing: -0.2 }}>{title}</div>
        <div style={{ color: "rgba(255,255,255,.5)", fontSize: 13, fontWeight: 700, lineHeight: 1.35, marginTop: 3 }}>{desc}</div>
      </div>
      <div style={{ position: "absolute", top: 12, right: 12, width: 22, height: 22, borderRadius: "50%", background: "#4FCBBB", display: active ? "flex" : "none", alignItems: "center", justifyContent: "center" }}>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2 7.5L5.5 11L12 3.5" stroke="#15161B" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    </button>
  );
}

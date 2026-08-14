import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAppState } from "../state/AppStateContext";

interface IconDef {
  src: string;
  w: number;
  h: number;
}

const ICONS: IconDef[] = [
  { src: "/assets/ic-star.svg", w: 44, h: 45 },
  { src: "/assets/ic-trophy.svg", w: 52, h: 53 },
  { src: "/assets/ic-points.svg", w: 36, h: 45 },
  { src: "/assets/ic-challenges.svg", w: 27, h: 35 },
  { src: "/assets/ic-quicktime.svg", w: 34, h: 43 },
  { src: "/assets/ic-swordblue.svg", w: 44, h: 43 },
  { src: "/assets/ic-swordred.svg", w: 43, h: 44 },
  { src: "/assets/ic-rookie.svg", w: 36, h: 37 },
  { src: "/assets/ic-ranger.svg", w: 48, h: 49 },
  { src: "/assets/ic-driver.svg", w: 45, h: 54 },
  { src: "/assets/ic-map.svg", w: 78, h: 72 },
];

const SCALE = 1.3;
const TOP_BASE = 900;
const G = 2300;
const GAP = 150;
const N = 15;

interface Piece {
  el: HTMLImageElement | null;
  delay: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  av: number;
}

export function Startup() {
  const navigate = useNavigate();
  const { session } = useAppState();
  const splashRef = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLImageElement | null)[]>([]);
  const rafRef = useRef<number | undefined>(undefined);
  const doneRef = useRef(false);
  const navigatedRef = useRef(false);

  // Tracked separately so the animation effect below can read the latest
  // session without re-running (and restarting the physics loop) every time
  // it changes — it only needs the value once, at the moment it navigates.
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);

  const defs = useRef(
    Array.from({ length: N }).map((_, i) => {
      const ic = ICONS[i % ICONS.length];
      const t = i / (N - 1);
      const side = i % 2 === 0 ? -1 : 1;
      const launchX = 220 + side * (55 + t * 120) + (Math.random() * 40 - 20);
      return { src: ic.src, w: Math.round(ic.w * SCALE), h: Math.round(ic.h * SCALE), launchX };
    })
  ).current;

  useEffect(() => {
    const pieces: Piece[] = defs.map((d, i) => {
      const toCenter = (220 - d.launchX) / 640;
      return {
        el: els.current[i],
        delay: 380 + i * (GAP + (Math.random() * 50 - 25)),
        x: 0,
        y: 120,
        vx: toCenter * 320 + (Math.random() * 90 - 45),
        vy: -(1320 + Math.random() * 260),
        rot: Math.random() * 40 - 20,
        av: (Math.random() * 2 - 1) * 300,
      };
    });

    const goNext = () => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      if (splashRef.current) splashRef.current.style.opacity = "0";
      setTimeout(() => navigate(sessionRef.current ? "/home" : "/login", { replace: true }), 550);
    };

    const t0 = performance.now();
    let prev = t0;
    const loop = (t: number) => {
      const dt = Math.min((t - prev) / 1000, 0.032);
      prev = t;
      const elapsed = t - t0;
      let allDown = true;
      for (const p of pieces) {
        const el = p.el;
        if (!el) continue;
        if (elapsed < p.delay) {
          el.style.opacity = "0";
          allDown = false;
          continue;
        }
        p.vy += G * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.av * dt;
        el.style.opacity = "1";
        el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(${p.rot.toFixed(1)}deg)`;
        if (p.y < 1150) allDown = false;
      }
      if (!doneRef.current && elapsed > 900 && (allDown || elapsed > 4000)) {
        doneRef.current = true;
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(rafRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={splashRef}
      style={{
        position: "absolute",
        inset: 0,
        background: "#15161B",
        zIndex: 2,
        willChange: "opacity",
        transition: "opacity .55s ease",
      }}
    >
      <img
        src="/assets/welcome.svg"
        alt="Welcome to Rally"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          animation: "ryWelcomeIn .6s cubic-bezier(.2,.7,.2,1) both",
        }}
      />
      {defs.map((d, i) => (
        <img
          key={i}
          ref={(el) => { els.current[i] = el; }}
          src={d.src}
          alt=""
          width={d.w}
          height={d.h}
          style={{
            position: "absolute",
            left: d.launchX - d.w / 2,
            top: TOP_BASE - d.h / 2,
            opacity: 0,
            transform: "translate(0px,120px)",
            willChange: "transform,opacity",
            filter: "drop-shadow(0 8px 14px rgba(0,0,0,.35))",
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}

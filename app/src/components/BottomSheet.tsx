import type { CSSProperties, ReactNode } from "react";
import { color, easing } from "../styles/tokens";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Fixed percentage of the screen height. Omit to size to content instead
   *  (capped at 85% with its own scroll), for sheets whose content height varies. */
  heightPct?: number;
  children: ReactNode;
  zIndex?: number;
}

export function BottomSheet({ open, onClose, heightPct, children, zIndex = 16 }: BottomSheetProps) {
  const scrimStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,.55)",
    backdropFilter: "blur(2px)",
    opacity: open ? 1 : 0,
    pointerEvents: open ? "auto" : "none",
    transition: "opacity .3s",
    zIndex: zIndex - 1,
  };

  const sheetStyle: CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: heightPct != null ? `${heightPct}%` : undefined,
    maxHeight: heightPct != null ? undefined : "85%",
    overflowY: heightPct != null ? undefined : "auto",
    background: "#1c1f2e",
    borderTop: `1px solid ${color.borderAlt}`,
    borderRadius: "26px 26px 0 0",
    display: "flex",
    flexDirection: "column",
    transform: `translateY(${open ? "0" : "calc(100% + 60px)"})`,
    transition: `transform .38s ${easing.sheet}, visibility .38s`,
    boxShadow: color.bg ? "0 -20px 60px rgba(0,0,0,.5)" : undefined,
    zIndex,
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    visibility: open ? "visible" : "hidden",
    pointerEvents: open ? "auto" : "none",
  };

  return (
    <>
      <div style={scrimStyle} onClick={onClose} />
      <div style={sheetStyle} aria-hidden={!open} inert={!open}>
        <div style={{ width: 44, height: 5, borderRadius: 3, background: "#3a4160", margin: "14px auto 0", flexShrink: 0 }} />
        {children}
      </div>
    </>
  );
}

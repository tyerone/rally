import { NavLink } from "react-router-dom";
import { color } from "../styles/tokens";

interface Tab {
  to: string;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { to: "/home", label: "Home", icon: "/assets/nav-home.svg" },
  { to: "/challenges", label: "Challenges", icon: "/assets/nav-challenges.svg" },
  { to: "/map", label: "Map", icon: "/assets/nav-map.svg" },
  { to: "/league", label: "League", icon: "/assets/nav-league.svg" },
  { to: "/profile", label: "Profile", icon: "/assets/nav-profile.svg" },
];

export function BottomNav() {
  return (
    <div
      style={{
        flexShrink: 0,
        height: 82,
        background: color.surface,
        borderTop: `1px solid ${color.border}`,
        display: "flex",
        alignItems: "stretch",
        padding: "0 6px calc(14px + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            background: "none",
            border: 0,
            textDecoration: "none",
          }}
        >
          {({ isActive }) => (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 30 }}>
                <img
                  src={t.icon}
                  alt=""
                  style={{
                    maxWidth: 30,
                    maxHeight: 28,
                    width: "auto",
                    height: "auto",
                    display: "block",
                    transition: "filter .2s, opacity .2s",
                    filter: isActive ? "none" : "grayscale(1)",
                    opacity: isActive ? 1 : 0.5,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: isActive ? color.teal : color.navInactive,
                  letterSpacing: 0.2,
                }}
              >
                {t.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

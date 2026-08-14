import { Navigate, Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { useAppState } from "../state/AppStateContext";

export function AppLayout() {
  const { loading, loadError, session, tiers } = useAppState();
  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;

  if (loadError && tiers.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 24, textAlign: "center" }}>
        <span style={{ color: "#fff", fontSize: 16, fontWeight: 800 }}>Couldn't load Rally right now</span>
        <span style={{ color: "rgba(255,255,255,.5)", fontSize: 13.5, fontWeight: 700 }}>Check your connection and reload the app.</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ marginTop: 6, background: "#4FCBBB", color: "#15161B", border: 0, borderRadius: 12, padding: "10px 20px", fontWeight: 900, fontSize: 13, cursor: "pointer" }}
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <Outlet />
      <BottomNav />
    </div>
  );
}

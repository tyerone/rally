import { useNavigate } from "react-router-dom";
import { ChunkyButton } from "../components/ChunkyButton";

export function Login() {
  const navigate = useNavigate();

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", background: "#15161B" }}>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          animation: "ryLogoIn .7s cubic-bezier(.2,.7,.2,1) both",
        }}
      >
        <img src="/assets/rally-logo.svg" alt="Rally" width={60} height={49} style={{ display: "block" }} />
        <span style={{ fontWeight: 800, fontSize: 44, lineHeight: 1, color: "#4FCBBB", letterSpacing: -0.5 }}>rally</span>
      </div>

      <div
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "0 16px 40px",
          animation: "ryBtnsIn .7s .25s cubic-bezier(.2,.7,.2,1) both",
        }}
      >
        <ChunkyButton onClick={() => navigate("/onboarding")}>
          <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: 0.8, color: "#fff", textTransform: "uppercase" }}>
            Get started
          </span>
        </ChunkyButton>
        <ChunkyButton variant="secondary" onClick={() => navigate("/onboarding")}>
          <span style={{ fontWeight: 800, fontSize: 13.5, letterSpacing: 0.8, color: "rgba(255,255,255,.82)", textTransform: "uppercase" }}>
            I already have an account
          </span>
        </ChunkyButton>
      </div>
    </div>
  );
}

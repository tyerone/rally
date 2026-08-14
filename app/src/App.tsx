import { HashRouter, Route, Routes } from "react-router-dom";
import { AppStateProvider } from "./state/AppStateContext";
import { ToastProvider } from "./components/Toast";
import { AppLayout } from "./components/AppLayout";
import { Startup } from "./screens/Startup";
import { Login } from "./screens/Login";
import { Onboarding } from "./screens/Onboarding";
import { Home } from "./screens/Home";
import { Challenges } from "./screens/Challenges";
import { Leaderboard } from "./screens/Leaderboard";
import { Map } from "./screens/Map";
import { Profile } from "./screens/Profile";

export default function App() {
  return (
    <AppStateProvider>
      <HashRouter>
        <div className="ry-app-shell">
          <ToastProvider>
            <Routes>
              <Route path="/" element={<Startup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route element={<AppLayout />}>
                <Route path="/home" element={<Home />} />
                <Route path="/challenges" element={<Challenges />} />
                <Route path="/map" element={<Map />} />
                <Route path="/league" element={<Leaderboard />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Routes>
          </ToastProvider>
        </div>
      </HashRouter>
    </AppStateProvider>
  );
}

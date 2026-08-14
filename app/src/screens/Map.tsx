import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAppState } from "../state/AppStateContext";
import { useToast } from "../components/Toast";

import "./map.css";

// Tri-Cities, BC — the map's initial overview before a live position comes
// in. Not stored data, just a client display constant (adjust here if the
// event moves to a different area).
const MAP_CENTER: [number, number] = [49.278, -122.818];
const MAP_ZOOM = 13;

export function Map() {
  const { checkpoints, session, teams } = useAppState();
  const { ping } = useToast();
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const meMarkerRef = useRef<L.Marker | null>(null);
  const [myPosition, setMyPosition] = useState<[number, number] | null>(null);
  const hasCenteredOnMe = useRef(false);
  const myPositionRef = useRef<[number, number] | null>(null);

  const ownTeam = teams.find((t) => t.id === session?.teamId);

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView(MAP_CENTER, MAP_ZOOM);
    mapRef.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    meMarkerRef.current = L.marker(myPositionRef.current ?? MAP_CENTER, {
      icon: L.divIcon({
        className: "cp",
        html: '<div class="cp-me"><img src="/assets/nav-profile.svg" alt=""></div>',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      }),
      zIndexOffset: 400,
    })
      .addTo(map)
      .bindPopup(
        `<div class="pop-name">You & the crew</div><div class="pop-sub" style="color:#4FCBBB">${ownTeam?.name ?? "Your team"} · ${(ownTeam?.points ?? 0).toLocaleString()} pts</div>`
      );

    markersRef.current = checkpoints.map((c) => {
      const icon = L.divIcon({
        className: "cp",
        html: `<div class="cp-inner" style="background:${c.color}"><span>${c.n}</span></div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 36],
        popupAnchor: [0, -34],
      });
      return L.marker([c.lat, c.lng], { icon })
        .addTo(map)
        .bindPopup(`<div class="pop-name">${c.name}</div><div class="pop-sub" style="color:${c.color}">${c.n} challenges · ${c.area}</div>`);
    });

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpoints]);

  // Live geolocation — watches position continuously (not just a one-time
  // fix) so the marker actually tracks movement through the night.
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      ping("This browser doesn't support location — showing the default meetup point.", 3200);
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setMyPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          ping("Location access denied — enable it in your browser settings to see your live position.", 3200);
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the "me" marker as new fixes come in, and fly to it once the first
  // real fix arrives (until then the map shows the general event overview).
  useEffect(() => {
    myPositionRef.current = myPosition;
    if (!myPosition || !meMarkerRef.current) return;
    meMarkerRef.current.setLatLng(myPosition);
    if (!hasCenteredOnMe.current) {
      hasCenteredOnMe.current = true;
      mapRef.current?.flyTo(myPosition, 15, { duration: 0.8 });
    }
  }, [myPosition]);

  function flyToCheckpoint(i: number) {
    const c = checkpoints[i];
    mapRef.current?.flyTo([c.lat, c.lng], 15, { duration: 0.8 });
    markersRef.current[i]?.openPopup();
  }

  function recenter() {
    if (myPosition) mapRef.current?.flyTo(myPosition, 15, { duration: 0.8 });
    else mapRef.current?.flyTo(MAP_CENTER, MAP_ZOOM, { duration: 0.8 });
  }

  return (
    <div style={{ position: "relative", flex: 1, minHeight: 0, background: "#15161B" }}>
      <div ref={mapEl} style={{ position: "absolute", inset: 0, background: "#15161B" }} />

      {/* top overlay */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 500, padding: "18px 20px 26px", background: "linear-gradient(180deg,rgba(21,22,27,.92) 0%,rgba(21,22,27,.7) 55%,rgba(21,22,27,0) 100%)", pointerEvents: "none", textAlign: "center" }}>
        <div style={{ color: "#fff", fontSize: 22, fontWeight: 900, letterSpacing: -0.4 }}>Map</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4FCBBB", boxShadow: "0 0 0 3px rgba(79,203,187,.25)" }} />
          <span style={{ color: "rgba(255,255,255,.6)", fontSize: 13, fontWeight: 800 }}>{checkpoints.length} checkpoints live tonight</span>
        </div>
      </div>

      {/* recenter */}
      <button
        type="button"
        onClick={recenter}
        style={{ position: "absolute", right: 16, bottom: 302, zIndex: 500, width: 44, height: 44, borderRadius: 14, background: "#1b1e2b", border: "1px solid #2a3047", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.4)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3v2m0 14v2m9-9h-2M5 12H3" stroke="#4FCBBB" strokeWidth="2.2" strokeLinecap="round" /><circle cx="12" cy="12" r="5.5" stroke="#4FCBBB" strokeWidth="2.2" /><circle cx="12" cy="12" r="1.6" fill="#4FCBBB" /></svg>
      </button>

      {/* station list */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 500, height: 240, background: "#1b1e2b", borderTop: "1px solid #2a3047", borderRadius: "24px 24px 0 0", display: "flex", flexDirection: "column", boxShadow: "0 -16px 40px rgba(0,0,0,.45)" }}>
        <div style={{ flexShrink: 0, padding: "12px 20px 8px" }}>
          <div style={{ width: 44, height: 5, borderRadius: 3, background: "#3a4160", margin: "0 auto 14px" }} />
          <div style={{ color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: 800, letterSpacing: 1.1, textTransform: "uppercase" }}>Stations</div>
        </div>
        <div className="ry-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "2px 14px 16px", display: "flex", flexDirection: "column", gap: 9 }}>
          {checkpoints.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => flyToCheckpoint(i)}
              style={{ display: "flex", alignItems: "center", gap: 13, background: "#23273B", border: "1px solid #2a3047", borderRadius: 15, padding: "12px 14px", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${c.color}22` }}>
                <span style={{ color: c.color, fontSize: 17, fontWeight: 900 }}>{c.n}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#fff", fontSize: 15, fontWeight: 900 }}>{c.name}</div>
                <div style={{ color: "rgba(255,255,255,.5)", fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>{c.n} challenges · {c.area}</div>
              </div>
              <svg width="9" height="16" viewBox="0 0 11 18" fill="none"><path d="M1.5 1.5L9 9l-7.5 7.5" stroke="#5b6178" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

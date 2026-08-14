# Rally (PWA)

Rally is a mobile-first PWA built from the design references in `../` (the
parent `design_handoff_rally/` folder's `*.dc.html` files, `Map.html`, and
`README.md`). Stack: Vite + React + TypeScript, React Router, raw Leaflet for
the map, `vite-plugin-pwa` for the installable app shell, and Supabase for
the backend (Postgres, Auth, Storage, Realtime).

## Backend setup (one-time)

1. Create a Supabase project. From Settings -> API, copy the values into
   `app/.env.local` (copy `.env.local.example` first):
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```
2. Open the Supabase Dashboard's SQL Editor and run, in order:
   `supabase/migration.sql` then `supabase/seed.sql`. (`seed.sql` is
   generated from `src/data/tiers.ts` + `checkpoints.ts` — regenerate it with
   `node --experimental-strip-types scripts/gen-seed-sql.mjs` if that data
   ever changes.)
3. In Authentication -> Providers -> Phone, connect a Twilio account (SID,
   Auth Token, and a phone number capable of sending SMS). Trial Twilio
   accounts can only text pre-verified numbers until upgraded.
4. Import the real roster: get a CSV with Name/Team/Phone columns (Excel:
   File -> Save As -> CSV), then run
   ```
   node --experimental-strip-types --env-file=.env.local scripts/import-roster.mjs path/to/roster.csv
   ```
   with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Settings -> API) set
   in `.env.local` — see the comment at the top of that script. The
   service-role key is powerful (bypasses all row-level security) and should
   never be committed or put in a `VITE_`-prefixed variable.

See `supabase/migration.sql` for the full schema and the security model
(what's public vs. locked down) — it's commented throughout.

## Develop

```bash
npm install
npm run dev
```

## Build / preview

```bash
npm run build
npm run preview
```

`npm run build` also generates the service worker and precache manifest
(`dist/sw.js`).

## Structure

- `src/screens/` — one file per screen (Startup, Login, Onboarding, Home,
  Challenges, Leaderboard, Map, Profile).
- `src/services/api.ts` — the backend client. Every export is `async`; the
  screens only ever call these functions, never Supabase directly, so the
  data layer can change without touching UI code.
- `src/services/supabaseClient.ts` — the Supabase client instance.
- `src/state/AppStateContext.tsx` — app-wide session/progress state, wired to
  `services/api.ts`, plus the Realtime subscriptions that make the
  leaderboard and challenge "done" state update live across devices.
- `src/data/tiers.ts` + `checkpoints.ts` — kept only as the source
  `scripts/gen-seed-sql.mjs` generates `supabase/seed.sql` from; not imported
  by the app itself anymore.
- `src/components/` — shared UI: `ChunkyButton`, `BottomNav`, `BottomSheet`,
  `Toast`, plus hooks in `src/hooks/`.
- `src/styles/tokens.ts` — colors/radii/shadows/spacing ported from the design
  handoff's Design Tokens section.
- `supabase/migration.sql`, `supabase/seed.sql` — run once, see above.
- `scripts/import-roster.mjs`, `scripts/gen-seed-sql.mjs` — one-off local
  scripts, not part of the app build.

## Notes

- A challenge is completed **per team** — any teammate's submission counts
  for the whole team and is visible to the rest of them (not per-browser
  like a single-player demo would be).
- Submissions auto-approve on submit; there's no organizer review step.
- The leaderboard shows real teams/points only — the old mock's rank-delta
  arrows and promotion/demotion zone lines implied season/division history
  that doesn't exist as real data, so they're not carried over. Worth
  revisiting if that becomes a real feature (would need a points-history
  table).
- The Profile screen isn't in the original design bundle (the shared bottom
  nav has a 5th tab with no corresponding screen file), so it's a minimal
  addition built from the same design tokens as everything else.

# Handoff: Rally — City Challenge Event Companion App

## Overview
Rally is a mobile companion app for a city-wide, team-based challenge event (a "car rally" scavenger-hunt night). Teams complete challenges across independent tiers, earn points, race up a live league leaderboard, find checkpoints/stations on a city map, and complete time-limited "Quicktimes." The design targets a 440×956 mobile viewport and follows a **Duolingo-inspired design language**: chunky buttons with a 3D bottom "lip" shadow, rounded cards, a playful mascot, bold Nunito type, and a dark navy/charcoal theme with teal + purple + gold accents.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, **not production code to copy directly**. Most screens are authored as "Design Components" (`*.dc.html`) that depend on a small proprietary runtime (`support.js`); `Map.html` is plain HTML using Leaflet. Treat all of them as visual/behavioral specs.

The task is to **recreate these designs in the target codebase's environment** (React Native / Expo, Flutter, SwiftUI, a React PWA, etc.) using its established patterns, component library, and navigation. If no codebase exists yet, choose the most appropriate mobile framework (a React Native / Expo app is a natural fit for this PWA-style product) and implement the designs there. Do **not** ship the `.dc.html` files or `support.js` — they are a prototyping harness.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, shadows, and interactions are final and intended to be matched closely. Exact values are in **Design Tokens** below. The one exception is placeholder/sample data (team names, point totals, player name "Ty/Riley") — those are illustrative.

## Screens / Views

### 1. Startup / Intro animation (`Startup.dc.html`, also embedded in `Home.dc.html`)
- **Purpose**: Branded launch animation before the home dashboard appears.
- **Behavior**: A full-screen welcome splash (`assets/welcome.svg`) shows, then event icons are tossed up from the bottom edge one-at-a-time in quick succession (Fruit-Ninja style) with real gravity/arc physics, then the splash cross-fades (0.55s) into the dashboard.
- **Implementation note**: Physics loop uses gravity G=2300 px/s², ~150ms tempo between tosses, 15 pieces cycling through the `ic-*.svg` icon set at 1.3× scale. Reproduce with a requestAnimationFrame loop or the platform's animation system. Cross-fade completes when all pieces fall off-screen (or after a 4s safety timeout).

### 2. Onboarding (`Onboarding.dc.html`)
- **Purpose**: New/returning player setup.
- **Flow**: Name entry → roster search (find yourself on a team) → 2FA via SMS code → player-type selection (new vs returning) → info screens.
- **Layout**: Single-column, full-bleed. A persistent progress bar at top that **only ever advances** (never moves backward). Animated mascot present throughout.
- **Components**: Text inputs (rounded, dark fill), chunky primary CTA (teal), segmented/large choice cards for player type (`assets/ob-new-player.svg`, `assets/ob-returning-player.svg`).

### 3. Login (`Login.dc.html`)
- **Purpose**: Returning-user entry point.
- **Components**: Logo (`assets/rally-logo.svg`), input fields, teal primary button, secondary text link (link color = teal `#4FCBBB`).

### 4. Home / Dashboard (`Home.dc.html`)
- **Purpose**: Landing screen after intro; hub for the night.
- **Layout** (top → bottom): fixed header, scrollable body, fixed bottom nav.
  - **Header**: 60×60 circular avatar (teal fill `#4FCBBB`, 4px bottom-lip shadow `#37948A`) containing the profile glyph (`assets/nav-profile.svg`), beside a greeting — "Hey," (16px, weight 800, `rgba(255,255,255,.55)`) over the player name (30px, weight 900, muted).
  - **Stat row**: three inline stats centered — gem `ic-points.svg` + points (white), trophy `ic-trophy.svg` + league rank (gold `#F8C949`), progress `ic-challenges.svg` + "N of M" (teal). 18px weight-900 values.
  - **Next Station**: section label + a large chunky teal button showing a live **MM:SS countdown** (30px, weight 900, tabular-nums, white text on teal, 4px lip shadow).
  - **Quicktimes**: label + "N new" badge (purple `#9B82E6`), then a highlight card: bg `#272727`, 1px purple border `#7F60DC`, radius 16; title in light purple `#B9A6F0`, body in `#9B82E6`, and a **white** CTA button (dark text, 3px purple-tinted lip shadow) e.g. "COMPLETE QUICKTIME".
  - **Map preview**: tappable card previewing the map (label + "N stations live" + chevron + a soft radial-gradient tile area with `ic-map.svg`).
- **Bottom nav**: see Shared Bottom Nav.
- **Interactions**: taps fire a transient toast (pill, bottom-center, `#23273B` bg, 1px `#343A56` border, 1.6s auto-dismiss). Countdown ticks each second.

### 5. Challenges (`Challenges.dc.html`)
- **Purpose**: Browse and complete challenges across four **independent** tiers (no gating between tiers).
- **Tiers** (each with `id, name, tag, accent, icon, blurb, cards[]`):
  - **Rookie** — EASY, accent red `#FF6B6B`, `assets/tier-rookie.svg` (37 challenges)
  - **Ranger** — MEDIUM, accent tan `#E0A46B`, `assets/tier-ranger.svg`
  - **Star** — HARD, accent gold `#FED84D`, `assets/tier-star.svg`
  - **DD Luv** — SHOW LOVE, accent purple `#7F60DC`, `assets/tier-ddluv.svg` (11 challenges; pamper-the-designated-driver theme)
- **Card model**: `{ title, pts, ptsLabel?, meta, tag, desc }`. `pts` is the sortable/lower value; `ptsLabel` (e.g. "70-90") is shown when a range applies. Tiers are displayed **sorted by `pts` ascending**.
- **Tag pill**: colored from the tier's accent (`accent+"22"` bg, accent text) — not a per-tag color map.
- **Key mechanics** (reproduce these):
  - **Rolling preview**: each tier shows only the first 3 incomplete cards; completing one rolls the next in. A per-tier progress bar (accent fill) and "cleared" state when all done.
  - **"See all" sheet**: bottom sheet (80% height, rounded top, slides up 0.38s) with the tier header (icon in accent-tinted rounded square, name, "X of Y completed · tag", blurb) and the full card list.
  - **Hold-to-expand**: press-and-hold (~300ms) a card to toggle its description.
  - **Submission sheet**: 86% height sheet with tag pill, points, title, description, a proof-attachment control, and a submit button that is **gated** (disabled until proof attached). On submit, the tier's earned points **count up** with animation.
- **Section header** pattern: icon + name + tag pill + progress bar.

### 6. Leaderboard / League (`Leaderboard.dc.html`)
- **Purpose**: Live team ranking for the 2026 season ("Winner takes all").
- **Layout**: centered header with a standalone trophy icon (`assets/ic-trophy.svg`, gold drop-shadow); a "season ends in" chip; ranked list.
- **Row model**: `{ name, members, pts, color, delta, you? }`. Top 3 get medal badges (gold/silver/bronze circular). Each row: rank, team color avatar, name, "N racers", a **rank-delta** indicator (▲ teal `#4FCBBB` up / ▼ red `#E0576B` down / "–" neutral), and points. The **your-team** row is highlighted with a "YOU" tag (teal). Points **count up** on entry.
- **Zone dividers**: promotion/demotion lines (e.g. top-5 promote, bottom-2 drop) rendered above the row they label.

### 7. Map (`Map.html` — plain HTML + Leaflet)
- **Purpose**: City map of live "Stations" (checkpoints), centered on the Tri-Cities area (Coquitlam / Port Moody, BC; center ≈ 49.278, −122.818, zoom 13).
- **Map**: Leaflet + OpenStreetMap tiles, restyled to dark via CSS filter on tiles: `invert(1) hue-rotate(180deg) brightness(.82) contrast(.92) saturate(.45) grayscale(.4)`. (In a native app, use a proper dark map style / provider instead of a CSS filter.)
- **Markers**: teardrop pins (rounded 50%/4px, rotated 45°, 2.5px `#15161B` border, drop shadow) in the station's accent color, showing the challenge count; a "you are here" marker = the profile glyph in a teal ring with a pulsing halo. Tap a pin → popup (name, "N challenges · area"). 
- **Bottom sheet** ("Stations"): drag-handle, list of station rows (accent-tinted count square, name, "N challenges · area", chevron). Tapping a row `flyTo`s that station and opens its popup.
- **Recenter** button returns to the crew's location. Header title "Map" centered over a top gradient scrim.

## Shared Bottom Nav
Five tabs, fixed, 82px tall, bg `#1b1e2b`, 1px top border `#2a3047`, 14px bottom safe-area padding: **Home, Challenges, Map, League, Profile** (icons `assets/nav-home.svg`, `nav-challenges.svg`, `nav-map.svg`, `nav-league.svg`, `nav-profile.svg`). Active tab: icon full-color + label teal `#4FCBBB`; inactive: icon `grayscale(1)` at 0.5 opacity + label `#5b6178`. Labels 10.5px weight 800.

## Interactions & Behavior
- **Chunky button press**: on active, `translateY(3px)` and the bottom "lip" shadow collapses from `0 4px 0` to `0 1px 0` (primary) — the signature Duolingo tactile press. Secondary/white buttons use a 2–3px purple-tinted lip.
- **Toasts**: transient pill, fade + 8px rise, ~1.6s.
- **Bottom sheets**: transform translateY 100%→0 over 0.38s `cubic-bezier(.2,.8,.2,1)`; scrim fades in behind (`rgba(0,0,0,.55)`, slight blur).
- **Count-ups**: points animate from 0 to target over ~0.9s (ease-out cubic) — used on leaderboard load and on challenge submission.
- **Section entrances**: 0.5s translateY(14px)→0 fade, small stagger.
- **Progress bars**: width transitions 0.3s.
- **Countdown**: 1s tick, MM:SS, tabular-nums, stops at 0.

## State Management
- **Onboarding**: current step index (monotonic — progress bar never regresses), name, selected team/roster entry, SMS code, player type.
- **Challenges**: per-tier `done` set (completed card indices), rolling-preview pointer, expanded card id, open sheet (`null | "list" | "submit"`), active tier/card, proof-attached flag, animated displayed-points value.
- **Leaderboard**: teams list, animated count-up progress (0→1 drives displayed points), zone thresholds.
- **Home**: active tab, toast message, countdown seconds.
- **Map**: selected station, map camera (center/zoom).
- **Data**: currently hard-coded arrays (`TIERS`, `TEAMS`, `CHECKPOINTS`). In production these come from an API — model teams, tiers, challenges, submissions (with proof upload), checkpoints, and the season countdown.

## Design Tokens
**Colors**
- Background (app): `#15161B`
- Surfaces/cards: `#1b1e2b`, `#191a22`, `#23273B`; highlight card `#272727`
- Borders: `#2a3047`, `#343A56`, `#37464F`
- Primary teal: `#4FCBBB`; teal button lip/dark: `#37948A`; teal-hover: `#6fded0`
- Purple: `#7F60DC`; light purples `#9B82E6`, `#B9A6F0`, `#D0C4FF`
- Gold: `#F8C949` / `#F2C842` / `#FED84D`
- Tier accents: Rookie `#FF6B6B`, Ranger `#E0A46B`, Star `#FED84D`, DD Luv `#7F60DC`
- Semantic delta: up teal `#4FCBBB`, down red `#E0576B`
- Team sample colors: `#E0576B`, `#F0A500`, `#7F60DC`, `#4C9BE0`, `#4FCBBB`, `#E08A3C`, `#9B6BD6`, `#5BC0A8`, `#C7566B`, `#6E86C7`
- Text: primary `#fff`, secondary `rgba(255,255,255,.5–.6)`, tertiary/muted `rgba(255,255,255,.4)`, nav-inactive `#5b6178`

**Typography**
- Family: **Nunito** (weights 400/700/800/900), fallback system sans.
- Scale (approx): display/name 30 · screen title 22–24 · card title 16–18 · body 13.5–15 · meta/label 12–13 · nav label 10.5 · tag 10–11. Headings/values weight 900; labels/body 700–800. Tight letter-spacing on large headings (~−.3 to −.5px); wide (+.5 to +1.4px) on uppercase labels.

**Radius**: pills 22px · buttons 12–16px · cards 16–20px · sheets 26px top · avatars 50% · tier icon squares 13–15px.

**Shadows**
- Primary button lip: `0 4px 0 #37948A` (pressed `0 1px 0`).
- White button lip: `0 3px 0 rgba(127,96,220,.55)`.
- Sheets: `0 -20px 60px rgba(0,0,0,.5)`.
- Tossed icons / pins: `drop-shadow(0 8px 14px rgba(0,0,0,.35))`.

**Spacing**: base grid ~4px; common paddings 12/14/16/18/20/22/24/26; screen side gutters 16–24px.

## Assets
All in `assets/` (SVG). Copy into the target app or re-export as needed:
- **Brand**: `rally-logo.svg`, `welcome.svg`, `mascot.svg`
- **Nav**: `nav-home.svg`, `nav-challenges.svg`, `nav-map.svg`, `nav-league.svg`, `nav-profile.svg`
- **Tiers**: `tier-rookie.svg`, `tier-ranger.svg`, `tier-star.svg`, `tier-ddluv.svg` (DD Luv = purple steering-wheel-with-heart, created for this project)
- **Icons**: `ic-points.svg` (purple gem), `ic-trophy.svg`, `ic-challenges.svg` (green), `ic-quicktime.svg` (purple bolt), `ic-star.svg`, `ic-map.svg`, `ic-driver.svg`, `ic-rookie.svg`, `ic-ranger.svg`, `ic-swordblue.svg`, `ic-swordred.svg`
- **Onboarding**: `ob-new-player.svg`, `ob-returning-player.svg`
- Fonts: Nunito via Google Fonts.
- Map: Leaflet 1.9.4 + OpenStreetMap tiles (attribution required). Challenge/checkpoint copy is user-authored content.

## Files
Design references included in this bundle:
- `Onboarding.dc.html` — onboarding flow
- `Login.dc.html` — login
- `Home.dc.html` — home dashboard (also contains the intro animation logic)
- `Challenges.dc.html` — challenges + tiers + sheets
- `Leaderboard.dc.html` — league leaderboard
- `Map.html` — city/stations map (Leaflet, plain HTML)
- `assets/` — all SVG assets and glyphs
- `support.js` — **prototyping runtime only; do not port.** Present so the `.dc.html` files can be opened locally for reference.

## How to open the references locally
The `.dc.html` files and `Map.html` are static; serve the folder over any static server (e.g. `npx serve .`) and open each file. `Map.html` and the fonts need network access (Leaflet/OSM tiles, Google Fonts).

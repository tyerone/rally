# Handoff: Profile screen + Team create/join flow

## Overview
Adds a **Profile** screen to the Rally event-companion app. Beyond the usual profile
header + stats, its core new feature is **teams**: a user can **create a team** (and
receive a shareable 6-character invite code) or **join a team** by entering a code.
This document is self-sufficient — you can implement the feature from it alone.

## About the design files
`Profile.dc.html` in this folder is a **design reference built in HTML** — a working
prototype showing the intended look and behavior. It is **not** production code to copy.
Recreate it in the target codebase using that project's existing environment, patterns,
and component library (React/React Native, SwiftUI, Vue, etc.). If no environment exists
yet, pick the most appropriate framework and implement there. The other files in this
folder (Home, Challenges, Leaderboard, Map, Onboarding, Login) are the sibling screens
and establish the shared visual language + bottom nav — match them.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, shadows, and interactions are
final. Recreate pixel-for-pixel with the codebase's libraries. The design is a **440 × 956**
mobile frame (status bar + scroll body + fixed bottom nav).

---

## Screen: Profile

### Layout (top → bottom)
1. **Status bar** — 54px tall, `9:41` left, signal/wifi/battery glyphs right. (Use the OS
   status bar in a real app; it's faked here.)
2. **Scroll body** — `flex:1`, horizontal padding 16px, bottom padding 12px:
   - Profile header (avatar, name, team subline)
   - Stats row (3 cards)
   - "MY TEAM" section — **either** the no-team card **or** the team card
   - Settings list (single "Log out" row)
3. **Bottom nav** — fixed, 82px, 5 tabs; **Profile** active.
4. **Bottom sheet overlay** — create / created / join (slides up over everything).
5. **Toast** — transient confirmation pill near the bottom.

### Components

**Profile header** (centered)
- Avatar: 96×96 circle, fill `#4FCBBB`, bottom-lip shadow `0 5px 0 #37948A`, contains
  `nav-profile.svg` at 66×66.
- Name: `Riley Chen` — 24px, weight 900, color `#fff`, letter-spacing −0.4px, margin-top 14px.
- Subline: **the current team name**, or **`No Team Yet`** when the user is on no team —
  14px, weight 700, color `rgba(255,255,255,.45)`, margin-top 3px.

**Stats row** — 3 equal cards, gap 10px, each: bg `#1b1e2b`, 1px border `#2a3047`,
radius 16px, padding `13px 8px 11px`, column-centered, gap 6px. Each card = 24px-tall
icon + value (19px/900) + uppercase label (10px/800, `rgba(255,255,255,.42)`, ls .5px):
- Points — `ic-points.svg`, value `3,980` in `#4FCBBB`
- League — `ic-trophy.svg`, value `5th` in `#F8C949`
- Done — `ic-challenges.svg`, value `23` in `#fff`

**Section label** "My team" — 12px, weight 800, uppercase, ls 1.1px,
`rgba(255,255,255,.5)`, margin `26px 2px 12px`.

**No-team card** (shown when user has no team)
- Container: bg `#1b1e2b`, 1px border `#2a3047`, radius 20px, padding `24px 20px`, centered.
- `mascot.svg` at 84×84.
- Title `You're riding solo` — 18px/900/`#fff`, margin-top 12px.
- Body — 13.5px/700, `rgba(255,255,255,.5)`, line-height 1.5, max-width 270px:
  "Teams climb the league together. Start a crew and share the code, or hop into a friend's."
- **Create a team** button (primary): full width, bg `#4FCBBB`, text `#15161B`, radius 16px,
  padding 16px, 16px/900, shadow `0 4px 0 #37948A`. Active: `translateY(3px)` + shadow
  collapses to `0 1px 0 #37948A`. → opens **Create** sheet.
- **Join a team** button (secondary): full width, transparent bg, 1.5px border `#343A56`,
  text `#fff`, radius 16px, padding 15px, 15px/900. Active: `translateY(2px)`, bg `#20243550`.
  → opens **Join** sheet.

**Team card** (shown when user is on a team)
- Container: bg `#1b1e2b`, 1px border `#2a3047`, radius 20px, padding 20px.
- Header row: 52×52 rounded-square (radius 15px) team monogram — bg `#4FCBBB`, text `#15161B`,
  19px/900, shadow `0 3px 0 #37948A`; beside it the team name (19px/900/`#fff`, truncates) and
  a **role badge**:
  - Leader → bg `#4FCBBB22`, text `#4FCBBB`
  - Member → bg `#7F60DC22`, text `#B9A6F0`
  - 10.5px/900, uppercase, ls .6px, padding `3px 9px`, radius 7px.
- **Team-code row**: bg `#15161B`, **1px dashed** border `#3a4160`, radius 14px, padding
  `14px 16px`, flex. Left: "TEAM CODE" caption (10px/800/uppercase, `rgba(255,255,255,.4)`)
  + the code (22px/900/`#fff`, letter-spacing 3px, tabular-nums). Right: 42×42 copy button —
  bg `#23273B`, 1px border `#343A56`, radius 12px, teal copy glyph. Tap → copies code + toast
  `Code XXXXXX copied`.
- **Members**: caption `{n} of 6 racers` (11px/800/uppercase), then a wrapping row (gap 8px)
  of 42×42 circular monogram avatars, shadow `0 3px 0 rgba(0,0,0,.28)`. Avatar colors cycle:
  `#4FCBBB, #F0A500, #7F60DC, #4C9BE0, #E0576B, #E08A3C`.
- **Share invite code** button (primary, same style as Create) with a share glyph; on tap
  uses the Web Share API (`navigator.share`) if available, else copies an invite string and
  toasts `Invite link ready to share`.
- **Leave team** — text button, `#E0576B`, 14px/800, no bg. Tap → team = null, toast
  `You left the team`.

**Settings list** — bg `#1b1e2b`, 1px border `#2a3047`, radius 18px, overflow hidden. Rows
are full-width flex (label left, chevron right), padding `16px 18px`, 1px top divider `#2a3047`
between rows, active bg `#23273B`. Currently one row: **Log out**.

**Bottom nav** — 82px, bg `#1b1e2b`, 1px top border `#2a3047`, bottom padding 14px. Five tabs
(Home, Challenges, Map, League, Profile) — icon (`nav-*.svg`, ~30×28) over 10.5px/800 label.
Active tab (**Profile**) = full-color icon + label `#4FCBBB`; inactive = `grayscale(1)`,
opacity .5, label `#5b6178`. Icons: `nav-home.svg`, `nav-challenges.svg`, `nav-map.svg`,
`nav-league.svg`, `nav-profile.svg`.

---

## Bottom sheets (create / created / join)
A shared bottom sheet: scrim `rgba(0,0,0,.55)` (fade .28s), panel bg `#1b1e2b`, 1px top
border `#2a3047`, radius `26px 26px 0 0`, padding `14px 20px 24px`, shadow
`0 -12px 40px rgba(0,0,0,.5)`. Enters by `transform: translateY(104% → 0)` over .34s
`cubic-bezier(.2,.8,.2,1)`. A 44×5 grab-handle (`#343A56`, radius 3px) sits at top center.
Tapping the scrim closes the sheet. Only one sheet type renders at a time.

### 1. Create sheet
- Title `Create your team` (22px/900), body "Name your crew. You'll get a code to invite up
  to 6 racers." (14px/700/`rgba(255,255,255,.5)`).
- Label `TEAM NAME`, then a text input: bg `#15161B`, 1.5px border `#343A56`, radius 14px,
  padding `15px 16px`, 17px/800/`#fff`, placeholder `e.g. Loop Wolves`, **maxLength 22**.
  Auto-focus on open (~260ms after open to let the sheet settle).
- **Create team** button — primary style, **opacity .5 while name is empty/whitespace**
  (1 when non-empty). On tap with a valid name: generate a code, create the team as
  **Leader** with the user as sole member, and switch the sheet to **Created**.

### 2. Created sheet (leader)
- Success check in a 72×72 `#4FCBBB22` circle (pop-in animation).
- Title `Team created!`, body `{teamName} is ready to roll.`
- **Code display**: dashed box (`#15161B`, dashed `#3a4160`, radius 16px, padding 18px)
  with caption `SHARE THIS CODE` and the 6 characters each in its own tile — 38×52, bg
  `#1b1e2b`, 1px border `#343A56`, radius 11px, 26px/900/`#fff`, char-in stagger animation.
- **Share code** button (primary, share glyph) → same share behavior as the team card.
- **Copy code** button (secondary) → copies + toast.
- **Done** text button → closes sheet (returns to Profile, now showing the team card).

### 3. Join sheet
- Title `Join a team`, body "Enter the 6-character code your team leader shared with you."
- **6-box code input**: a row of 6 tiles (46×58, bg `#15161B`, radius 12px, 26px/900/`#fff`),
  with a single transparent `<input maxLength=6>` absolutely overlaid across all tiles so the
  whole row is one tap target and receives keystrokes. Auto-focus on open. Input is uppercased
  and stripped to `[A-Z0-9]`. Tile border reflects state: filled → `#4FCBBB`, next/cursor
  position → `#4FCBBB88`, empty → `#343A56`.
- Error line (reserved 16px height) `That code didn't match a team...` in `#E0576B`, shown
  only on a failed join.
- **Join team** button — primary, **opacity .5 until all 6 chars entered**. On tap: validate
  the code; on success join as **Member**, close sheet, toast `Welcome to {team}! 🏁`.

---

## Interactions & behavior
- **Create flow**: no-team card → Create sheet (name) → Created sheet (code + share) → Done →
  Profile shows team card with role **Leader**.
- **Join flow**: no-team card → Join sheet (6-char code) → success toast → Profile shows team
  card with role **Member**.
- **Copy**: `navigator.clipboard.writeText(code)`, confirmation toast.
- **Share**: `navigator.share({title, text})` when available, else clipboard fallback + toast.
- **Leave team**: clears the team, header subline reverts to `No Team Yet`, no-team card returns.
- Toasts auto-dismiss after ~1.9s.
- Button press feedback: primary buttons "depress" (translateY + shadow collapse); secondary
  buttons translateY + faint bg tint.
- Entrance animations: header slides down (`ryHdrIn`), sections stagger up (`rySecIn` at
  .05 / .1 / .12 / .16s), success check pops (`ryPop`), code tiles stagger in (`ryCharIn`).

## Code generation & validation (demo vs. production)
- **Prototype behavior**: code = 6 chars from the **unambiguous alphabet**
  `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `0/O/1/I`). Join accepts **any** full 6-char code;
  two seeded codes map to named crews — `LOOP42` → "Loop Wolves", `RALLY7` → "Redline Runners" —
  otherwise the joined team is named "The Cartographers".
- **In production**, replace the client-side stubs with a backend:
  - `POST /teams {name}` → server generates a unique, collision-checked code and returns
    `{teamId, code, role:"leader"}`.
  - `POST /teams/join {code}` → validate the code server-side; return the team + membership,
    or a 404/409 that drives the **error line**. Enforce the 6-member cap and duplicate-join
    rules on the server.
  - Keep codes case-insensitive and store uppercase; keep the unambiguous alphabet.

## State management
Local component state needed:
- `team` — `null` or `{ name, code, role: "Leader"|"Member", members: [{name}] }`
- `sheet` — `null | "create" | "created" | "join"`
- `teamNameDraft` — create input string
- `codeInput` — join input string (uppercased, ≤6)
- `joinError` — boolean, toggles the error line
- `toast` — transient message string
Derived: `noTeam = !team`, `hasTeam = !!team`, `nameReady`, `joinReady = codeInput.length===6`,
monograms from names, member avatar colors by index.
In production the team/membership lives on the server; fetch on mount and mutate via the
endpoints above.

## Design tokens
- **Backgrounds**: page `#15161B`; card/surface `#1b1e2b`; inset/well `#15161B`; raised
  control `#23273B`; toast `#2b3049`.
- **Borders**: `#2a3047` (cards), `#343A56` (controls/dashed sheet elements), `#3a4160`
  (dashed code boxes).
- **Brand teal**: `#4FCBBB`; teal shadow `#37948A`; teal tint `#4FCBBB22`.
- **Accents**: gold `#F8C949` / `#F0A500`; purple `#7F60DC`, light purple `#B9A6F0`, tint
  `#7F60DC22`; danger/red `#E0576B`; member palette `#4C9BE0`, `#E08A3C`.
- **Text**: `#fff`; muted `rgba(255,255,255,.5)`; fainter `rgba(255,255,255,.45/.42/.4)`;
  on-teal/on-light `#15161B`; inactive nav `#5b6178`.
- **Radii**: 11–16px controls/cards, 18–20px large cards, 26px sheet top corners, 50% avatars.
- **Shadows**: chunky button lip `0 4px 0 #37948A` (→ `0 1px 0` on press); avatar lip
  `0 3px 0 rgba(0,0,0,.28)`; sheet `0 -12px 40px rgba(0,0,0,.5)`; toast `0 8px 24px rgba(0,0,0,.4)`.
- **Type**: **Nunito** (weights 400/600/700/800/900), system-sans fallback. Sizes: 10–12px
  labels, 13.5–15px body, 16–17px buttons/inputs, 19px stats, 22–24px titles, 26px code chars.
- **Frame**: 440 × 956; horizontal content padding 16px; status bar 54px; bottom nav 82px.

## Assets (in `assets/`, all SVG)
- Nav: `nav-home.svg`, `nav-challenges.svg`, `nav-map.svg`, `nav-league.svg`, `nav-profile.svg`
  (also the profile avatar glyph).
- Stats: `ic-points.svg`, `ic-trophy.svg`, `ic-challenges.svg`.
- No-team illustration: `mascot.svg`.
- Copy icon, share icon, success check, and chevrons are **inline SVG** in the markup (no files).
Re-export or substitute with the codebase's own icon set as appropriate.

## Files
- `Profile.dc.html` — the Profile screen prototype (this feature). Markup is inline-styled;
  behavior lives in the `<script type="text/x-dc">` logic class at the bottom (`renderVals()`
  returns all the computed styles/handlers).
- Sibling screens for shared language & nav: `Home.dc.html`, `Challenges.dc.html`,
  `Leaderboard.dc.html`, `Map.html`, `Onboarding.dc.html`, `Login.dc.html`.
- `README.md` — the overall Rally handoff.

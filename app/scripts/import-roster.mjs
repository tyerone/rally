// One-off roster import: reads a CSV (Name + Phone columns, any order/
// casing; a Team column is optional) and upserts teams + players into
// Supabase. Run locally, once, with your OWN service-role key — that key
// must never be shared or committed:
//
//   node --experimental-strip-types --env-file=.env.local scripts/import-roster.mjs ../roster.csv
//
// .env.local needs:
//   SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY=eyJ...        (Settings -> API -> service_role)
//
// To get a CSV from Excel: File -> Save As -> CSV (Comma delimited).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { teamColors } from "../src/styles/tokens.ts";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node --experimental-strip-types --env-file=.env.local scripts/import-roster.mjs <path-to-roster.csv>");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (see the comment at the top of this file).");
  process.exit(1);
}

// --- minimal RFC4180-ish CSV parser: handles quoted fields, escaped quotes,
// commas inside quotes, and both \n and \r\n line endings. Good enough for
// a spreadsheet export; not meant as a general-purpose CSV library. ---
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\n") {
      pushRow();
    } else if (c === "\r") {
      // skip, \n handles the row break
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function findCol(headers, candidates) {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const cand of candidates) {
    const idx = lower.indexOf(cand);
    if (idx !== -1) return idx;
  }
  return -1;
}

// Normalizes to E.164, assuming North American numbers when no country code
// is present (the event is in the Tri-Cities, BC). Adjust here if needed.
function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, "");
  if (raw.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

const text = readFileSync(csvPath, "utf8");
const rows = parseCsv(text);
if (rows.length < 2) {
  console.error("CSV looks empty (need a header row + at least one data row).");
  process.exit(1);
}

const headers = rows[0];
const nameCol = findCol(headers, ["name", "full name", "player", "player name"]);
const teamCol = findCol(headers, ["team", "team name"]); // optional
const phoneCol = findCol(headers, ["phone", "phone number", "cell", "mobile"]);

if (nameCol === -1 || phoneCol === -1) {
  console.error(`Couldn't find name/phone columns in header row: ${headers.join(", ")}`);
  console.error("Rename your columns to something like Name / Phone and try again.");
  process.exit(1);
}
if (teamCol === -1) {
  console.log("No Team column found — importing everyone with no team assigned yet.");
}

const entries = [];
const badRows = [];
for (const r of rows.slice(1)) {
  const name = (r[nameCol] || "").trim();
  const team = teamCol === -1 ? "" : (r[teamCol] || "").trim();
  const phoneRaw = (r[phoneCol] || "").trim();
  const phone = normalizePhone(phoneRaw);
  if (!name || !phone) {
    badRows.push({ name, team, phoneRaw });
    continue;
  }
  entries.push({ name, team: team || null, phone });
}

if (badRows.length) {
  console.warn(`Skipping ${badRows.length} row(s) with missing/unparseable name or phone:`);
  for (const b of badRows) console.warn(`  ${JSON.stringify(b)}`);
}
if (!entries.length) {
  console.error("No valid rows to import.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const teamNames = [...new Set(entries.map((e) => e.team).filter(Boolean))];
console.log(`Found ${teamNames.length} team(s), ${entries.length} player(s). Upserting teams...`);

const teamIdByName = {};
for (let i = 0; i < teamNames.length; i++) {
  const name = teamNames[i];
  const color = teamColors[i % teamColors.length];
  const { data, error } = await supabase
    .from("teams")
    .upsert({ name, color }, { onConflict: "name" })
    .select("id, name")
    .single();
  if (error) {
    console.error(`Failed to upsert team "${name}":`, error.message);
    process.exit(1);
  }
  teamIdByName[data.name] = data.id;
}

console.log("Upserting players...");
let ok = 0;
for (const e of entries) {
  const { error } = await supabase
    .from("players")
    .upsert({ name: e.name, phone: e.phone, team_id: e.team ? teamIdByName[e.team] : null }, { onConflict: "phone" });
  if (error) {
    console.error(`Failed to upsert player "${e.name}" (${e.phone}):`, error.message);
    continue;
  }
  ok++;
}

console.log(`Done. ${ok}/${entries.length} players imported${teamNames.length ? ` across ${teamNames.length} teams` : " with no team assigned"}.`);

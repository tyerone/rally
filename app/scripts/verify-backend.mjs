// Quick read-only sanity check against the live Supabase project, using the
// public anon client (same as the browser app) — confirms RLS lets through
// what it should, and blocks what it shouldn't.
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, anonKey);

const { data: tiers, error: tiersErr } = await supabase.from("tiers").select("id, name").order("order_index");
console.log("tiers:", tiersErr ? `ERROR ${tiersErr.message}` : tiers.map((t) => t.id).join(", "));

const { count: challengeCount, error: chErr } = await supabase.from("challenges").select("id", { count: "exact", head: true });
console.log("challenges count:", chErr ? `ERROR ${chErr.message}` : challengeCount);

const { count: checkpointCount, error: cpErr } = await supabase.from("checkpoints").select("id", { count: "exact", head: true });
console.log("checkpoints count:", cpErr ? `ERROR ${cpErr.message}` : checkpointCount);

const { data: roster, error: rosterErr } = await supabase.from("players_public").select("id, name, team_name, phone_last4").ilike("name", "%maya%");
console.log("roster search 'maya':", rosterErr ? `ERROR ${rosterErr.message}` : JSON.stringify(roster));

// This should be BLOCKED by RLS — players.phone must not be readable via anon.
const { data: phones, error: phoneErr } = await supabase.from("players").select("phone").limit(1);
console.log("direct players.phone select (should be empty/blocked):", phoneErr ? `ERROR ${phoneErr.message}` : JSON.stringify(phones));

const { data: teams, error: teamsErr } = await supabase.from("team_points").select("team_id, name, points").limit(5);
console.log("team_points:", teamsErr ? `ERROR ${teamsErr.message}` : JSON.stringify(teams));

/**
 * Diagnostic: which businesses have a town-ish `location` text but
 * nearby_town_id IS NULL? Those are the ones falling into "at resort"
 * by accident — fixing them is just stamping the FK from the text.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function main() {
  const { data: towns } = await admin.from("nearby_towns").select("id, name");
  const townIdByName = new Map<string, string>();
  for (const t of towns ?? []) townIdByName.set((t.name as string).toLowerCase(), t.id as string);

  const { data: bizs } = await admin
    .from("business_profiles")
    .select(
      "id, business_name, location, nearby_town_id, operates_in_town, resort_id"
    )
    .is("nearby_town_id", null)
    .not("location", "is", null);

  const candidates: Array<{
    id: string;
    name: string;
    location: string;
    inferredTownId: string;
    inferredTownName: string;
  }> = [];

  for (const b of bizs ?? []) {
    const loc = (b.location as string | null)?.trim();
    if (!loc) continue;
    // Try a few normalisations: full string, first comma-separated chunk.
    const trials = [loc, loc.split(",")[0]].map((s) => s.trim().toLowerCase());
    for (const trial of trials) {
      const townId = townIdByName.get(trial);
      if (townId) {
        candidates.push({
          id: b.id as string,
          name: b.business_name as string,
          location: loc,
          inferredTownId: townId,
          inferredTownName: trial,
        });
        break;
      }
    }
  }

  console.log(`\nBusinesses with location text matching a town but NULL nearby_town_id: ${candidates.length}\n`);
  for (const c of candidates) {
    console.log(`  ${c.name.padEnd(45)} location="${c.location}" → ${c.inferredTownName}`);
  }

  // Also show businesses with nearby_town_id ALREADY set, for context.
  const { data: setBizs, count } = await admin
    .from("business_profiles")
    .select("id, business_name, nearby_town_id", { count: "exact", head: false })
    .not("nearby_town_id", "is", null);
  console.log(`\nFor reference: ${count ?? 0} businesses already have nearby_town_id set.`);
  for (const b of setBizs ?? []) {
    console.log(`  ${(b.business_name as string).padEnd(45)} nearby_town_id=${(b.nearby_town_id as string).slice(0, 8)}…`);
  }
}
main();

/**
 * One-shot backfill: stamp business_profiles.nearby_town_id when the
 * `location` text unambiguously matches a known nearby town name.
 *
 *   npx tsx scripts/backfill-business-town-fk.ts            # dry run
 *   npx tsx scripts/backfill-business-town-fk.ts --write    # apply
 *
 * Only runs against rows with NULL nearby_town_id, so it can be re-run
 * safely without overwriting deliberately-set FKs.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const WRITE = process.argv.includes("--write");

async function main() {
  const { data: towns } = await admin.from("nearby_towns").select("id, name");
  const townIdByName = new Map<string, string>();
  for (const t of towns ?? []) townIdByName.set((t.name as string).toLowerCase(), t.id as string);

  const { data: bizs } = await admin
    .from("business_profiles")
    .select("id, business_name, location, nearby_town_id")
    .is("nearby_town_id", null)
    .not("location", "is", null);

  type Plan = { id: string; name: string; location: string; townId: string; townName: string };
  const plan: Plan[] = [];
  const skipped: { name: string; location: string; reason: string }[] = [];

  for (const b of bizs ?? []) {
    const loc = (b.location as string | null)?.trim();
    if (!loc) continue;
    // Try the full string first, then the first comma-separated chunk.
    // We deliberately don't fuzzy-match — only exact (case-insensitive)
    // hits get backfilled, so "Snowy Mountains, NSW" stays untouched
    // rather than being guessed at.
    const trials = [loc, loc.split(",")[0]].map((s) => s.trim().toLowerCase());
    let matched: string | null = null;
    let matchedKey = "";
    for (const trial of trials) {
      const id = townIdByName.get(trial);
      if (id) {
        matched = id;
        matchedKey = trial;
        break;
      }
    }
    if (matched) {
      plan.push({
        id: b.id as string,
        name: b.business_name as string,
        location: loc,
        townId: matched,
        townName: matchedKey,
      });
    } else {
      skipped.push({ name: b.business_name as string, location: loc, reason: "no town name match" });
    }
  }

  console.log(`Mode: ${WRITE ? "WRITE" : "DRY RUN"}`);
  console.log(`\nWill update ${plan.length} businesses:`);
  for (const p of plan) {
    console.log(`  ${p.name.padEnd(45)} → ${p.townName}`);
  }

  if (skipped.length > 0) {
    console.log(`\nSkipped (no exact town-name match — fix manually if needed):`);
    for (const s of skipped) {
      console.log(`  ${s.name.padEnd(45)} location="${s.location}"`);
    }
  }

  if (!WRITE) {
    console.log(`\nDry run only. Re-run with --write to apply.`);
    return;
  }

  if (plan.length === 0) return;

  let ok = 0;
  let fail = 0;
  for (const p of plan) {
    const { error } = await admin
      .from("business_profiles")
      .update({ nearby_town_id: p.townId })
      .eq("id", p.id)
      .is("nearby_town_id", null); // race-safety
    if (error) {
      console.log(`  ✗ ${p.name}: ${error.message}`);
      fail++;
    } else {
      ok++;
    }
  }
  console.log(`\nDone — ${ok} updated, ${fail} failed.`);
}
main();

/**
 * One-shot diagnostic: dump every resort currently in the DB grouped
 * by country, so we can diff against the new master list of resorts
 * the user wants on the platform and only add what's missing.
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
  const { data: resorts } = await admin
    .from("resorts")
    .select("legacy_id, name, country, state_province")
    .order("country")
    .order("name");

  const byCountry = new Map<string, { name: string; legacy_id: string; state: string | null }[]>();
  for (const r of resorts ?? []) {
    const key = (r.country as string) ?? "(no country)";
    if (!byCountry.has(key)) byCountry.set(key, []);
    byCountry.get(key)!.push({
      name: r.name as string,
      legacy_id: r.legacy_id as string,
      state: (r.state_province as string | null) ?? null,
    });
  }

  console.log(`Total resorts in DB: ${resorts?.length ?? 0}\n`);
  for (const [country, items] of [...byCountry.entries()].sort()) {
    console.log(`${country.toUpperCase()} (${items.length})`);
    const byState = new Map<string, typeof items>();
    for (const it of items) {
      const key = it.state ?? "(no state)";
      if (!byState.has(key)) byState.set(key, []);
      byState.get(key)!.push(it);
    }
    for (const [state, list] of [...byState.entries()].sort()) {
      console.log(`  ${state}:`);
      for (const it of list.sort((a, b) => a.name.localeCompare(b.name))) {
        console.log(`    [${it.legacy_id.padStart(3)}] ${it.name}`);
      }
    }
    console.log();
  }
}
main();

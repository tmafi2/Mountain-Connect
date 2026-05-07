/**
 * One-off: fix the "Jindbayne" typo on Lake Jindabyne Hotel and stamp
 * its nearby_town_id at the same time. Skipped by the generic
 * auto-resolver because exact-match-only is safer; this is the
 * deliberate-correction path.
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
  const { data: town } = await admin
    .from("nearby_towns")
    .select("id")
    .ilike("name", "Jindabyne")
    .single();
  if (!town) {
    console.error("Jindabyne town row not found");
    process.exit(1);
  }

  const { data: biz } = await admin
    .from("business_profiles")
    .select("id, business_name, location, nearby_town_id")
    .ilike("business_name", "Lake Jindabyne Hotel")
    .maybeSingle();
  if (!biz) {
    console.error("Lake Jindabyne Hotel not found");
    process.exit(1);
  }

  console.log(`Before: location="${biz.location}", nearby_town_id=${biz.nearby_town_id ?? "null"}`);

  const { error } = await admin
    .from("business_profiles")
    .update({ location: "Jindabyne, NSW", nearby_town_id: town.id })
    .eq("id", biz.id);
  if (error) {
    console.error("Update failed:", error.message);
    process.exit(1);
  }
  console.log(`After: location="Jindabyne, NSW", nearby_town_id=${town.id}`);
}
main();

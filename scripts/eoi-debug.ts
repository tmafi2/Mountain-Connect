import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
async function main() {
  const { data: bizs } = await admin
    .from("business_profiles")
    .select(
      "id, business_name, email, claim_token, is_claimed, first_applicant_email_sent_at, eoi_nudge_sent_at, dormancy_warning_sent_at, created_at"
    )
    .eq("is_claimed", false)
    .order("created_at", { ascending: false });
  console.log(`\nTotal unclaimed businesses: ${bizs?.length ?? 0}\n`);
  if (!bizs?.length) return;
  const ids = bizs.map((b) => b.id);
  const { data: eois } = await admin
    .from("expressions_of_interest")
    .select("id, job_posts!inner(business_id)")
    .in("job_posts.business_id", ids);
  const counts = new Map<string, number>();
  for (const e of (eois ?? []) as Array<{ job_posts: { business_id: string } }>) {
    const bid = e.job_posts.business_id;
    counts.set(bid, (counts.get(bid) ?? 0) + 1);
  }
  console.log(
    "Business".padEnd(45),
    "Email".padEnd(35),
    "EOIs".padEnd(5),
    "1st",
    "5+ ",
    "Dor"
  );
  console.log("─".repeat(110));
  for (const b of bizs) {
    const eoi = counts.get(b.id) ?? 0;
    const f1 = b.first_applicant_email_sent_at ? "✓" : "·";
    const f5 = b.eoi_nudge_sent_at ? "✓" : "·";
    const fd = b.dormancy_warning_sent_at ? "✓" : "·";
    console.log(
      (b.business_name ?? "?").slice(0, 43).padEnd(45),
      (b.email ?? "(none)").slice(0, 33).padEnd(35),
      String(eoi).padEnd(5),
      f1.padEnd(3),
      f5.padEnd(3),
      fd.padEnd(3)
    );
  }
  const totalEois = [...counts.values()].reduce((a, b) => a + b, 0);
  console.log(`\nTotal EOIs across unclaimed businesses: ${totalEois}`);

  // Also: are there EOIs whose job_post points to a CLAIMED business?
  const { count: allEoiCount } = await admin
    .from("expressions_of_interest")
    .select("id", { count: "exact", head: true });
  console.log(`Total EOIs in DB (all): ${allEoiCount}`);

  // Also count APPLICATIONS for unclaimed businesses — there shouldn't
  // be any (the apply button on unclaimed listings goes through EOI),
  // but historic data or bugs could leave some.
  const { data: apps } = await admin
    .from("applications")
    .select("id, job_posts!inner(business_id)")
    .in("job_posts.business_id", ids);
  const appCounts = new Map<string, number>();
  for (const a of (apps ?? []) as Array<{ job_posts: { business_id: string } }>) {
    const bid = a.job_posts.business_id;
    appCounts.set(bid, (appCounts.get(bid) ?? 0) + 1);
  }
  const unclaimedWithApps = bizs.filter((b) => (appCounts.get(b.id) ?? 0) > 0);
  console.log(`\nUnclaimed businesses with rows in 'applications' table: ${unclaimedWithApps.length}`);
  for (const b of unclaimedWithApps) {
    console.log(`  - ${(b.business_name ?? "?").padEnd(45)} ${appCounts.get(b.id)} applications`);
  }

  // Top businesses by APPLICATIONS regardless of claimed state — what
  // the user might be looking at in the admin UI.
  const { data: allApps } = await admin
    .from("applications")
    .select("id, job_posts(business_id, business_profiles(business_name, is_claimed))");
  const allAppCounts = new Map<string, { name: string; claimed: boolean; count: number }>();
  for (const a of (allApps ?? []) as Array<{ job_posts: { business_id: string; business_profiles: { business_name: string; is_claimed: boolean } } }>) {
    const jp = a.job_posts;
    if (!jp?.business_id || !jp.business_profiles) continue;
    const cur = allAppCounts.get(jp.business_id) ?? { name: jp.business_profiles.business_name, claimed: jp.business_profiles.is_claimed, count: 0 };
    cur.count++;
    allAppCounts.set(jp.business_id, cur);
  }
  const topApps = [...allAppCounts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10);
  console.log(`\nTop 10 businesses by APPLICATIONS (any claim state):`);
  for (const [, info] of topApps) {
    console.log(`  - ${info.name.padEnd(45)} ${String(info.count).padStart(4)}  ${info.claimed ? "claimed" : "UNCLAIMED"}`);
  }
}
main();

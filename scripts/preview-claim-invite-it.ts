import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { importOutreachItEmail } from "../lib/email/templates/import-outreach-it";
import { coverLetterExcerpt } from "../lib/email/cover-letter-excerpt";

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

  const { data: rs } = await db.from("resorts").select("id").eq("country", "Italy");
  const ids = (rs ?? []).map((r) => r.id as string);
  const { data: jobs } = await db
    .from("job_posts")
    .select("id, title, business_id, business_profiles!inner(id, business_name, email, is_claimed, claim_token)")
    .eq("status", "active").in("resort_id", ids);

  type B = { id: string; name: string; email: string; token: string; titles: string[]; jobIds: string[] };
  const map = new Map<string, B>();
  for (const row of jobs ?? []) {
    const b = row.business_profiles as any;
    if (!b || b.is_claimed || !b.email || !b.claim_token) continue;
    const e = map.get(b.id);
    if (e) { e.titles.push(row.title); e.jobIds.push(row.id); }
    else map.set(b.id, { id: b.id, name: b.business_name ?? "", email: b.email, token: b.claim_token, titles: [row.title], jobIds: [row.id] });
  }
  const { data: eois } = await db.from("expressions_of_interest")
    .select("job_post_id, message, share_with_employer, created_at")
    .in("job_post_id", [...map.values()].flatMap((b) => b.jobIds))
    .order("created_at", { ascending: false });
  const per = new Map<string, number>();
  const ex = new Map<string, string>();
  for (const e of eois ?? []) {
    const k = e.job_post_id as string;
    per.set(k, (per.get(k) ?? 0) + 1);
    if (!ex.has(k)) {
      const q = coverLetterExcerpt({ message: e.message as string | null, consent: e.share_with_employer as boolean | null });
      if (q) ex.set(k, q);
    }
  }

  const recips = [...map.values()].map((b) => ({ ...b, applicants: b.jobIds.reduce((n, id) => n + (per.get(id) ?? 0), 0), excerpt: b.jobIds.map((id) => ex.get(id)).find(Boolean) }))
    .sort((a, b) => b.applicants - a.applicants);

  const build = (r: typeof recips[number]) => importOutreachItEmail({
    businessName: r.name, source: "Facebook",
    claimUrl: `https://www.mountainconnects.com/claim/${r.token}`,
    eoiCount: r.applicants, coverLetterExcerpt: r.excerpt, otherListings: r.titles.length - 1,
  });

  const shapeOf = (r: typeof recips[number]) =>
    `${r.titles.length > 1 ? "several listings" : "one listing"} · ${r.applicants > 0 ? "has applicants" : "no applicants"}`;
  const seen = new Set<string>();
  const samples = recips.filter((r) => { const k = shapeOf(r); if (seen.has(k)) return false; seen.add(k); return true; });

  const rows = recips.map((r) => `<tr><td>${r.name}</td><td class="n">${r.titles.length}</td><td class="n">${r.applicants}</td><td>${build(r).subject}</td></tr>`).join("");

  const page = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>What the 27 receive</title>
  <style>body{margin:0;background:#dde5ee;font-family:-apple-system,system-ui,sans-serif;color:#0a1e33}
  .w{max-width:900px;margin:0 auto;padding:24px 16px}
  h1{font-size:22px;margin:0 0 4px}.sub{color:#4e5d6c;font-size:14px;margin:0 0 20px}
  table{width:100%;border-collapse:collapse;background:#fff;font-size:13px;margin-bottom:8px}
  th,td{text-align:left;padding:7px 10px;border-bottom:1px solid #e3eaf2}
  th{background:#f3f7fb;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#4e5d6c}
  td.n{text-align:right;font-variant-numeric:tabular-nums;width:64px}
  .lbl{max-width:640px;margin:30px auto 4px;font-size:14px;font-weight:700}
  .subject{max-width:640px;margin:0 auto 12px;padding:9px 14px;background:#fff;border-left:3px solid #1d6a4f;font-size:13px}
  iframe{display:block;width:100%;max-width:672px;margin:0 auto;border:0;height:1120px;background:#f0f4f8}</style>
  </head><body><div class="w">
  <h1>What each of the 27 actually receives</h1>
  <p class="sub">Real business names, real listing counts, real application counts, real subject lines — generated from production now.</p>
  <table><thead><tr><th>Business</th><th class="n">Listings</th><th class="n">Applicants</th><th>Oggetto</th></tr></thead><tbody>${rows}</tbody></table>
  </div>
  ${samples.map((r) => `<p class="lbl">${shapeOf(r)} — ${r.name}</p><p class="subject"><strong>Oggetto:</strong> ${build(r).subject}</p><iframe srcdoc="${build(r).html.replace(/"/g, "&quot;")}"></iframe>`).join("")}
  </body></html>`;

  writeFileSync(process.argv[2], page);
  console.log(`${recips.length} recipients, ${samples.length} distinct shapes:`);
  for (const s of samples) console.log(`  ${shapeOf(s).padEnd(34)} ${s.name}`);
  console.log("\nwith applicants:", recips.filter((r) => r.applicants > 0).length, "· without:", recips.filter((r) => r.applicants === 0).length);

}
main().catch((e) => { console.error(e); process.exit(1); });

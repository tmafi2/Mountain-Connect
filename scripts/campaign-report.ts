/**
 * What the Go For A Season campaign is actually doing.
 *
 *   npx tsx scripts/campaign-report.ts            # last 7 days
 *   npx tsx scripts/campaign-report.ts --days 30
 *   npx tsx scripts/campaign-report.ts --json     # for a scheduled check
 *
 * Read-only.
 *
 * ⚠️ IT READS THE CONSENT-FREE TABLES, AND THAT IS THE WHOLE POINT. GA4 and
 * the Meta Pixel only load once the cookie banner is accepted, and almost
 * nobody accepts it: over 23-24 Sept 2026 the server-side counter saw 117
 * real people on the landing page while GA4 saw 7. Every funnel rate taken
 * from GA4 therefore describes the ~6% most engaged visitors. `campaign_visits`
 * (migration 00105) and `campaign_events` (00106) are written server-side and
 * need no consent, so they are the only honest denominators we have.
 *
 * ⚠️ SPEND IS NOT IN THE DATABASE AND NOTHING IN THIS REPO CAN READ IT.
 * Meta Ads Manager is the only source. This report can tell you how many
 * people arrived and what they did; it can NEVER tell you cost per signup.
 * Ask Tyler for the spend and divide by `signups.attributed`.
 *
 * ⚠️ EVENT COUNTS ARE NOT PEOPLE. 00105/00106 deliberately store no IP, no
 * cookie and no session id, so nothing joins one visitor's events together.
 * "90 started the quiz" is 90 events, not 90 humans — a rate here is a ratio
 * of counts, which is the right shape for comparing days or ads, and the
 * wrong shape for claiming a per-person conversion rate.
 *
 * ⚠️ `signups` IS THE ONE REAL PER-PERSON NUMBER, because an account is a
 * person. It comes from auth.users.raw_user_meta_data (signup_source /
 * signup_utm), which survives the confirmation email opening in another
 * browser — unlike anything client-side.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) {
  if (!process.env[name]?.trim()) {
    // Names only; no value is ever printed.
    console.error(`Missing ${name} in .env.local`);
    process.exit(1);
  }
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const argDays = process.argv.indexOf("--days");
const DAYS = argDays > -1 ? Math.max(1, Number(process.argv[argDays + 1]) || 7) : 7;
const AS_JSON = process.argv.includes("--json");
const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();

/** Paged — a plain select stops at 1000 rows with no error. */
async function all<T>(table: string, cols: string, filter: (q: any) => any): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filter(db.from(table).select(cols)).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return rows;
  }
}

interface Visit {
  utm_source: string | null; utm_medium: string | null;
  utm_campaign: string | null; utm_content: string | null;
  in_app_browser: boolean | null; likely_bot: boolean | null; created_at: string;
}
interface Ev { event: string; placement: string | null; destination: string | null; created_at: string }

(async () => {
  const visits = await all<Visit>("campaign_visits", "*", (q) => q.gte("created_at", since));
  const events = await all<Ev>("campaign_events", "event, placement, destination, created_at", (q) =>
    q.gte("created_at", since),
  );

  // ⚠️ "Ad traffic" means a utm_source is present. Organic and bot visits
  // share this table, and mixing them is how a campaign looks like it is
  // working when nothing has been spent yet.
  const real = visits.filter((v) => !v.likely_bot);
  const ad = real.filter((v) => !!v.utm_source);
  const count = (name: string) => events.filter((e) => e.event === name).length;

  const funnel = {
    views: count("go_for_a_season_view"),
    quizStarted: count("find_my_season_started"),
    quizCompleted: count("find_my_season_completed"),
    signupClicked: count("worker_signup_clicked"),
    jobsClicked: count("browse_jobs_clicked"),
    signupCompleted: count("worker_signup_completed"),
  };

  // The per-person truth, straight off the accounts.
  //
  // ⚠️ PAGED, AND THAT IS NOT PEDANTRY HERE. listUsers caps at 1000 per page
  // and returns oldest first, so the NEWEST accounts sit on the LAST page.
  // A single unpaged call works until the 1000th account and then starts
  // reporting zero campaign signups — the one number this report exists to
  // produce, failing in the direction that reads as "the campaign did
  // nothing". 465 accounts today, so this is a trap waiting rather than a
  // bug, and a successful campaign is what springs it.
  const recent: Array<{ created_at: string; user_metadata: Record<string, unknown> | null }> = [];
  const PER_PAGE = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw new Error(`auth.users: ${error.message}`);
    const batch = data?.users ?? [];
    for (const u of batch) {
      if (u.created_at >= since) {
        recent.push({ created_at: u.created_at, user_metadata: u.user_metadata ?? null });
      }
    }
    if (batch.length < PER_PAGE) break;
    if (page > 100) throw new Error("auth.users: refusing to page past 100,000 accounts");
  }
  const attributed = recent.filter((u) => u.user_metadata?.signup_source === "go-for-a-season");

  const byCampaign = new Map<string, number>();
  for (const v of ad) {
    const k = `${v.utm_source} / ${v.utm_campaign ?? "(no campaign)"} / ${v.utm_content ?? "(no ad)"}`;
    byCampaign.set(k, (byCampaign.get(k) ?? 0) + 1);
  }

  const byDay = new Map<string, { real: number; ad: number }>();
  for (const v of real) {
    const d = v.created_at.slice(0, 10);
    const e = byDay.get(d) ?? { real: 0, ad: 0 };
    e.real += 1;
    if (v.utm_source) e.ad += 1;
    byDay.set(d, e);
  }

  const report = {
    windowDays: DAYS,
    since,
    visits: { total: visits.length, real: real.length, bots: visits.length - real.length,
              adTagged: ad.length, inAppBrowser: real.filter((v) => v.in_app_browser).length },
    funnel,
    signups: { total: recent.length, attributed: attributed.length },
    byCampaign: [...byCampaign.entries()].sort((a, b) => b[1] - a[1]),
    byDay: [...byDay.entries()].sort().reverse(),
    spend: null as null, // Ads Manager only — see the note at the top.
  };

  if (AS_JSON) { console.log(JSON.stringify(report, null, 2)); return; }

  const pct = (n: number, d: number) => (d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "—");
  console.log(`\nGo For A Season — last ${DAYS} day(s), since ${since.slice(0, 10)}\n`);

  if (ad.length === 0) {
    console.log("  ⚠️  NO AD-TAGGED TRAFFIC AT ALL. Every visit below is organic, a bot,");
    console.log("      or someone testing. The campaign is not running, or its links");
    console.log("      carry no utm_source.\n");
  }

  console.log(`  Visits      ${visits.length} requests -> ${real.length} real (${visits.length - real.length} bots)`);
  console.log(`              ${ad.length} ad-tagged, ${report.visits.inAppBrowser} in an in-app browser`);
  console.log(`\n  Funnel (EVENT counts, not people)`);
  console.log(`    landing page views     ${funnel.views}`);
  console.log(`    quiz started           ${funnel.quizStarted}   ${pct(funnel.quizStarted, funnel.views)} of views`);
  console.log(`    quiz completed         ${funnel.quizCompleted}   ${pct(funnel.quizCompleted, funnel.quizStarted)} of starts`);
  console.log(`    tapped "create profile" ${funnel.signupClicked}`);
  console.log(`    tapped "browse jobs"   ${funnel.jobsClicked}`);
  console.log(`\n  Signups (real people)`);
  console.log(`    worker accounts created   ${recent.length}`);
  console.log(`    from this campaign        ${attributed.length}   ${pct(attributed.length, real.length)} of real visits`);

  if (report.byCampaign.length) {
    console.log(`\n  Ad-tagged traffic by source / campaign / ad`);
    for (const [k, n] of report.byCampaign) console.log(`    ${String(n).padStart(5)}  ${k}`);
  }
  if (report.byDay.length) {
    console.log(`\n  By day (real visits / of which ad-tagged)`);
    for (const [d, v] of report.byDay) console.log(`    ${d}   ${String(v.real).padStart(4)} / ${v.ad}`);
  }
  console.log(`\n  Spend: NOT AVAILABLE — Meta Ads Manager only. Divide it by`);
  console.log(`         "from this campaign" above to get cost per signup.\n`);
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });

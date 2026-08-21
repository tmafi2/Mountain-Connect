/**
 * scripts/fb-monitor/find-groups.ts
 *
 * Find candidate Facebook groups to add to the job monitor, one search per
 * resort, using the same signed-in profile the collector uses.
 *
 *   npx tsx scripts/fb-monitor/find-groups.ts --country Canada,Japan,USA
 *
 * WHY NOT JUST WEB-SEARCH FOR THEM. Facebook group URLs found via a search
 * engine are frequently stale, and nothing in a search result tells you
 * whether a group is public, how many members it has, or whether it is still
 * being posted in. Asking Facebook directly returns all three, current, and
 * is the same access the collector already has.
 *
 * WHAT THIS DOES NOT DO. It does not join anything, and it does not edit
 * groups.json. It produces a ranked shortlist for a human to look at, because
 * "is this group actually full of job adverts" is a judgement call that a
 * member count cannot make. Joining is manual and deliberate.
 */
import { writeFileSync } from "node:fs";
import * as path from "node:path";
import { launch } from "./browser";

const OUT_DIR = path.join(process.cwd(), "scripts", "fb-monitor", "out");

/** Words that make a group likely to carry job adverts. */
const JOB_WORDS = [
  "job", "jobs", "work", "working", "employment", "hiring", "hire",
  "staff", "recruit", "career", "seasonal", "vacancies", "gigs", "classifieds",
];
/** Words that mean the group is about something else entirely. */
const NEGATIVE_WORDS = [
  "buy", "sell", "swap", "for sale", "marketplace", "rent", "rental",
  "housing", "accommodation", "roommate", "ride share", "rideshare",
  "lost and found", "condo", "real estate", "trail", "avalanche",
];

interface Candidate {
  id: string;
  name: string;
  privacy: string;
  members: number;
  activity: string | null;
  url: string;
  score: number;
  matchedOn: string[];
  forResorts: string[];
}

function parseMembers(line: string): number {
  const m = line.match(/([\d.,]+)\s*([KM])?\s*members/i);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(/,/g, ""));
  if (Number.isNaN(n)) return 0;
  return m[2]?.toUpperCase() === "K" ? n * 1e3 : m[2]?.toUpperCase() === "M" ? n * 1e6 : n;
}

function score(name: string, members: number, terms: string[]): { score: number; matched: string[] } {
  const lower = name.toLowerCase();
  const matched: string[] = [];
  let s = 0;

  // Naming the place is the strongest signal that it serves that resort.
  for (const t of terms) {
    if (t.length > 2 && lower.includes(t.toLowerCase())) {
      s += 40;
      matched.push(t);
      break;
    }
  }
  if (JOB_WORDS.some((w) => new RegExp(`\\b${w}\\b`, "i").test(lower))) {
    s += 35;
    matched.push("job-related");
  }
  if (NEGATIVE_WORDS.some((w) => lower.includes(w))) s -= 45;

  // Size helps but must not dominate: a 150k city-wide group is far less
  // useful to us than a 3k group for the actual resort town.
  s += Math.min(20, Math.log10(Math.max(members, 1)) * 5);
  return { score: Math.round(s), matched };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const countryArg = args[args.indexOf("--country") + 1] ?? "Canada,Japan,USA";
  const countries = countryArg.split(",").map((c) => c.trim());
  const limitArg = Number(args[args.indexOf("--limit") + 1]);
  const perResort = Number.isFinite(limitArg) && limitArg > 0 ? limitArg : 3;

  // Load env the same way the other scripts do.
  const { readFileSync } = await import("node:fs");
  readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split("\n").forEach((l) => {
    const m = l.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  });
  const SB = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const resorts: Array<{ name: string; country: string; resort_nearby_towns: Array<{ nearby_towns: { name: string } | null }> }> =
    await (
      await fetch(
        `${SB}/rest/v1/resorts?select=name,country,resort_nearby_towns(nearby_towns(name))&country=in.(${countries.join(",")})&order=country,name`,
        { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
      )
    ).json();

  // Groups already being monitored — no point shortlisting them again.
  const configured = new Set<string>();
  try {
    const cfg = JSON.parse(readFileSync(path.join(process.cwd(), "scripts/fb-monitor/groups.json"), "utf8"));
    for (const region of Object.values(cfg) as Array<{ groups?: string[] }>) {
      for (const u of region?.groups ?? []) {
        const m = u.match(/\/groups\/([^/?]+)/);
        if (m) configured.add(m[1]);
      }
    }
  } catch { /* config is optional here */ }

  console.log(`resorts: ${resorts.length}  (${countries.join(", ")})`);
  console.log(`already monitored: ${configured.size} group(s) — excluded from results\n`);

  const ctx = await launch(true);
  const page = await ctx.newPage();
  const found = new Map<string, Candidate>();

  try {
    for (const [i, resort] of resorts.entries()) {
      const towns = (resort.resort_nearby_towns ?? [])
        .map((t) => t.nearby_towns?.name)
        .filter((n): n is string => !!n);
      const terms = [resort.name, ...towns];
      // Two queries: the resort itself, and its main town. The town is often
      // where the staff actually live and where the local job group is named.
      const queries = [`${resort.name} jobs`, ...(towns[0] ? [`${towns[0]} jobs`] : [])];

      process.stdout.write(`[${i + 1}/${resorts.length}] ${resort.name} (${resort.country}) … `);
      let newForThis = 0;

      for (const q of queries) {
        try {
          await page.goto(`https://www.facebook.com/search/groups/?q=${encodeURIComponent(q)}`, {
            waitUntil: "domcontentloaded",
            timeout: 60_000,
          });
          await page.waitForTimeout(6_000);

          const raw: Array<{ id: string; lines: string[] }> = await page.evaluate(String.raw`(() => {
            var out = [], seen = {};
            var links = Array.prototype.slice.call(document.querySelectorAll('a[href*="/groups/"]'));
            for (var i = 0; i < links.length; i++) {
              var a = links[i];
              var href = (a.getAttribute('href') || '').split('?')[0];
              var m = href.match(/\/groups\/([^\/]+)\/?$/);
              if (!m || seen[m[1]]) continue;
              var row = a;
              for (var up = 0; up < 6 && row.parentElement; up++) row = row.parentElement;
              var txt = (row.innerText || '').trim();
              if (!txt || txt.length < 3) continue;
              seen[m[1]] = 1;
              out.push({ id: m[1], lines: txt.split('\n').map(function(x){return x.trim();}).filter(Boolean).slice(0, 3) });
            }
            return out.slice(0, 12);
          })()`);

          for (const r of raw) {
            if (configured.has(r.id)) continue;
            const name = r.lines[0] ?? "";
            const meta = r.lines.find((l) => /members/i.test(l)) ?? "";
            if (!name || /^join$/i.test(name)) continue;

            const members = parseMembers(meta);
            const { score: s, matched } = score(name, members, terms);
            if (s < 45) continue; // must at least name the place or be job-shaped

            const existing = found.get(r.id);
            if (existing) {
              if (!existing.forResorts.includes(resort.name)) existing.forResorts.push(resort.name);
              existing.score = Math.max(existing.score, s);
            } else {
              found.set(r.id, {
                id: r.id,
                name,
                privacy: /public/i.test(meta) ? "Public" : /private/i.test(meta) ? "Private" : "?",
                members,
                activity: meta.match(/[\d+]+\s*posts? a day/i)?.[0] ?? null,
                url: `https://www.facebook.com/groups/${r.id}`,
                score: s,
                matchedOn: matched,
                forResorts: [resort.name],
              });
              newForThis++;
            }
          }
        } catch (err) {
          process.stdout.write(`(query failed: ${err instanceof Error ? err.message.split("\n")[0].slice(0, 40) : "?"}) `);
        }
      }
      console.log(`${newForThis} new candidate(s)`);
    }
  } finally {
    await ctx.close();
  }

  // Best `perResort` for each resort, by score.
  const byResort = new Map<string, Candidate[]>();
  for (const c of found.values()) {
    for (const r of c.forResorts) {
      const list = byResort.get(r) ?? [];
      list.push(c);
      byResort.set(r, list);
    }
  }
  const shortlist: Record<string, Candidate[]> = {};
  for (const resort of resorts) {
    const list = (byResort.get(resort.name) ?? []).sort((a, b) => b.score - a.score).slice(0, perResort);
    shortlist[`${resort.country}|${resort.name}`] = list;
  }

  const outFile = path.join(OUT_DIR, `group-candidates-${Date.now()}.json`);
  writeFileSync(outFile, JSON.stringify({ shortlist, all: [...found.values()] }, null, 2));
  console.log(`\ncandidates found: ${found.size}`);
  console.log(`wrote ${outFile}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

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
import { scoreGroup, parseMembers } from "./group-scoring";

const OUT_DIR = path.join(process.cwd(), "scripts", "fb-monitor", "out");

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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const countryArg = args[args.indexOf("--country") + 1] ?? "Canada,Japan,USA";
  const countries = countryArg.split(",").map((c) => c.trim());
  const onlyArg = args.indexOf("--only") >= 0 ? args[args.indexOf("--only") + 1] : null;
  const only = onlyArg ? new Set(onlyArg.split(",").map((x) => x.trim())) : null;
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

  const resorts: Array<{ name: string; country: string; state_province: string | null; resort_nearby_towns: Array<{ nearby_towns: { name: string } | null }> }> =
    await (
      await fetch(
        `${SB}/rest/v1/resorts?select=name,country,state_province,resort_nearby_towns(nearby_towns(name))&country=in.(${countries.join(",")})&order=country,name`,
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

  const targets = only ? resorts.filter((r) => only.has(r.name)) : resorts;
  console.log(`resorts: ${targets.length}${only ? ` (filtered from ${resorts.length})` : ""}  (${countries.join(", ")})`);
  console.log(`already monitored: ${configured.size} group(s) — excluded from results\n`);

  const ctx = await launch(true);
  const page = await ctx.newPage();
  const found = new Map<string, Candidate>();

  try {
    for (const [i, resort] of targets.entries()) {
      const towns = (resort.resort_nearby_towns ?? [])
        .map((t) => t.nearby_towns?.name)
        .filter((n): n is string => !!n);
      const terms = [resort.name, ...towns];
      // Weighted toward the MOUNTAIN, not the town it sits above.
      //
      // An earlier pass ran three town queries to two resort ones and came
      // back full of "Kelowna Jobs" and "Salt Lake City jobs" — real job
      // boards, but for the nearest city rather than the hill. A resort's own
      // crew group is the more valuable find: smaller, seasonal, and full of
      // exactly the postings we want.
      //
      // The extra angles matter because seasonal crews name themselves
      // inconsistently — employees, crew, staff, seasonaires — and Facebook's
      // search is literal, so each phrasing surfaces a different set.
      const town = towns[0];
      const queries = [
        `${resort.name} jobs`,
        `${resort.name} staff`,
        `${resort.name} employees`,
        `${resort.name} crew`,
        `${resort.name} seasonaires`,
        // One town query kept: some resorts genuinely have no group of their
        // own and the town board is the only place their adverts appear.
        ...(town ? [`${town} jobs`] : []),
        ...(resort.country === "Japan" ? [`${resort.name} working holiday`] : []),
      ];

      process.stdout.write(`[${i + 1}/${targets.length}] ${resort.name} (${resort.country}) … `);
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
            const verdict = scoreGroup({ name, members, terms, region: resort.state_province });
            if (verdict.rejected) continue;
            const s = verdict.score;

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
                matchedOn: [verdict.matchedPlace ?? "", verdict.confidence ?? ""].filter(Boolean),
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
  for (const resort of targets) {
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

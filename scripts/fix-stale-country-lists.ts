/**
 * Three published guides name the countries our board covers, and all three
 * were written before Italy existed on it.
 *
 * ⚠️ WHAT WAS WRONG. Each one says the board is "Canada, Japan and France".
 * France has a handful of listings; Italy has dozens, is the largest non-
 * Canadian country on the board and draws the overwhelming majority of the
 * interest we get — and was named nowhere. Two of the three sentences sit
 * directly beside a `::figures` line that counts Canada and Japan live and
 * silently omits Italy, so the live numbers and the typed list disagreed with
 * each other on the same page.
 *
 * ⚠️ THIS IS THE `/about` BUG AGAIN, IN PROSE. "69 Ski Resorts" sat on /about
 * for five months while the real figure was 111. The fix is the same one
 * `lib/blog/live-figures.ts` already exists for: counts move into figures
 * lines, and what stays in prose is phrased so it cannot go stale — "the
 * northern hemisphere" is true however the board shifts, "Canada, Japan and
 * France" was not.
 *
 * ⚠️ THE FAQ ANSWER DELIBERATELY GETS NO TOKEN. `/blog/[slug]` parses the FAQ
 * out of the RENDERED markdown, so a figures line inside an answer would
 * reach `FAQPage` schema when the figures resolve and leave the answer short
 * when they do not. Prose only, there.
 *
 * Every replacement is pinned to its exact current text and must match once
 * in its own post, or that post is left alone and reported. Re-running after
 * a success is a no-op, because the old text is gone.
 *
 *   npx tsx scripts/fix-stale-country-lists.ts            # show the diff
 *   npx tsx scripts/fix-stale-country-lists.ts --apply
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const APPLY = process.argv.includes("--apply");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

type Fix = { slug: string; from: string; to: string; why: string };

const FIXES: Fix[] = [
  {
    slug: "australian-working-holiday-visa-ski-season",
    from: "::figures Of the {{openJobs}} roles open on our board right now, {{canadaJobs}} are in Canada and {{japanJobs}} in Japan.",
    to: "::figures Of the {{openJobs}} roles open on our board right now, {{canadaJobs}} are in Canada, {{italyJobs}} in Italy and {{japanJobs}} in Japan.",
    why: "the live line counted two of the three main countries",
  },
  {
    slug: "australian-working-holiday-visa-ski-season",
    from: "**We currently have no Australian listings.** The board is Canada, Japan and France.",
    to: "**We currently have no Australian listings.** Our open roles are all in the northern hemisphere — Canada, Japan and the Alps.",
    why: "named France and not Italy; now phrased so it cannot go stale",
  },
  {
    slug: "new-zealand-vs-australia-ski-season-pay",
    from: "Not right now. Our open listings are in Canada, Japan and France.",
    to: "Not right now. Our open listings are all in the northern hemisphere — Canada, Japan and the Alps.",
    why: "an FAQ answer, so prose only — this reaches FAQPage schema",
  },
  {
    slug: "two-ski-seasons-in-one-year",
    from: "::figures We currently list roles in Canada, Japan and France — {{canadaJobs}} in Canada and {{japanJobs}} in Japan — which covers the northern half of a double season.",
    to: "::figures We currently list roles in the northern hemisphere only — {{canadaJobs}} in Canada, {{italyJobs}} in Italy and {{japanJobs}} in Japan — which covers the northern half of a double season.",
    why: "typed list and live counts disagreed in one sentence",
  },
];

async function main() {
  const slugs = [...new Set(FIXES.map((f) => f.slug))];
  const { data, error } = await db.from("blog_posts").select("slug, content").in("slug", slugs);
  if (error) throw new Error(error.message);

  const content = new Map((data ?? []).map((r) => [r.slug as string, r.content as string]));
  for (const s of slugs) {
    if (!content.has(s)) throw new Error(`post not found: ${s} — refusing to guess`);
  }

  let changed = 0;
  let missed = 0;

  for (const slug of slugs) {
    let text = content.get(slug)!;
    const mine = FIXES.filter((f) => f.slug === slug);
    console.log(`\n${slug}`);

    for (const f of mine) {
      const hits = text.split(f.from).length - 1;
      if (hits !== 1) {
        console.log(`  ✗ found ${hits} matches, expected 1 — left alone (${f.why})`);
        missed++;
        continue;
      }
      text = text.replace(f.from, f.to);
      console.log(`  − ${f.from}`);
      console.log(`  + ${f.to}`);
      console.log(`    (${f.why})`);
      changed++;
    }

    if (text === content.get(slug)) continue;
    if (!APPLY) continue;

    const { error: upErr } = await db
      .from("blog_posts")
      .update({ content: text, updated_at: new Date().toISOString() })
      .eq("slug", slug);
    if (upErr) throw new Error(`${slug}: ${upErr.message}`);
    console.log("  written");
  }

  console.log(`\n${changed} replacement(s) ready, ${missed} not matched.`);
  if (!APPLY) console.log("Dry run. Pass --apply to write.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

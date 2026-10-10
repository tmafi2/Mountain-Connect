/**
 * One-off: re-read whether each advert offers staff accommodation.
 *
 *   npx tsx scripts/backfill-accommodation.ts --rebuild
 *   npx tsx scripts/backfill-accommodation.ts --rebuild --apply
 *
 * Migration 00115 made `accommodation_included` tri-state and cleared every
 * ambiguous `false` to NULL, keeping the five explicit "Not provided"
 * refusals. This puts the real answers back.
 *
 * ⚠️ THIS COLUMN IS WRONG IN BOTH DIRECTIONS, unlike the pass one. Measured
 * before the migration: 27 of 159 `true` rows never mention housing, and 32
 * of 196 `false` rows do. So --rebuild is not optional here, and the numbers
 * can move up as well as down.
 *
 * ⚠️ THE RESULT IS PUBLISHED IN THREE PLACES that all read this column:
 * the /go-for-a-season ad hero ("68 come with staff accommodation"),
 * /staff-housing, and the /jobs?accommodation=yes filter. They move together
 * by design — see lib/stats/country-job-stats.ts.
 *
 * ⚠️ READS `job_posts.description`, NOT FACEBOOK. The advert text is already
 * in our own database; re-scraping would need a fresh login, cost far more,
 * and risk re-importing listings that have since been edited or pulled. Same
 * approach as scripts/backfill-housing-cost.ts.
 *
 * ⚠️ TWO QUESTIONS, NOT SEVENTEEN. This project measured that a model given
 * the full extraction schema under constrained decoding gets the substance
 * wrong, while the same model asked one narrow question is close to perfect.
 *
 * ⚠️ --rebuild RE-READS EVERYTHING, INCLUDING THE STORED `true` VALUES, and
 * that turned out to be necessary rather than thorough. The plan was to fill
 * only NULLs and trust the confirmations 00114 kept — until a control run
 * against eight listings already marked as including a pass came back "not
 * stated" for four of them, and those four adverts turn out not to contain
 * the word "pass" anywhere.
 *
 * Measured across the open board: 15 of the 56 `ski_pass_included = true`
 * rows never mention a pass in their text, and 13 of the 59 `meal_perks =
 * true` rows never mention food. The original seventeen-field extraction was
 * inferring perks from context — a ski resort employing people, therefore a
 * pass — rather than reading them. About a quarter of the confirmations are
 * wrong, which is not a rounding error on a published figure.
 *
 * So the default mode fills NULLs only, and --rebuild replaces the column
 * from the advert text. Use --rebuild once; the default thereafter.
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
for (const name of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"]) {
  if (!process.env[name]?.trim()) {
    // Names only; no value is ever printed.
    console.error(`Missing ${name} in .env.local`);
    process.exit(1);
  }
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const APPLY = process.argv.includes("--apply");
/** Re-read every listing, replacing stored values. See the note above. */
const REBUILD = process.argv.includes("--rebuild");
const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i >= 0 ? Number(process.argv[i + 1]) : Infinity;
})();

/** Paid work is cached, so a crash or a re-run never pays twice. */
const CACHE = "/tmp/accommodation-backfill-cache.json";
const MODEL = "claude-opus-5";
const CONCURRENCY = 4;
const NOT_STATED = "not stated";

/**
 * ⚠️ `anyOf` and a sentinel string, NOT `type: ["boolean","null"]`. The
 * obvious spelling is rejected by the API — see the note in
 * backfill-housing-cost.ts, where it cost a round of 400s to discover.
 */
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    accommodation: {
      type: "string",
      enum: ["yes", "no", NOT_STATED],
      description: `"yes" if the advert says staff accommodation, housing, a room, a dorm bed or a housing subsidy is offered or available to the worker — paid or free. "no" ONLY if it explicitly says housing is NOT provided. "${NOT_STATED}" if the advert does not mention accommodation at all.`,
    },
  },
  required: ["accommodation"],
} as const;

/**
 * ⚠️ TIGHTENED AFTER READING THE FIRST RUN'S ANSWERS. The looser version got
 * three of six definite answers wrong, each in a way worth naming:
 *   - "Possibility for full-time work (with housing) in OTHER departments"
 *     was read as this job including housing.
 *   - "Accommodation discounts: 20% off at The Adara Hotel" — a guest
 *     discount — was read as staff accommodation, which an earlier clause
 *     about "reduced rates" had invited.
 *   - Two adverts that never mention housing came back "no" rather than
 *     "not stated", despite the rule.
 * Each of those is now its own line below.
 */
const SYSTEM = `You read one ski-resort job advert and report only what it says about staff accommodation for the worker taking THIS job.

Answer "yes" only when the advert offers the worker somewhere to live as part of this job: staff accommodation, a staff dorm or lodge bed, a provided or arranged room or apartment, or a housing subsidy or stipend toward their own rent. Paid staff housing counts — the question is whether housing comes with the job, not whether it is free. Japanese 寮 / 社宅 and Chinese 員工宿舍 / 住宿 mean staff accommodation.

Answer "no" only when the advert explicitly says the worker must sort out their own housing, or that none is provided: "no accommodation", "you must arrange your own housing", "applicants must already live in <town>", "must have secure housing locally".

Answer "${NOT_STATED}" in every other case, including when the advert simply never raises the subject. That is the most common answer and it is not a failure.

These are NOT accommodation for this job — answer "${NOT_STATED}" or "no" as the rest of the advert warrants:
- a discount at a hotel, lodge or condo, or any percentage off a room; that is a guest perk, not somewhere to live
- housing attached to a DIFFERENT role, a future role, or offered only as a "possibility" in another department
- "we can help you find a place" or "we will point you toward local rentals"
- the employer merely being in a ski town, or the job being seasonal`;

type Row = {
  id: string;
  title: string;
  description: string | null;
  accommodation_included: boolean | null;
  accommodation_type: string | null;
};

type Wire = { accommodation: string };
type Answer = { accommodation: boolean | null };

const btrim = (v: string | null) => (v ?? "").trim();
const triState = (v: string): boolean | null => (v === "yes" ? true : v === "no" ? false : null);

async function readAll(): Promise<Row[]> {
  const all: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("job_posts")
      .select("id, title, description, accommodation_included, accommodation_type")
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Row[];
    all.push(...page);
    if (page.length < 1000) return all;
  }
}

async function ask(row: Row): Promise<Answer> {
  const res = (await anthropic.messages.create({
    model: MODEL,
    max_tokens: 300,
    // Identical for every post, so each call after the first reads it from
    // cache instead of re-paying for it.
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: `JOB TITLE: ${row.title}\n\nADVERT:\n${(row.description ?? "").slice(0, 6000)}`,
      },
    ],
  } as unknown as Anthropic.MessageCreateParamsNonStreaming)) as Anthropic.Message;

  const text = res.content.map((b) => ("text" in b ? b.text : "")).join("");
  const w = JSON.parse(text) as Wire;
  return { accommodation: triState(w.accommodation) };
}

async function main() {
  const rows = (await readAll()).filter((r) => (r.description ?? "").trim() !== "");
  // Only rows with something still unknown are worth paying for.
  const todo = (REBUILD
    ? // ⚠️ The five explicit "Not provided" refusals are never re-read. A
      // human-readable advert saying "No housing provided" is the strongest
      // signal on the board, and re-asking risks losing it to a shrug.
      rows.filter((r) => btrim(r.accommodation_type) !== "Not provided")
    : rows.filter((r) => r.accommodation_included === null)
  ).slice(0, LIMIT);

  const cache: Record<string, Answer> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  console.log(`  open listings with text: ${rows.length}`);
  console.log(`  candidates: ${todo.length}`);
  console.log(`  cached from an earlier run: ${todo.filter((r) => cache[r.id]).length}`);
  console.log(
    `  mode: ${APPLY ? "APPLY — will write" : "dry run — writes nothing"}${
      REBUILD ? " · REBUILD — replaces stored values, including existing confirmations" : ""
    }\n`
  );

  let done = 0;
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const row = queue.shift()!;
        if (!cache[row.id]) {
          try {
            cache[row.id] = await ask(row);
          } catch (err) {
            console.error(`    ! ${row.title.slice(0, 32)}: ${String(err).slice(0, 110)}`);
            continue;
          }
          writeFileSync(CACHE, JSON.stringify(cache, null, 1));
        }
        done++;
        if (done % 50 === 0) console.log(`    …${done}/${todo.length}`);
      }
    })
  );

  // ⚠️ A `true` already on the row is never revisited. It was confirmed by
  // the original extraction; a model now saying "not stated" is likelier to
  // be missing it than the earlier read to be wrong.
  const changes = todo
    .map((r) => {
      const a = cache[r.id];
      if (!a) return null;
      // In rebuild mode the advert's answer wins outright, including a
      // "not stated" that clears a confirmation we no longer trust.
      const patch: Record<string, boolean | null> = {};
      if (REBUILD) {
        if (r.accommodation_included !== a.accommodation) patch.accommodation_included = a.accommodation;
      } else if (r.accommodation_included === null && a.accommodation !== null) {
        patch.accommodation_included = a.accommodation;
      }
      return Object.keys(patch).length > 0 ? { row: r, patch } : null;
    })
    .filter(Boolean) as Array<{ row: Row; patch: Record<string, boolean | null> }>;

  const gained = changes.filter((c) => c.patch.accommodation_included === true).length;
  const refused = changes.filter((c) => c.patch.accommodation_included === false).length;
  const cleared = changes.filter((c) => c.patch.accommodation_included === null).length;

  console.log(`\n  listings to update: ${changes.length} of ${todo.length}`);
  console.log(`    newly CONFIRMED (was silent or wrongly false): ${gained}`);
  console.log(`    newly REFUSED (advert says no housing): ${refused}`);
  console.log(`    confirmations CLEARED as unsupported: ${cleared}`);
  console.log(`    unchanged: ${todo.length - changes.length}\n`);
  for (const c of changes.slice(0, 30)) {
    const was = c.row.accommodation_included;
    console.log(
      `    ${c.row.title.slice(0, 42).padEnd(42)} ${String(was).padEnd(5)} -> ${c.patch.accommodation_included}`
    );
  }
  if (changes.length > 30) console.log(`    …and ${changes.length - 30} more`);

  if (!APPLY) {
    console.log("\n  dry run — nothing written. Re-run with --apply.");
    return;
  }

  let written = 0;
  for (const c of changes) {
    // Guarded on NULL in the UPDATE itself, not only in the candidate list:
    // the board moves while this runs.
    let q = db.from("job_posts").update(c.patch).eq("id", c.row.id);
    // The NULL guard protects a fill-in run from racing the board. A rebuild
    // is deliberately replacing stored values, so it cannot use it.
    if (!REBUILD) q = q.is("accommodation_included", null);
    const { error } = await q;
    if (error) console.error(`    ! write ${c.row.id}: ${error.message}`);
    else written++;
  }
  console.log(`\n  rows written: ${written}`);
}

main().catch((err) => {
  console.error("backfill failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

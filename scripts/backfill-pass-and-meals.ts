/**
 * One-off: re-read whether each advert offers a season pass or staff meals.
 *
 *   npx tsx scripts/backfill-pass-and-meals.ts            # dry run
 *   npx tsx scripts/backfill-pass-and-meals.ts --apply
 *   npx tsx scripts/backfill-pass-and-meals.ts --limit 12
 *
 * Migration 00114 made `ski_pass_included` and `meal_perks` tri-state and
 * cleared every ambiguous `false` to NULL, because a stored false could not
 * be told apart from "the advert never mentioned it". This puts the real
 * answers back: a genuine `false` where an advert actually says a perk is
 * NOT included, and `true` where the first extraction missed one.
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
const CACHE = "/tmp/perks-backfill-cache.json";
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
    seasonPass: {
      type: "string",
      enum: ["yes", "no", NOT_STATED],
      description: `"yes" if the advert says a season pass, lift pass or ski pass is included or provided. "no" ONLY if it explicitly says one is not provided. "${NOT_STATED}" if the advert does not mention a pass at all — which is the usual answer.`,
    },
    meals: {
      type: "string",
      enum: ["yes", "no", NOT_STATED],
      description: `"yes" if the advert says meals, staff food or a meal allowance are included. "no" ONLY if it explicitly says meals are not provided. "${NOT_STATED}" if unmentioned.`,
    },
  },
  required: ["seasonPass", "meals"],
} as const;

const SYSTEM = `You read one ski-resort job advert and report only what it says about two perks: a season/lift pass, and staff meals.

Rules:
- Report ONLY what the text states. Silence is "${NOT_STATED}", and silence is the most common answer by far.
- "no" is reserved for an advert that actually says the perk is NOT provided ("no lift pass", "meals not included"). Do not use "no" for an advert that simply never mentions it.
- A discounted pass, a subsidised pass or "pass assistance" counts as "yes" — the worker gets one through the job.
- A free ski/ride day, a staff discount in the shop, or a discount on food is NOT a pass and NOT meals.
- Do not infer a pass from the employer being a ski resort.`;

type Row = {
  id: string;
  title: string;
  description: string | null;
  ski_pass_included: boolean | null;
  meal_perks: boolean | null;
};

type Wire = { seasonPass: string; meals: string };
type Answer = { pass: boolean | null; meals: boolean | null };

const triState = (v: string): boolean | null => (v === "yes" ? true : v === "no" ? false : null);

async function readAll(): Promise<Row[]> {
  const all: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("job_posts")
      .select("id, title, description, ski_pass_included, meal_perks")
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
  return { pass: triState(w.seasonPass), meals: triState(w.meals) };
}

async function main() {
  const rows = (await readAll()).filter((r) => (r.description ?? "").trim() !== "");
  // Only rows with something still unknown are worth paying for.
  const todo = (REBUILD
    ? rows
    : rows.filter((r) => r.ski_pass_included === null || r.meal_perks === null)
  ).slice(0, LIMIT);

  const cache: Record<string, Answer> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  console.log(`  open listings with text: ${rows.length}`);
  console.log(`  candidates (a perk still unknown): ${todo.length}`);
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
        if (r.ski_pass_included !== a.pass) patch.ski_pass_included = a.pass;
        if (r.meal_perks !== a.meals) patch.meal_perks = a.meals;
      } else {
        if (r.ski_pass_included === null && a.pass !== null) patch.ski_pass_included = a.pass;
        if (r.meal_perks === null && a.meals !== null) patch.meal_perks = a.meals;
      }
      return Object.keys(patch).length > 0 ? { row: r, patch } : null;
    })
    .filter(Boolean) as Array<{ row: Row; patch: Record<string, boolean | null> }>;

  const newPassYes = changes.filter((c) => c.patch.ski_pass_included === true).length;
  const newPassNo = changes.filter((c) => c.patch.ski_pass_included === false).length;
  const newMealYes = changes.filter((c) => c.patch.meal_perks === true).length;
  const newMealNo = changes.filter((c) => c.patch.meal_perks === false).length;

  console.log(`\n  listings to update: ${changes.length} of ${todo.length}`);
  console.log(`    pass  → yes ${newPassYes} · no ${newPassNo}`);
  console.log(`    meals → yes ${newMealYes} · no ${newMealNo}`);
  const clearedPass = changes.filter((c) => c.patch.ski_pass_included === null).length;
  const clearedMeals = changes.filter((c) => c.patch.meal_perks === null).length;
  if (REBUILD) {
    console.log(`    confirmations CLEARED as unsupported → pass ${clearedPass} · meals ${clearedMeals}`);
  }
  console.log(`    unchanged: ${todo.length - changes.length}\n`);
  for (const c of changes.slice(0, 30)) {
    const bits = Object.entries(c.patch).map(([k, v]) => `${k.replace(/_included|_perks/, "")}=${v}`);
    console.log(`    ${c.row.title.slice(0, 44).padEnd(44)} ${bits.join(" ")}`);
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
    if (!REBUILD) {
      if ("ski_pass_included" in c.patch) q = q.is("ski_pass_included", null);
      if ("meal_perks" in c.patch) q = q.is("meal_perks", null);
    }
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

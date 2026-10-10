/**
 * One-off: read housing cost out of the advert text we already hold.
 *
 *   npx tsx scripts/backfill-housing-cost.ts            # dry run, writes nothing
 *   npx tsx scripts/backfill-housing-cost.ts --apply    # writes
 *   npx tsx scripts/backfill-housing-cost.ts --limit 10 # sample first
 *
 * Migration 00112 added `accommodation_cost_amount/_currency/_period/
 * _deducted`, and `scripts/fb-monitor/schema.ts` now asks for them — but the
 * extraction ledger means only RE-SCRAPED posts ever carry them. Every
 * listing already on the board would have stayed NULL for ever.
 *
 * ⚠️ IT DOES NOT RE-SCRAPE FACEBOOK. `job_posts.description` IS the advert
 * text, so the answer is already in our own database; going back to Facebook
 * would need a fresh login, cost far more, and risk re-importing listings
 * that have since been edited or taken down.
 *
 * ⚠️ IT ASKS FOUR QUESTIONS, NOT SEVENTEEN. The project measured this
 * directly (see the job-import notes in CLAUDE.md): a model asked for the
 * full seventeen-field schema under constrained decoding gets the substance
 * wrong, while the same model asked one narrow question is close to perfect.
 * A backfill is the one place that is free to be narrow.
 *
 * ⚠️ IT NEVER OVERWRITES A VALUE THAT IS ALREADY THERE. Only rows where the
 * column is NULL are touched, so a figure a business typed in, or the one row
 * migration 00112 parsed by hand, cannot be replaced by a model's reading.
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
const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i >= 0 ? Number(process.argv[i + 1]) : Infinity;
})();

/** Paid work is cached, so a crash or a re-run never pays for the same post twice. */
const CACHE = "/tmp/housing-backfill-cache.json";
const MODEL = "claude-opus-5";
const CONCURRENCY = 4;

/** Must match the CHECK in migration 00112. */
const PERIODS = ["night", "week", "month", "season"] as const;

/**
 * ⚠️ THE SHAPE MATTERS, and the obvious spelling is rejected. `type:
 * ["number", "null"]` and an enum containing `null` are both refused by the
 * API ("Enum value 'night' does not match declared type"). The working form
 * is `anyOf` for nullables and a SENTINEL STRING for "didn't say" — which is
 * what scripts/fb-monitor/schema.ts already does, so this follows it rather
 * than inventing a second convention.
 */
const NOT_STATED = "not stated";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    housingCostAmount: {
      anyOf: [{ type: "number" }, { type: "null" }],
      description:
        "What the WORKER pays for staff housing, if the advert states it. For a range, the LOWER bound. Use 0 only if it explicitly says housing is free. null if not stated. Do NOT infer a cost from the fact that housing is offered, and do NOT confuse it with wages.",
    },
    housingCostCurrency: {
      type: "string",
      enum: ["CAD", "JPY", "EUR", "AUD", "NZD", "USD", "GBP", "CHF", NOT_STATED],
      description: `ISO code of housingCostAmount. "${NOT_STATED}" when there is no amount or the advert names no currency.`,
    },
    housingCostPeriod: {
      type: "string",
      enum: [...PERIODS, NOT_STATED],
      description: `What housingCostAmount is per. "${NOT_STATED}" when there is no amount.`,
    },
    housingDeductedFromPay: {
      type: "string",
      enum: ["yes", "no", NOT_STATED],
      description:
        `"yes" if the advert says housing is taken out of wages ("rent deducted from pay", "taken from your paycheque"), "no" if it says it is paid separately, "${NOT_STATED}" if it does not say. Guessing is worse than saying it did not say.`,
    },
  },
  required: ["housingCostAmount", "housingCostCurrency", "housingCostPeriod", "housingDeductedFromPay"],
} as const;

const SYSTEM = `You read a single ski-resort job advert and report only what it says about the cost of staff accommodation to the worker.

Rules:
- Report ONLY what the text states. If the advert does not mention what housing costs, every field is null.
- Never confuse housing cost with WAGES. "$22/hour" is pay. "$500/month for staff housing" is a housing cost.
- "Accommodation provided", "staff housing available" or "housing included" on its own is NOT a cost and NOT free — unless the advert says free, use null.
- "Subsidised" without a figure is null.
- Only use 0 when the advert explicitly says accommodation is free or at no cost.
- housingDeductedFromPay is about the MECHANISM, not the price: true only if the text says it comes out of wages.`;

type Row = {
  id: string;
  title: string;
  description: string | null;
  pay_currency: string | null;
  accommodation_cost_amount: number | null;
  accommodation_cost_deducted: boolean | null;
  resorts: { country: string | null } | { country: string | null }[] | null;
};

type Wire = {
  housingCostAmount: number | null;
  housingCostCurrency: string;
  housingCostPeriod: string;
  housingDeductedFromPay: string;
};

type Answer = {
  housingCostAmount: number | null;
  housingCostCurrency: string | null;
  housingCostPeriod: string | null;
  housingDeductedFromPay: boolean | null;
};

/** Sentinels back to nulls, once, at the edge. */
function normalise(w: Wire): Answer {
  const s = (v: string) => (v && v !== NOT_STATED ? v : null);
  return {
    housingCostAmount: typeof w.housingCostAmount === "number" ? w.housingCostAmount : null,
    housingCostCurrency: s(w.housingCostCurrency),
    housingCostPeriod: s(w.housingCostPeriod),
    housingDeductedFromPay:
      w.housingDeductedFromPay === "yes" ? true : w.housingDeductedFromPay === "no" ? false : null,
  };
}

async function readAll(): Promise<Row[]> {
  const all: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("job_posts")
      .select(
        "id, title, description, pay_currency, accommodation_cost_amount, accommodation_cost_deducted, resorts(country)"
      )
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as unknown as Row[];
    all.push(...page);
    if (page.length < 1000) return all;
  }
}

async function ask(row: Row): Promise<Answer> {
  const res = (await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    // The system prompt is identical for every post, so each call after the
    // first reads it from cache instead of re-paying for it.
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
  return normalise(JSON.parse(text) as Wire);
}

/** The country's currency, used only when an amount was found without one. */
const COUNTRY_CURRENCY: Record<string, string> = {
  Andorra: "EUR", Argentina: "ARS", Australia: "AUD", Austria: "EUR", Canada: "CAD",
  Chile: "CLP", France: "EUR", Georgia: "GEL", Italy: "EUR", Japan: "JPY",
  "New Zealand": "NZD", Sweden: "SEK", Switzerland: "CHF", USA: "USD",
};

async function main() {
  const rows = (await readAll()).filter((r) => (r.description ?? "").trim() !== "");
  // Never overwrite: only rows with nothing in either field are candidates.
  const todo = rows
    .filter((r) => r.accommodation_cost_amount === null && r.accommodation_cost_deducted === null)
    .slice(0, LIMIT);

  const cache: Record<string, Answer> = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  console.log(`  open listings: ${rows.length}`);
  console.log(`  candidates (both fields empty): ${todo.length}`);
  console.log(`  already cached from an earlier run: ${todo.filter((r) => cache[r.id]).length}`);
  console.log(`  mode: ${APPLY ? "APPLY — will write" : "dry run — writes nothing"}\n`);

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
            console.error(`    ! ${row.title.slice(0, 30)}: ${String(err)}`);
            continue;
          }
          writeFileSync(CACHE, JSON.stringify(cache, null, 1));
        }
        done++;
        if (done % 25 === 0) console.log(`    …${done}/${todo.length}`);
      }
    })
  );

  // ── what was found ──────────────────────────────────────────────────────
  const found = todo
    .map((r) => ({ row: r, a: cache[r.id] }))
    .filter((x) => x.a && (x.a.housingCostAmount !== null || x.a.housingDeductedFromPay !== null));

  console.log(`\n  listings with something to record: ${found.length} of ${todo.length}\n`);
  for (const { row, a } of found) {
    const country = (Array.isArray(row.resorts) ? row.resorts[0] : row.resorts)?.country ?? "";
    const cur = a.housingCostCurrency || row.pay_currency || COUNTRY_CURRENCY[country] || "";
    const cost =
      a.housingCostAmount === null
        ? "—"
        : a.housingCostAmount === 0
          ? "free"
          : `${cur} ${a.housingCostAmount}${a.housingCostPeriod ? "/" + a.housingCostPeriod : ""}`;
    const ded = a.housingDeductedFromPay === null ? "" : a.housingDeductedFromPay ? " · deducted" : " · separate";
    const unusable =
      a.housingCostAmount !== null &&
      a.housingCostAmount !== 0 &&
      !PERIODS.includes(a.housingCostPeriod as (typeof PERIODS)[number]);
    console.log(
      `    ${row.title.slice(0, 38).padEnd(38)} ${cost}${ded}${unusable ? "   [SKIPPED — no period, cannot be read or compared]" : ""}`
    );
  }

  if (!APPLY) {
    console.log("\n  dry run — nothing written. Re-run with --apply.");
    return;
  }

  let written = 0;
  for (const { row, a } of found) {
    const country = (Array.isArray(row.resorts) ? row.resorts[0] : row.resorts)?.country ?? "";
    // ⚠️ The currency and period travel ONLY with an amount: the database
    // refuses the other combination (00112), because a currency with nothing
    // to denominate is how 'USD' came to mean "no pay found" on 177 listings.
    const period = PERIODS.includes(a.housingCostPeriod as (typeof PERIODS)[number])
      ? a.housingCostPeriod
      : null;
    /**
     * ⚠️ AN AMOUNT WITHOUT A PERIOD IS NOT WRITTEN. One advert quoted "$385
     * bi-weekly"; fortnightly is not one of the four periods the database
     * allows, so the model correctly declined to pick one — and the figure
     * that survived would have rendered as "CAD $385" with no unit and could
     * not be normalised to a weekly comparison. A number nobody can read is
     * worse than no number.
     *
     * Zero is exempt: "Free" needs no period to be understood.
     */
    const amount = a.housingCostAmount;
    const hasAmount = typeof amount === "number" && amount >= 0 && (amount === 0 || period !== null);
    const patch: Record<string, unknown> = {};
    if (hasAmount) {
      patch.accommodation_cost_amount = amount;
      patch.accommodation_cost_currency =
        (a.housingCostCurrency || row.pay_currency || COUNTRY_CURRENCY[country] || "").toUpperCase() || null;
      patch.accommodation_cost_period = period;
    }
    if (a.housingDeductedFromPay !== null) patch.accommodation_cost_deducted = a.housingDeductedFromPay;
    if (Object.keys(patch).length === 0) continue;

    // Guarded on NULL in the UPDATE itself, not just in the candidate list:
    // the board moves while this runs.
    const { error } = await db
      .from("job_posts")
      .update(patch)
      .eq("id", row.id)
      .is("accommodation_cost_amount", null)
      .is("accommodation_cost_deducted", null);
    if (error) console.error(`    ! write ${row.id}: ${error.message}`);
    else written++;
  }
  console.log(`\n  rows written: ${written}`);
}

main().catch((err) => {
  console.error("backfill failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

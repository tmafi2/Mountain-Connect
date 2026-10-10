/**
 * Read-only aggregate pull for the AEO data pages.
 *
 *   npx tsx scripts/aeo-data-pull.ts
 *
 * Writes CSV + JSON to ./aeo-data/. READS ONLY — no insert, update, delete or
 * RPC anywhere in this file, and nothing it writes leaves the local folder.
 *
 * ─── What the data actually looks like, measured 2026-10-10 ───────────────
 *
 * PAY IS NOT FREE TEXT, despite `pay_amount` being a text column. Every one
 * of the 165 open jobs carrying pay has a numeric `pay_amount` AND a
 * machine-generated `salary_range` of the form "{CUR} {amount}/{period}".
 * 165/165 parse. The unit lives in that suffix.
 *
 * ⚠️ THE PERIOD IS READ FROM THE SUFFIX, NEVER INFERRED FROM THE NUMBER.
 * "JPY 3500/hour" is about CAD 32 — a perfectly ordinary wage — so any rule
 * like "a big number means annual" mislabels the entire Japanese board.
 *
 * ⚠️ `pay_currency` IS NOT A CURRENCY CLAIM WHEN IT SAYS USD. Cross-tabbed
 * against the resort's country: 124/124 CAD rows and 40/40 JPY rows carry
 * pay, while 0/58 Canadian-USD and 0/115 Japanese-USD rows do. There is not
 * one US resort on the open board. USD is the default stamped on rows where
 * no pay was extracted, so it never reaches these stats — but a USD row that
 * DOES carry pay is a real anomaly and is reported as one.
 *
 * ⚠️ TWO REQUESTED FIGURES CANNOT BE PRODUCED, and are reported as missing
 * rather than approximated:
 *   - median weekly housing cost: `accommodation_cost` has ONE non-empty
 *     value on the whole open board, and it reads "¥60k per month".
 *   - % with housing deducted from pay: there is no column for it. 33
 *     descriptions mention deduction or rent in prose; prose is not a field.
 *
 * ⚠️ ROLE CATEGORY IS DERIVED FROM THE TITLE. `job_posts.category` is
 * non-empty on 1 of 341 open jobs — the job board's own filter defaults the
 * rest to "Other" in its view model, which is why the column looks populated
 * on the site. Titles are clean ("line cook", "housekeeper"), so they are
 * classified by the ordered rules below and the unmatched share is reported.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { categoryForTitle } from "../lib/jobs/category";

/* ─── env ─────────────────────────────────────────────────────────────── */

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  // Names only. The values are never printed, logged or written to disk.
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(URL_, KEY, { auth: { persistSession: false } });

const OUT = join(process.cwd(), "aeo-data");

/** Never show a figure computed from fewer than this many jobs. */
const MIN_SAMPLE = 5;
const INSUFFICIENT = "insufficient data";

/* ─── paging ──────────────────────────────────────────────────────────── */

/**
 * This project caps a select at 1000 rows silently, so a plain read would
 * quietly analyse the first thousand jobs and call it the board.
 * See lib/supabase/fetch-all.ts — same rule, standalone here because a script
 * should not drag the app's module graph in.
 */
const PAGE = 1000;
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  label: string
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    const page = data ?? [];
    all.push(...page);
    if (page.length < PAGE) return all;
  }
}

/* ─── role classification ─────────────────────────────────────────────── */

/**
 * ⚠️ ONE TAXONOMY, and it is the app's. This script used to carry its own
 * keyword rules because `job_posts.category` was empty on 354 of 355 open
 * listings. Migration 00110 backfilled it from `categoryForTitle`, so the
 * stored value is now the answer and a second set of rules here could only
 * disagree with the board a reader is being pointed at.
 *
 * The title classifier is still the fallback for the handful of rows that
 * carry no category — the same function, so it cannot drift.
 */
function roleOf(category: string | null, title: string): string {
  return category ?? categoryForTitle(title) ?? "Other / unclassified";
}

/* ─── pay parsing ─────────────────────────────────────────────────────── */

type Period = "hour" | "day" | "week" | "month" | "season" | "year" | "total" | "unstated";

/** The suffix of `salary_range`, which is where the unit actually lives. */
function periodOf(salaryRange: string | null): Period {
  const m = (salaryRange ?? "").match(/\/\s*([a-zA-Z]+)\s*$/);
  if (!m) return "unstated";
  const raw = m[1].toLowerCase();
  const map: Record<string, Period> = {
    hour: "hour", hourly: "hour", hr: "hour",
    day: "day", daily: "day",
    week: "week", weekly: "week", wk: "week",
    month: "month", monthly: "month", mo: "month",
    season: "season", seasonal: "season",
    year: "year", yearly: "year", annum: "year", annual: "year",
    total: "total",
  };
  return map[raw] ?? "unstated";
}

/**
 * Plausible hourly bands, PER CURRENCY.
 *
 * ⚠️ A single "under minimum wage or over 100" rule cannot work here: every
 * Japanese wage on the board is between 1200 and 3500 yen, so a flat ceiling
 * of 100 would flag all 38 of them and a flat floor would flag none. The
 * floors below sit under the lowest statutory minimum in any region we carry
 * and the ceilings well above any seasonal rate, so a row crossing one is
 * worth a human look rather than an automatic deletion.
 */
const PLAUSIBLE: Record<string, { lo: number; hi: number }> = {
  CAD: { lo: 16, hi: 100 },
  JPY: { lo: 1000, hi: 10000 },
  AUD: { lo: 20, hi: 120 },
  NZD: { lo: 20, hi: 120 },
  USD: { lo: 7, hi: 100 },
  EUR: { lo: 9, hi: 100 },
  GBP: { lo: 9, hi: 100 },
};

/**
 * A housing cost as a weekly figure, so night/month/season quotes can sit in
 * one column. Only the periods the database allows (00112) are handled, and
 * anything else returns null rather than a guess.
 *
 * A month is 52/12 weeks, not 4 — "4 weeks" understates a monthly rent by 8%.
 * A season is 24 weeks, which is `JOB_POST_LIFESPAN_DAYS`-ish and roughly the
 * November–April window the listings describe; it is the one approximation
 * here, so a season-quoted cost is coarser than the rest.
 */
function toWeekly(amount: number, period: string): number | null {
  switch (period) {
    case "night": return amount * 7;
    case "week": return amount;
    case "month": return amount * 12 / 52;
    case "season": return amount / 24;
    default: return null;
  }
}

/* ─── stats ───────────────────────────────────────────────────────────── */

/** Linear-interpolation percentile, the common definition. */
function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
const r2 = (n: number) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN);

/** A stat block, or the honest refusal to show one. */
function payStats(values: number[]) {
  if (values.length < MIN_SAMPLE) {
    return { n_with_usable_pay: values.length, median: INSUFFICIENT, p25: INSUFFICIENT, p75: INSUFFICIENT };
  }
  const s = [...values].sort((a, b) => a - b);
  return {
    n_with_usable_pay: s.length,
    median: r2(pct(s, 0.5)),
    p25: r2(pct(s, 0.25)),
    p75: r2(pct(s, 0.75)),
  };
}

/** A percentage, or the refusal. Denominator must clear MIN_SAMPLE. */
function share(numerator: number, denominator: number): number | string {
  if (denominator < MIN_SAMPLE) return INSUFFICIENT;
  return r2((numerator / denominator) * 100);
}

/* ─── output ──────────────────────────────────────────────────────────── */

function csvCell(v: unknown): string {
  const s = v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v)) ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function write(name: string, rows: Array<Record<string, unknown>>) {
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify(rows, null, 2));
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
  const csv = [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n");
  writeFileSync(join(OUT, `${name}.csv`), csv + "\n");
  console.log(`  ${name.padEnd(22)} ${String(rows.length).padStart(4)} rows`);
}

/* ─── the pull ────────────────────────────────────────────────────────── */

type JobRow = {
  id: string;
  title: string;
  pay_amount: string | null;
  pay_currency: string | null;
  salary_range: string | null;
  accommodation_included: boolean;
  accommodation_type: string | null;
  accommodation_cost: string | null;
  accommodation_cost_amount: number | null;
  accommodation_cost_currency: string | null;
  accommodation_cost_period: string | null;
  accommodation_cost_deducted: boolean | null;
  housing_details: string | null;
  ski_pass_included: boolean;
  meal_perks: boolean;
  category: string | null;
  position_type: string | null;
  description: string | null;
  business_id: string;
  source: string | null;
  created_at: string;
  // ⚠️ Typed as EITHER shape. These joins are many-to-one so PostgREST sends
  // one object, but without generated types supabase-js infers an array —
  // which is why `one()` below unwraps whatever arrives. Declaring only the
  // object shape made the query itself fail to typecheck.
  resorts: Ref<{ name: string; country: string }>;
  nearby_towns: Ref<{ name: string }>;
  business_profiles: Ref<{ is_claimed: boolean | null }>;
};

type Ref<T> = T | T[] | null;

async function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

  // OPEN = published and still live. `status='active'` alone is not enough:
  // the expiry sweep runs once a day, so there is a window each day where a
  // row still says active and the listing already answers 410.
  const notExpired = `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;
  const jobs = await fetchAll<JobRow>(
    (from, to) =>
      db
        .from("job_posts")
        .select(
          "id, title, business_id, description, pay_amount, pay_currency, salary_range, accommodation_included, accommodation_type, accommodation_cost, accommodation_cost_amount, accommodation_cost_currency, accommodation_cost_period, accommodation_cost_deducted, housing_details, ski_pass_included, meal_perks, category, position_type, source, created_at, resorts(name, country), nearby_towns(name), business_profiles(is_claimed)"
        )
        .eq("status", "active")
        .or(notExpired)
        .range(from, to),
    "open jobs"
  );

  // PostgREST types a many-to-one join as an array without generated types.
  const one = <T,>(v: Ref<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  type Job = {
    id: string;
    title: string;
    role: string;
    category: string | null;
    businessId: string;
    description: string;
    housingCost: string | null;
    housingCostAmount: number | null;
    housingCostCurrency: string | null;
    housingCostPeriod: string | null;
    housingDeducted: boolean | null;
    resort: string;
    town: string;
    country: string;
    currency: string;
    amount: number | null;
    period: Period;
    hourly: number | null;
    payExcludedReason: string | null;
    housing: boolean;
    housingType: string | null;
    pass: boolean;
    meals: boolean;
    employerPosted: boolean;
    source: string | null;
    outlier: string | null;
  };

  const outliers: Array<Record<string, unknown>> = [];

  const rows: Job[] = jobs.map((j) => {
    const resort = one(j.resorts);
    const town = one(j.nearby_towns);
    const biz = one(j.business_profiles);
    const raw = (j.pay_amount ?? "").trim();
    // ⚠️ A CURRENCY ON A ROW WITH NO PAY IS NOT A CURRENCY. 177 open jobs
    // carry USD and none of them is at a US resort; it is the value stamped
    // when extraction found no pay. Grouping on it split Whistler and Niseko
    // into two rows each — one real median and one "insufficient data" for
    // the same resort. Priced rows keep their currency; the rest get none.
    const stated = (j.pay_currency ?? "").trim().toUpperCase();
    const currency = raw === "" ? "" : stated || "(none)";
    const amount = /^[0-9]+(\.[0-9]+)?$/.test(raw) ? Number(raw) : null;
    const period = periodOf(j.salary_range);

    let hourly: number | null = null;
    let payExcludedReason: string | null = null;
    let outlier: string | null = null;

    if (raw === "") {
      payExcludedReason = "no pay stated";
    } else if (amount === null) {
      payExcludedReason = "pay_amount not numeric";
    } else if (period !== "hour") {
      // ⚠️ NOT normalised. Converting a season or total figure needs the
      // hours behind it, and no column records them — only 1 of the 13
      // non-hourly rows mentions hours anywhere, and only in prose. Counted,
      // not guessed at.
      payExcludedReason = `stated per ${period}, hours not recorded`;
    } else {
      hourly = amount;
      const band = PLAUSIBLE[currency];
      if (!band) {
        outlier = `no plausibility band defined for ${currency}`;
      } else if (amount < band.lo) {
        outlier = `below ${band.lo} ${currency}/hour — under any minimum wage we cover`;
      } else if (amount > band.hi) {
        outlier = `above ${band.hi} ${currency}/hour`;
      }
    }

    // A currency that does not belong to the resort's country, on a row that
    // actually carries pay. The USD default on pay-less rows is expected and
    // is not reported here; this is the case that is genuinely wrong.
    const expected: Record<string, string> = { Canada: "CAD", Japan: "JPY", France: "EUR", USA: "USD", Australia: "AUD", "New Zealand": "NZD" };
    const want = expected[resort?.country ?? ""];
    if (raw !== "" && want && currency !== want) {
      outlier = (outlier ? outlier + "; " : "") + `currency ${currency} on a ${resort?.country} resort (expected ${want})`;
    }

    const job: Job = {
      id: j.id,
      title: j.title,
      role: roleOf((j.category ?? "").trim() || null, j.title),
      category: (j.category ?? "").trim() || null,
      businessId: j.business_id,
      description: j.description ?? "",
      housingCost: (j.accommodation_cost ?? "").trim() || null,
      housingCostAmount: j.accommodation_cost_amount,
      housingCostCurrency: (j.accommodation_cost_currency ?? "").trim() || null,
      housingCostPeriod: (j.accommodation_cost_period ?? "").trim() || null,
      housingDeducted: j.accommodation_cost_deducted,
      resort: resort?.name ?? "(no resort)",
      town: town?.name ?? "",
      country: resort?.country ?? "(no country)",
      currency,
      amount,
      period,
      hourly,
      payExcludedReason,
      housing: j.accommodation_included,
      housingType: j.accommodation_type,
      pass: j.ski_pass_included,
      meals: j.meal_perks,
      employerPosted: biz?.is_claimed === true,
      source: (j.source ?? "").trim() || null,
      outlier,
    };

    if (outlier) {
      outliers.push({
        job_id: j.id,
        title: j.title,
        resort: job.resort,
        country: job.country,
        currency,
        pay_amount: raw,
        salary_range: j.salary_range ?? "",
        period,
        reason: outlier,
        note: "kept in the dataset, not dropped — listed here for a human to check",
      });
    }
    return job;
  });

  /** Rows whose pay is usable as an hourly figure, outliers included. */
  const usable = (rs: Job[]) => rs.filter((r) => r.hourly !== null).map((r) => r.hourly as number);

  const group = <K extends string>(rs: Job[], key: (r: Job) => K) => {
    const m = new Map<K, Job[]>();
    for (const r of rs) {
      const k = key(r);
      const list = m.get(k) ?? [];
      list.push(r);
      m.set(k, list);
    }
    return m;
  };

  console.log(`\nOpen jobs analysed: ${rows.length}\n`);
  console.log("Files written to ./aeo-data/:");

  /* (a) pay_by_resort ─ currencies kept apart, never converted */
  // One row per resort. Checked against production first: no resort has more
  // than one currency among its PRICED jobs, because a resort sits in one
  // country — so splitting by currency could only ever separate real pay from
  // the pay-less USD default, which is not a currency difference.
  const payByResort = [...group(rows, (r) => r.resort).entries()]
    .map(([resort, rs]) => {
      const currencies = [...new Set(rs.filter((r) => r.hourly !== null).map((r) => r.currency))];
      return {
        resort,
        town: rs.find((r) => r.town)?.town ?? "",
        country: rs[0].country,
        currency: currencies.length === 0 ? "(no pay stated)" : currencies.join(" + "),
        job_count: rs.length,
        ...payStats(usable(rs)),
        n_pay_excluded_non_hourly: rs.filter((r) => r.payExcludedReason?.startsWith("stated per")).length,
        n_no_pay_stated: rs.filter((r) => r.payExcludedReason === "no pay stated").length,
      };
    })
    .sort((a, b) => b.job_count - a.job_count || a.resort.localeCompare(b.resort));
  write("pay_by_resort", payByResort);

  /* (a2) pay_by_town — buildable since migration 00113.
     A worker searches for somewhere to LIVE, so the town is the question
     behind "what does a season pay?". It was unanswerable while
     nearby_town_id was NULL on 354 of 355 listings. Towns with no listing
     carrying a town are simply absent rather than rendered empty. */
  const payByTown = [...group(rows.filter((r) => r.town), (r) => r.town).entries()]
    .map(([town, rs]) => {
      const currencies = [...new Set(rs.filter((r) => r.hourly !== null).map((r) => r.currency))];
      return {
        town,
        country: rs[0].country,
        resorts: [...new Set(rs.map((r) => r.resort))].join(" + "),
        currency: currencies.length === 0 ? "(no pay stated)" : currencies.join(" + "),
        job_count: rs.length,
        ...payStats(usable(rs)),
        pct_offering_housing: share(rs.filter((r) => r.housing).length, rs.length),
        town_source: "job_posts.nearby_town_id, inherited from the business where the town is linked to the job's resort (00113)",
      };
    })
    .sort((a, b) => b.job_count - a.job_count || a.town.localeCompare(b.town));
  write("pay_by_town", payByTown);

  /* (b) pay_by_role_country */
  const payByRole = [...group(rows, (r) => `${r.role}||${r.country}`).entries()]
    .map(([k, rs]) => {
      const [role, country] = k.split("||");
      const currencies = [...new Set(rs.filter((r) => r.hourly !== null).map((r) => r.currency))];
      return {
        role_category: role,
        country,
        currency: currencies.length === 0 ? "(no pay stated)" : currencies.join(" + "),
        job_count: rs.length,
        ...payStats(usable(rs)),
        role_source: "job_posts.category, with the title classifier as fallback (lib/jobs/category.ts)",
      };
    })
    .sort((a, b) => b.job_count - a.job_count || a.role_category.localeCompare(b.role_category));
  write("pay_by_role_country", payByRole);

  /* (c) housing_by_resort */
  const housingByResort = [...group(rows, (r) => r.resort).entries()]
    .map(([resort, rs]) => ({
      resort,
      country: rs[0].country,
      job_count: rs.length,
      pct_offering_housing: share(rs.filter((r) => r.housing).length, rs.length),
      n_offering_housing: rs.filter((r) => r.housing).length,
      most_common_housing_type:
        rs.length < MIN_SAMPLE
          ? INSUFFICIENT
          : [...group(rs.filter((r) => r.housingType), (r) => r.housingType as string).entries()].sort(
              (a, b) => b[1].length - a[1].length
            )[0]?.[0] ?? "not stated",
      // Weekly, so resorts quoting per night/month/season are comparable.
      // ⚠️ Currencies are NOT converted, so a resort is only summarised when
      // its priced listings agree on one — which they do, a resort being in
      // one country.
      ...(() => {
        const priced = rs.filter((r) => r.housingCostAmount !== null && r.housingCostPeriod);
        const currencies = [...new Set(priced.map((r) => r.housingCostCurrency))];
        const weekly = priced
          .map((r) => toWeekly(r.housingCostAmount as number, r.housingCostPeriod as string))
          .filter((n): n is number => n !== null)
          .sort((a, b) => a - b);
        const known = rs.filter((r) => r.housingDeducted !== null);
        return {
          housing_cost_currency: currencies.length === 1 ? currencies[0] ?? "" : currencies.join(" + "),
          n_with_housing_cost: priced.length,
          median_weekly_housing_cost:
            weekly.length >= MIN_SAMPLE ? r2(pct(weekly, 0.5)) : INSUFFICIENT,
          n_deduction_stated: known.length,
          pct_housing_deducted_from_pay: share(known.filter((r) => r.housingDeducted).length, known.length),
        };
      })(),
    }))
    .sort((a, b) => b.job_count - a.job_count || a.resort.localeCompare(b.resort));
  write("housing_by_resort", housingByResort);

  /* (d) perks_by_resort */
  const perksByResort = [...group(rows, (r) => r.resort).entries()]
    .map(([resort, rs]) => ({
      resort,
      country: rs[0].country,
      job_count: rs.length,
      pct_with_ski_pass: share(rs.filter((r) => r.pass).length, rs.length),
      pct_with_meals: share(rs.filter((r) => r.meals).length, rs.length),
      n_with_ski_pass: rs.filter((r) => r.pass).length,
      n_with_meals: rs.filter((r) => r.meals).length,
    }))
    .sort((a, b) => b.job_count - a.job_count || a.resort.localeCompare(b.resort));
  write("perks_by_resort", perksByResort);

  /* (e) coverage, split by who posted it */
  const slice = (label: string, rs: Job[]) => ({
    segment: label,
    jobs: rs.length,
    pct_of_board: share(rs.length, rows.length),
    with_usable_hourly_pay: rs.filter((r) => r.hourly !== null).length,
    pct_with_usable_hourly_pay: share(rs.filter((r) => r.hourly !== null).length, rs.length),
    pay_stated_but_not_hourly: rs.filter((r) => r.payExcludedReason?.startsWith("stated per")).length,
    no_pay_stated: rs.filter((r) => r.payExcludedReason === "no pay stated").length,
    with_housing_flag_true: rs.filter((r) => r.housing).length,
    pct_offering_housing: share(rs.filter((r) => r.housing).length, rs.length),
    with_housing_type_stated: rs.filter((r) => r.housingType).length,
    pct_with_any_housing_info: share(rs.filter((r) => r.housing || r.housingType).length, rs.length),
    role_classified: rs.filter((r) => r.role !== "Other / unclassified").length,
    pct_role_classified: share(rs.filter((r) => r.role !== "Other / unclassified").length, rs.length),
  });

  const coverage = [
    slice("ALL open jobs", rows),
    slice("employer-posted (business claimed)", rows.filter((r) => r.employerPosted)),
    slice("sourced / unclaimed", rows.filter((r) => !r.employerPosted)),
    ...[...group(rows, (r) => r.country).entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([c, rs]) => slice(`country: ${c}`, rs)),
  ];
  write("coverage", coverage);
  write("outliers", outliers);

  /* ─── summary ───────────────────────────────────────────────────────── */

  const housingBy = new Map(housingByResort.map((h) => [h.resort, h]));
  console.log("\nTop 10 resorts by open job count\n");
  console.log(
    `  ${"resort".padEnd(28)} ${"country".padEnd(8)} ${"jobs".padStart(5)} ${"median pay".padStart(14)} ${"housing".padStart(9)}`
  );
  for (const r of payByResort.slice(0, 10)) {
    const med = typeof r.median === "number" ? `${r.median} ${r.currency}/h` : INSUFFICIENT;
    const h = housingBy.get(r.resort);
    const hp = typeof h?.pct_offering_housing === "number" ? `${h.pct_offering_housing}%` : "n/a";
    console.log(
      `  ${r.resort.slice(0, 28).padEnd(28)} ${r.country.slice(0, 8).padEnd(8)} ${String(r.job_count).padStart(5)} ${med.padStart(14)} ${hp.padStart(9)}`
    );
  }

  const all = coverage[0];
  /**
   * ⚠️ EVERY LINE HERE IS MEASURED AND CONDITIONAL.
   *
   * These were static sentences describing problems that were real when the
   * script was written. After migration 00109 fixed the currency default the
   * report went on announcing "pay_currency is a DEFAULT, not a fact: 0 open
   * jobs say USD" and "0 rows are flagged in outliers.csv — check them",
   * which is the same failure as a stale literal on a public page: a number
   * that cannot go wrong loudly. A problem that no longer exists must stop
   * being printed, and a clean result should say so.
   */
  const usdRows = rows.filter((r) => r.currency === "USD" && r.country !== "USA").length;
  const noCategory = rows.length - rows.filter((r) => r.category).length;
  const housingCosts = rows.map((r) => r.housingCost).filter(Boolean) as string[];
  const mentionsRent = rows.filter((r) => /deduct|rent is|rent of|rent:|per week|\/week|weekly rent/i.test(r.description)).length;
  const nonHourly = rows.filter((r) => r.payExcludedReason?.startsWith("stated per"));
  const nonHourlyWithHours = nonHourly.filter((r) => /\d{1,2}\s*(hours|hrs)\s*(per|a|\/)\s*week|hours per week/i.test(r.description)).length;
  const noTown = rows.filter((r) => !r.town).length;
  const unclaimed = rows.filter((r) => !r.employerPosted).length;
  const employerPosted = rows.length - unclaimed;
  const sources = [...new Set(rows.map((r) => r.source || "(none)"))];

  const dupKeys = new Map<string, number>();
  for (const r of rows) {
    const k = `${r.businessId}||${r.title.trim().toLowerCase()}`;
    dupKeys.set(k, (dupKeys.get(k) ?? 0) + 1);
  }
  const dupes = [...dupKeys.values()].filter((n) => n > 1).length;

  const sameTitleResort = new Map<string, Set<string>>();
  for (const r of rows) {
    const k = `${r.title.trim().toLowerCase()}||${r.resort}`;
    const set = sameTitleResort.get(k) ?? new Set<string>();
    set.add(r.businessId);
    sameTitleResort.set(k, set);
  }
  const sharedTitles = [...sameTitleResort.values()].filter((s) => s.size > 1).length;

  const problems: string[] = [];
  const clean: string[] = [];

  (usdRows > 0 ? problems : clean).push(
    usdRows > 0
      ? `${usdRows} open jobs are priced in USD at a non-US resort. Before migration 00109 this was 177 of 341, because pay_currency carried a column default of 'USD' and the importer omitted the field when it found no currency — so USD meant "no pay found". If it is back, check that default and lib/jobs/currency.ts.`
      : `pay_currency is clean: no USD outside the USA, and every currency on the board denominates an actual amount. Migration 00109 dropped the 'USD' column default that made it mean "no pay found".`
  );

  // A handful of unclassifiable titles is the designed outcome, not a fault;
  // this only becomes a problem again if the column starts emptying out.
  const categoryGap = noCategory / Math.max(rows.length, 1);
  (categoryGap > 0.1 ? problems : clean).push(
    categoryGap > 0.1
      ? `job_posts.category is empty on ${noCategory} of ${rows.length} open jobs. It looks populated only because /jobs defaults blanks to "Other" in its view model — before migration 00110 that hid 354 of 355. Check that the import route is still calling categoryForTitle.`
      : `job_posts.category is populated on ${rows.length - noCategory} of ${rows.length} open jobs; the ${noCategory} without one carry titles with no signal ("Team Member", "Support Staff"), which is left NULL deliberately rather than labelled "Other".`
  );

  const costed = rows.filter((r) => r.housingCostAmount !== null).length;
  const deductionKnown = rows.filter((r) => r.housingDeducted !== null).length;
  (costed < MIN_SAMPLE ? problems : clean).push(
    costed < MIN_SAMPLE
      ? `Housing COST is stated on ${costed} of ${rows.length} open jobs, so no resort clears the ${MIN_SAMPLE}-listing floor and "staff housing cost by resort" is still unpublishable. The columns exist (migration 00112) and the extractor now asks for it, but only re-scraped listings carry it — ${mentionsRent} descriptions mention rent in prose and were captured before the field existed.`
      : `Housing cost is stated on ${costed} of ${rows.length} open jobs and aggregates per resort in housing_by_resort.csv.`
  );
  (deductionKnown < MIN_SAMPLE ? problems : clean).push(
    deductionKnown < MIN_SAMPLE
      ? `Whether housing is DEDUCTED FROM PAY is stated on ${deductionKnown} of ${rows.length} open jobs. The column exists (00112) and is NULLABLE with no default, so "unknown" stays unknown rather than becoming "no" — which means the stat simply cannot be published yet rather than being quietly wrong.`
      : `Housing deduction is stated on ${deductionKnown} of ${rows.length} open jobs.`
  );

  if (nonHourly.length > 0) {
    problems.push(
      `${nonHourly.length} jobs state pay per season/total/month with no hours recorded anywhere, so they cannot be made hourly — ${nonHourlyWithHours} of them mention${nonHourlyWithHours === 1 ? "s" : ""} hours even in prose. Excluded from pay stats and counted in every file.`
    );
  }

  problems.push(
    `${unclaimed} of ${rows.length} open jobs belong to unclaimed imported businesses, and job_posts.source is ${sources.length === 1 ? `"${sources[0]}" for all of them` : sources.map((s) => `"${s}"`).join(" / ")}. The employer-posted segment is ${employerPosted} job${employerPosted === 1 ? "" : "s"}${employerPosted >= MIN_SAMPLE ? ` — it clears the ${MIN_SAMPLE}-job floor, so its percentages render in coverage.csv while resting on ${employerPosted} rows. Treat them as indicative, not publishable` : `, below the ${MIN_SAMPLE}-job floor, so those splits read "${INSUFFICIENT}"`}, and do not caption the board as employer-reported pay.`
  );

  const towned = rows.length - noTown;
  const townsOverFloor = [...group(rows.filter((r) => r.town), (r) => r.town).entries()].filter(
    ([, rs]) => rs.filter((r) => r.hourly !== null).length >= MIN_SAMPLE
  );
  (townsOverFloor.length === 0 ? problems : clean).push(
    townsOverFloor.length === 0
      ? `Only ${towned} of ${rows.length} open jobs carry a nearby_town_id and no town has ${MIN_SAMPLE} priced listings, so "pay by town" is still unpublishable. A town can only be inherited from a business that has one AND is linked to the job's resort (00113).`
      : `${towned} of ${rows.length} open jobs carry a town, and ${townsOverFloor.length} town${townsOverFloor.length === 1 ? "" : "s"} clear the ${MIN_SAMPLE}-listing floor for pay: ${townsOverFloor.map(([t, rs]) => `${t} (${rs.filter((r) => r.hourly !== null).length})`).join(", ")}. See pay_by_town.csv.`
  );

  (outliers.length > 0 ? problems : clean).push(
    outliers.length > 0
      ? `${outliers.length} row${outliers.length === 1 ? " is" : "s are"} flagged in outliers.csv and left in the dataset. A wage below minimum, or a currency that does not match the country, usually means a bad extraction rather than a bad employer.`
      : `No outliers: every hourly wage sits inside its currency's plausible band and every currency matches its resort's country.`
  );

  (dupes > 0 ? problems : clean).push(
    dupes > 0
      ? `${dupes} (business + title) pairs appear more than once among open jobs — the importer's idempotency has slipped. See lib/admin/business-by-email.ts and the import_key lookup.`
      : `No duplicate (business + title) open listings, so the importer's idempotency is holding. ${sharedTitles} title+resort pairs are shared across DIFFERENT businesses, which is two pubs both hiring a bartender rather than a duplicate.`
  );

  if (problems.length > 0) {
    console.log("\nData-quality problems to fix before publishing\n");
  } else {
    console.log("\nNo data-quality problems found.\n");
  }
  problems.forEach((p, i) => console.log(`  ${i + 1}. ${p}\n`));

  if (clean.length > 0) {
    console.log("Checks that came back clean — stated so they do not get 'fixed' by mistake\n");
    clean.forEach((c) => console.log(`  ✓ ${c}\n`));
  }
}

main().catch((err) => {
  console.error("aeo-data-pull failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});

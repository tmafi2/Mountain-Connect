import { createPublicClient } from "@/lib/supabase/public";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import {
  MIN_LISTINGS,
  percentile,
  round2,
  toWeekly,
  type TownPay,
} from "./pay-by-town";

/**
 * What open listings say about pay and housing, grouped by mountain town.
 *
 * ⚠️ THE PERIOD COMES FROM `salary_range`, NEVER FROM THE NUMBER. Every
 * priced row carries a generated `"{CUR} {amount}/{period}"`, and reading the
 * suffix is the only safe way: "JPY 3500/hour" is about CAD 32, so any rule
 * that infers "a big number means annual" mislabels the entire Japanese
 * board. Rows priced per season or per total are EXCLUDED, not normalised —
 * no column records the hours behind them.
 *
 * ⚠️ OUTLIERS ARE EXCLUDED FROM THE MEDIAN AND COUNTED, not dropped quietly.
 * A wage under the lowest minimum in that currency's region, or absurdly
 * above it, is almost always a bad extraction rather than a real offer, and
 * one of them in a five-listing town moves the median a long way.
 */

/** Plausible hourly bands per currency. A flat ceiling cannot work: every
 *  Japanese wage on this board is between 1200 and 3500 yen. */
const PLAUSIBLE: Record<string, { lo: number; hi: number }> = {
  CAD: { lo: 16, hi: 100 },
  JPY: { lo: 1000, hi: 10000 },
  AUD: { lo: 20, hi: 120 },
  NZD: { lo: 20, hi: 120 },
  EUR: { lo: 9, hi: 100 },
  USD: { lo: 7, hi: 100 },
  GBP: { lo: 9, hi: 100 },
  CHF: { lo: 15, hi: 150 },
};

/** PostgREST sends a many-to-one join as one object, but infers as an array
 *  without generated types — so both shapes are declared and unwrapped once. */
type Join<T> = T | T[] | null;
type TownRef = { name: string; slug: string; country: string | null };
type ResortRef = { name: string; country: string | null };

type Row = {
  salary_range: string | null;
  pay_amount: string | null;
  pay_currency: string | null;
  accommodation_included: boolean;
  accommodation_cost_amount: number | null;
  accommodation_cost_period: string | null;
  nearby_towns: Join<TownRef>;
  resorts: Join<ResortRef>;
};

const one = <T,>(v: Join<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export type PayByTownResult = {
  towns: TownPay[];
  /** Open listings that carry a town at all — the denominator for the page. */
  listingsWithTown: number;
  /** Excluded from medians as implausible. Reported, never silently dropped. */
  outliersExcluded: number;
  generatedAt: string;
};

export const EMPTY_PAY_BY_TOWN: PayByTownResult = {
  towns: [],
  listingsWithTown: 0,
  outliersExcluded: 0,
  generatedAt: "",
};

export async function getPayByTown(): Promise<PayByTownResult> {
  try {
    const supabase = createPublicClient();

    // ⚠️ Must agree with lib/jobs/expired-gone.ts: the expiry sweep runs once
    // a day, so there is always a window where a row still says active and
    // /jobs/<id> already answers 410. Quoting those inflates every count.
    const notExpired = `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;
    const rows = await fetchAllRows<Row>(
      (from, to) =>
        supabase
          .from("job_posts")
          .select(
            "salary_range, pay_amount, pay_currency, accommodation_included, accommodation_cost_amount, accommodation_cost_period, nearby_towns!inner(name, slug, country), resorts(name, country)"
          )
          .eq("status", "active")
          .or(notExpired)
          .range(from, to),
      "pay-by-town"
    );

    const byTown = new Map<string, Row[]>();
    for (const r of rows) {
      const t = one(r.nearby_towns);
      if (!t?.slug) continue;
      const list = byTown.get(t.slug) ?? [];
      list.push(r);
      byTown.set(t.slug, list);
    }

    let outliersExcluded = 0;

    const towns: TownPay[] = [...byTown.entries()].map(([slug, rs]) => {
      const town = one(rs[0].nearby_towns) as TownRef;
      const resorts = [
        ...new Set(rs.map((r) => one(r.resorts)?.name).filter(Boolean)),
      ] as string[];
      const country =
        town.country ?? one(rs[0].resorts)?.country ?? "";

      // Hourly rates only, read from the salary_range suffix.
      const hourly: number[] = [];
      const currencies = new Set<string>();
      for (const r of rs) {
        if (!/\/hour$/.test(r.salary_range ?? "")) continue;
        const amount = Number((r.pay_amount ?? "").trim());
        if (!Number.isFinite(amount)) continue;
        const code = (r.pay_currency ?? "").trim().toUpperCase();
        const band = PLAUSIBLE[code];
        if (band && (amount < band.lo || amount > band.hi)) {
          outliersExcluded++;
          continue;
        }
        hourly.push(amount);
        if (code) currencies.add(code);
      }
      hourly.sort((a, b) => a - b);

      const weekly = rs
        .map((r) =>
          r.accommodation_cost_amount !== null && r.accommodation_cost_amount > 0
            ? toWeekly(r.accommodation_cost_amount, r.accommodation_cost_period)
            : null
        )
        .filter((n): n is number => n !== null)
        .sort((a, b) => a - b);

      const enough = hourly.length >= MIN_LISTINGS;
      return {
        town: town.name,
        slug,
        country,
        resorts,
        jobCount: rs.length,
        pricedCount: hourly.length,
        // One code or none: a town sits in one country, so a mixture would be
        // a data fault rather than something to average across.
        currency: currencies.size === 1 ? [...currencies][0] : null,
        medianHourly: enough ? round2(percentile(hourly, 0.5)) : null,
        p25Hourly: enough ? round2(percentile(hourly, 0.25)) : null,
        p75Hourly: enough ? round2(percentile(hourly, 0.75)) : null,
        pctWithHousing:
          rs.length >= MIN_LISTINGS
            ? round2((rs.filter((r) => r.accommodation_included).length / rs.length) * 100)
            : null,
        medianWeeklyHousing:
          weekly.length >= MIN_LISTINGS ? round2(percentile(weekly, 0.5)) : null,
        housingCostCount: weekly.length,
      };
    });

    return {
      towns,
      listingsWithTown: rows.length,
      outliersExcluded,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    // Fails to NO DATA, never to a remembered figure — the page renders its
    // "we could not read the board" state rather than last week's wages.
    console.error("pay-by-town: unavailable:", err);
    return EMPTY_PAY_BY_TOWN;
  }
}

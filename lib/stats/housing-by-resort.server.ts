import { createPublicClient } from "@/lib/supabase/public";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { MIN_LISTINGS, percentile, round2, share, toWeekly } from "./figures";
import type { ResortHousing } from "./housing-by-resort";

/**
 * Staff accommodation on the open board, grouped by resort.
 *
 * By RESORT rather than by town, unlike the pay page, and for a dull reason:
 * every listing has a resort while only 76 of 355 carry a town. Housing is
 * also a property of the employer rather than of the place you live, so the
 * resort is the honest axis for it.
 */

type Join<T> = T | T[] | null;
type ResortRef = { name: string; country: string | null; legacy_id: string | null };
type TownRef = { name: string };

type Row = {
  accommodation_included: boolean;
  accommodation_type: string | null;
  accommodation_cost_amount: number | null;
  accommodation_cost_currency: string | null;
  accommodation_cost_period: string | null;
  accommodation_cost_deducted: boolean | null;
  ski_pass_included: boolean | null;
  meal_perks: boolean | null;
  resorts: Join<ResortRef>;
  nearby_towns: Join<TownRef>;
};

const one = <T,>(v: Join<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export type HousingResult = {
  resorts: ResortHousing[];
  listingsConsidered: number;
  /** Listings stating any housing cost at all — the honest denominator. */
  listingsWithCost: number;
  generatedAt: string;
};

export const EMPTY_HOUSING: HousingResult = {
  resorts: [],
  listingsConsidered: 0,
  listingsWithCost: 0,
  generatedAt: "",
};

export async function getHousingByResort(): Promise<HousingResult> {
  try {
    const supabase = createPublicClient();

    // ⚠️ Must agree with lib/jobs/expired-gone.ts. The expiry sweep runs once
    // a day, so there is always a window where a row still says active and
    // /jobs/<id> already answers 410.
    const notExpired = `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;
    const rows = await fetchAllRows<Row>(
      (from, to) =>
        supabase
          .from("job_posts")
          .select(
            "accommodation_included, accommodation_type, accommodation_cost_amount, accommodation_cost_currency, accommodation_cost_period, accommodation_cost_deducted, ski_pass_included, meal_perks, resorts!inner(name, country, legacy_id), nearby_towns(name)"
          )
          .eq("status", "active")
          .or(notExpired)
          .range(from, to),
      "housing-by-resort"
    );

    const byResort = new Map<string, Row[]>();
    for (const r of rows) {
      const name = one(r.resorts)?.name;
      if (!name) continue;
      const list = byResort.get(name) ?? [];
      list.push(r);
      byResort.set(name, list);
    }

    const resorts: ResortHousing[] = [...byResort.entries()].map(([name, rs]) => {
      const ref = one(rs[0].resorts) as ResortRef;

      // ⚠️ CHARGED AND FREE ARE TWO LISTS, NOT ONE. A median over both says
      // "free" at any resort where most listings waive the rent, while some
      // still charge — see the note in housing-by-resort.ts.
      const chargedWeekly: number[] = [];
      let freeCount = 0;
      const currencies = new Set<string>();
      for (const r of rs) {
        if (r.accommodation_cost_amount === null) continue;
        if (r.accommodation_cost_amount === 0) {
          freeCount++;
          continue;
        }
        const w = toWeekly(r.accommodation_cost_amount, r.accommodation_cost_period);
        // A cost with no period cannot be compared with anything, so it is
        // left out of the median rather than silently treated as weekly.
        if (w === null) continue;
        chargedWeekly.push(w);
        const code = (r.accommodation_cost_currency ?? "").trim().toUpperCase();
        if (code) currencies.add(code);
      }
      chargedWeekly.sort((a, b) => a - b);

      const typed = rs.map((r) => (r.accommodation_type ?? "").trim()).filter(Boolean);
      const typeCounts = new Map<string, number>();
      for (const t of typed) typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
      const commonType =
        typed.length >= MIN_LISTINGS
          ? [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
          : null;

      const deductionStated = rs.filter((r) => r.accommodation_cost_deducted !== null);
      const offering = rs.filter((r) => r.accommodation_included).length;
      const passes = rs.filter((r) => r.ski_pass_included === true).length;
      const meals = rs.filter((r) => r.meal_perks === true).length;

      return {
        resort: name,
        resortId: ref.legacy_id,
        country: ref.country ?? "",
        towns: [...new Set(rs.map((r) => one(r.nearby_towns)?.name).filter(Boolean))] as string[],
        jobCount: rs.length,
        offeringCount: offering,
        pctOffering: share(offering, rs.length),
        commonType,
        typedCount: typed.length,
        chargedCount: chargedWeekly.length,
        medianWeeklyCost:
          chargedWeekly.length >= MIN_LISTINGS ? round2(percentile(chargedWeekly, 0.5)) : null,
        // One code or none: a resort sits in one country, so a mixture would
        // be a data fault rather than something to average across.
        currency: currencies.size === 1 ? [...currencies][0] : null,
        freeCount,
        deductionStatedCount: deductionStated.length,
        deductedCount: deductionStated.filter((r) => r.accommodation_cost_deducted === true).length,
        passCount: passes,
        mealsCount: meals,
        pctWithPass: share(passes, rs.length),
        pctWithMeals: share(meals, rs.length),
      };
    });

    return {
      resorts,
      listingsConsidered: rows.length,
      listingsWithCost: rows.filter((r) => r.accommodation_cost_amount !== null).length,
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    // Fails to NO DATA, never to a remembered figure.
    console.error("housing-by-resort: unavailable:", err);
    return EMPTY_HOUSING;
  }
}

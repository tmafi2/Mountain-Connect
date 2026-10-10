import { createPublicClient } from "@/lib/supabase/public";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { getPlatformStats } from "@/lib/stats/platform-stats.server";
import type { LiveFigures } from "./live-figures";

/**
 * The current state of the board, as strings a guide can drop into a line.
 *
 * ⚠️ RETURNS null RATHER THAN ZEROS when it cannot read. The renderer drops
 * every figures line on null, so a guide with the database down reads as
 * prose rather than as a page insisting the board is empty.
 */
export async function getLiveFigures(): Promise<LiveFigures | null> {
  try {
    const supabase = createPublicClient();
    const notExpired = `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;

    type Row = {
      pay_amount: string | null;
      salary_range: string | null;
      accommodation_included: boolean | null;
      accommodation_cost_amount: number | null;
      ski_pass_included: boolean | null;
      meal_perks: boolean | null;
      resorts: { country: string | null } | { country: string | null }[] | null;
    };
    const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

    const [rows, platform] = await Promise.all([
      fetchAllRows<Row>(
        (from, to) =>
          supabase
            .from("job_posts")
            .select(
              "pay_amount, salary_range, accommodation_included, accommodation_cost_amount, ski_pass_included, meal_perks, resorts(country)"
            )
            .eq("status", "active")
            .or(notExpired)
            .range(from, to),
        "live-figures"
      ),
      getPlatformStats(),
    ]);

    if (rows.length === 0) return null;

    const n = (v: number) => v.toLocaleString("en-GB");
    const inCountry = (c: string) =>
      rows.filter((r) => one(r.resorts)?.country === c).length;

    return {
      openJobs: n(rows.length),
      canadaJobs: n(inCountry("Canada")),
      japanJobs: n(inCountry("Japan")),
      pricedJobs: n(rows.filter((r) => /\/hour$/.test(r.salary_range ?? "")).length),
      // ⚠️ === true throughout. These columns are tri-state since 00114/00115
      // and NULL means the advert did not say, which is most of the board.
      withHousing: n(rows.filter((r) => r.accommodation_included === true).length),
      housingSilent: n(rows.filter((r) => r.accommodation_included === null).length),
      withPass: n(rows.filter((r) => r.ski_pass_included === true).length),
      passSilent: n(rows.filter((r) => r.ski_pass_included === null).length),
      withMeals: n(rows.filter((r) => r.meal_perks === true).length),
      housingCostStated: n(rows.filter((r) => r.accommodation_cost_amount !== null).length),
      resorts: n(platform.resorts),
      countries: n(platform.countries),
      towns: n(platform.towns),
      updated: new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  } catch (err) {
    console.error("live-figures: unavailable:", err);
    return null;
  }
}

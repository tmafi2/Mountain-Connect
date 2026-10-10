import { createPublicClient } from "@/lib/supabase/public";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { share } from "./figures";
import { totals, type PerkTotals, type ResortPerks } from "./perks-by-resort";

/**
 * Season passes and staff meals, as stated by open listings.
 *
 * ⚠️ THIS COUNTS ADVERTS, NOT JOBS. `ski_pass_included` and `meal_perks` are
 * `NOT NULL DEFAULT false` and the import route omits the field when the
 * advert is silent, so a `false` cannot be told apart from "never mentioned".
 * Everything here is therefore phrased as "says", and `silentOnPass` below
 * measures how much of that `false` really is silence.
 */

type Join<T> = T | T[] | null;
type ResortRef = { name: string; country: string | null; legacy_id: string | null };

type Row = {
  ski_pass_included: boolean | null;
  meal_perks: boolean | null;
  accommodation_included: boolean;
  resorts: Join<ResortRef>;
};

const one = <T,>(v: Join<T>): T | null => (Array.isArray(v) ? v[0] ?? null : v);

export type PerksResult = {
  resorts: ResortPerks[];
  totals: PerkTotals;
  generatedAt: string;
};

export const EMPTY_PERKS: PerksResult = {
  resorts: [],
  totals: {
    listings: 0, saysPass: 0, saysMeals: 0, saysEither: 0,
    silentOnPass: 0, pctSaysPass: null, pctSaysMeals: null,
  },
  generatedAt: "",
};

export async function getPerksByResort(): Promise<PerksResult> {
  try {
    const supabase = createPublicClient();

    // ⚠️ Must agree with lib/jobs/expired-gone.ts — see the other stats
    // modules. An expired-but-active row answers 410 and must not be counted.
    const notExpired = `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;
    const rows = await fetchAllRows<Row>(
      (from, to) =>
        supabase
          .from("job_posts")
          .select(
            "ski_pass_included, meal_perks, accommodation_included, resorts!inner(name, country, legacy_id)"
          )
          .eq("status", "active")
          .or(notExpired)
          .range(from, to),
      "perks-by-resort"
    );

    const byResort = new Map<string, Row[]>();
    for (const r of rows) {
      const name = one(r.resorts)?.name;
      if (!name) continue;
      const list = byResort.get(name) ?? [];
      list.push(r);
      byResort.set(name, list);
    }

    const resorts: ResortPerks[] = [...byResort.entries()].map(([name, rs]) => {
      const ref = one(rs[0].resorts) as ResortRef;
      const saysPass = rs.filter((r) => r.ski_pass_included === true).length;
      const saysMeals = rs.filter((r) => r.meal_perks === true).length;
      return {
        resort: name,
        resortId: ref.legacy_id,
        country: ref.country ?? "",
        jobCount: rs.length,
        saysPass,
        saysMeals,
        saysBoth: rs.filter((r) => r.ski_pass_included === true && r.meal_perks === true).length,
        saysHousing: rs.filter((r) => r.accommodation_included).length,
        pctSaysPass: share(saysPass, rs.length),
        pctSaysMeals: share(saysMeals, rs.length),
      };
    });

    // ⚠️ NOW EXACT, where it used to be a guess. Before migration 00114 the
    // column was NOT NULL DEFAULT false, so "the advert is silent" had to be
    // inferred by searching the text for the word "pass" — which missed the
    // Chinese-language listings that offer a 季票. The column itself answers
    // it now: NULL means the advert did not say.
    const silentOnPass = rows.filter((r) => r.ski_pass_included === null).length;

    return {
      resorts,
      totals: totals(resorts, rows.length, silentOnPass),
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error("perks-by-resort: unavailable:", err);
    return EMPTY_PERKS;
  }
}

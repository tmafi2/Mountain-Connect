import { createPublicClient } from "@/lib/supabase/public";

/**
 * How many live jobs one country has, and how many of them include staff
 * accommodation. For the campaign hero, which until now carried no number at
 * all: "Seasonal jobs. Mountain towns. New people. New places." is atmosphere,
 * and a cold visitor never learned the jobs existed. 88% left before touching
 * the quiz, measured across 700+ visitors.
 *
 * ⚠️ COUNTS THE `accommodation_included` FLAG, which is also exactly what
 * /jobs?accommodation=yes filters on. That matters more than being
 * conservative: the hero's number and the board the visitor lands on must
 * agree. Nine of the Canadian listings carrying the flag do not mention
 * housing anywhere in their text (58 of 67 do, as of 2026-10-08), so the flag
 * is not perfect — but quoting 58 while the filtered board shows 67 would be a
 * worse kind of wrong.
 *
 * `createPublicClient`, not the user-scoped one: the campaign page is
 * deliberately `revalidate = 600` so a burst of paid traffic costs nothing per
 * visit, and a cookie-reading client would force it dynamic.
 *
 * ⚠️ FAILS TO ZERO, and the hero renders NO LINE at zero rather than "—".
 * This page is an advert; a dash reads as broken, a missing line reads as
 * nothing at all. See the build-time note in platform-stats.ts — a prerender
 * has no Supabase keys, so zero is a state that really happens.
 */
export interface CountryJobStats {
  /** Live job posts whose resort or nearby town is in this country. */
  liveJobs: number;
  /** How many of those say accommodation is included. */
  withAccommodation: number;
}

export const NO_COUNTRY_STATS: CountryJobStats = { liveJobs: 0, withAccommodation: 0 };

export async function getCountryJobStats(country: string): Promise<CountryJobStats> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("job_posts")
      .select("accommodation_included, resorts(country), nearby_towns(country)")
      .eq("status", "active");
    if (error || !data) {
      console.error("country-job-stats: query failed:", error?.message);
      return NO_COUNTRY_STATS;
    }

    // Both joins are many-to-one, so PostgREST returns an object; without
    // generated types supabase-js assumes an array. Accept either, the same
    // way lib/jobs/live-countries.ts does.
    type Ref = { country: string | null } | null;
    const one = (v: Ref | Ref[]): Ref => (Array.isArray(v) ? v[0] : v);

    let liveJobs = 0;
    let withAccommodation = 0;
    for (const row of data as unknown as Array<{
      accommodation_included: boolean | null;
      resorts: Ref | Ref[];
      nearby_towns: Ref | Ref[];
    }>) {
      // The town is the source of truth for where a business is and trumps the
      // resort link (see 00074), so it is checked first.
      const where = one(row.nearby_towns)?.country ?? one(row.resorts)?.country;
      if (where !== country) continue;
      liveJobs++;
      if (row.accommodation_included) withAccommodation++;
    }
    return { liveJobs, withAccommodation };
  } catch (err) {
    console.error("country-job-stats: unavailable:", err);
    return NO_COUNTRY_STATS;
  }
}

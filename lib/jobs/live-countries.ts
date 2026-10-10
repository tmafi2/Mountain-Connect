import { createPublicClient } from "@/lib/supabase/public";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

/**
 * Countries with at least one live job, spelled as `resorts.country` spells
 * them — which is what `/jobs?country=` filters on.
 *
 * WHY IT IS SHARED: `browseJobsHref` in lib/campaigns/season-quiz.ts filters
 * to a country ONLY when that country appears in this list, because a filter
 * that returns nothing reads as "there is no work here" — worse than showing
 * everything. Two callers need that list now: the campaign landing page, which
 * had its own private copy of this query, and worker onboarding, which sends a
 * new worker straight to the board. Of the six destinations the quiz offers,
 * three (USA, Australia, New Zealand) currently have no live jobs at all, so
 * the check is not theoretical.
 *
 * ⚠️ FAILS OPEN TO AN EMPTY ARRAY, and that is the safe direction: an empty
 * list means every caller falls back to the unfiltered board. This must never
 * be the thing that stops a page rendering or sends someone nowhere.
 */
export async function countriesWithLiveJobs(): Promise<string[]> {
  try {
    const supabase = createPublicClient();
    // ⚠️ Paged. A plain select stops at 1000 rows with no error, so a country
    // whose listings all sat past the cap would silently vanish from this
    // list — and the callers would then filter it off the board. The DISTINCT
    // is over a joined column, so no head count can do this.
    const rows = await fetchAllRows<unknown>(
      (from, to) =>
        supabase.from("job_posts").select("resorts(country)").eq("status", "active").range(from, to),
      "live-countries"
    );
    // job_posts → resorts is many-to-one, so PostgREST returns one object;
    // without generated types supabase-js assumes an array. Accept both.
    type ResortRef = { country: string | null } | null;
    const countries = new Set<string>();
    for (const row of rows as Array<{ resorts: ResortRef | ResortRef[] }>) {
      const resort = Array.isArray(row.resorts) ? row.resorts[0] : row.resorts;
      if (resort?.country) countries.add(resort.country);
    }
    return [...countries].sort();
  } catch {
    return [];
  }
}

/**
 * Whether a business page is worth offering a search engine.
 *
 * ⚠️ A LIVE JOB IS CONTENT, and this is the part that looks wrong at a glance:
 * 163 of the 164 businesses with live listings have no description and no
 * logo. They are not thin pages — the listings ARE the page. Judging a
 * business on its profile fields alone would drop the most useful business
 * pages on the site.
 *
 * Claiming, on its own, is not content. It used to be enough, which admitted
 * 13 claimed businesses with no live listing — 8 of them with no description
 * either, so the page was a name and nothing else. A claimed business between
 * seasons keeps its entry if someone has actually written something.
 */

/** Characters of description that count as "someone wrote something". */
export const DESCRIPTION_MIN = 80;

export function businessBelongsInSitemap(
  biz: { id: string; is_claimed?: boolean | null; description?: string | null },
  businessesWithLiveJobs: ReadonlySet<string>,
): boolean {
  if (businessesWithLiveJobs.has(biz.id)) return true;
  return Boolean(biz.is_claimed) && (biz.description?.trim().length ?? 0) >= DESCRIPTION_MIN;
}

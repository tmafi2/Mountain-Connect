/**
 * Which guides belong on which page.
 *
 * ⚠️ WHY THIS EXISTS. Before it, exactly three pages on the whole site linked
 * to an individual blog post, and all three were the data pages. The 14
 * country pages, 111 resort pages and 89 town pages linked to none — so a
 * guide was reachable from one place only, a reverse-chronological index
 * where every post sinks as the next one is published. The writing was done;
 * nothing pointed at it.
 *
 * ⚠️ THE SLUGS HERE ARE NOT TRUSTED. A static list can name a post that was
 * since unpublished or renamed, and then our own country pages serve 404s to
 * readers and to Google. `related-guides.server.ts` checks every slug against
 * `blog_posts` before anything renders, and drops what it cannot find.
 */

export type GuideScope =
  | { kind: "country"; country: string }
  | { kind: "resort"; country: string }
  | { kind: "town" };

type Entry = {
  slug: string;
  /** Countries this guide is specifically about. Empty = it applies anywhere. */
  countries: string[];
  /** True when the guide is about living somewhere rather than a country. */
  town?: boolean;
};

/**
 * Order matters: the country-specific entries come first so a country page
 * leads with the guide written about it, and the general ones fill the rest.
 *
 * ⚠️ THREE OLDER POSTS ARE DELIBERATELY ABSENT — `first-ski-season-survival-guide`
 * (350 words), `australian-ski-season-packing-list` (562) and
 * `how-to-land-your-first-ski-resort-job` (581), against 800-2,000 for
 * everything here. Linking them from 200+ pages would put the site's weight
 * behind its thinnest pages. Add them once they are rewritten.
 */
const GUIDES: Entry[] = [
  { slug: "australian-working-holiday-visa-ski-season", countries: ["Australia"] },
  { slug: "new-zealand-vs-australia-ski-season-pay", countries: ["Australia", "New Zealand"] },
  { slug: "best-ski-resorts-to-work-at-in-canada", countries: ["Canada"] },
  { slug: "canada-ski-season-checklist-what-to-sort-before-you-go", countries: ["Canada"] },
  { slug: "doing-a-ski-season-at-big-white", countries: ["Canada"] },
  { slug: "canada-vs-japan-ski-season", countries: ["Canada", "Japan"] },
  { slug: "two-ski-seasons-in-one-year", countries: [] },
  { slug: "questions-to-ask-before-accepting-ski-season-job", countries: [], town: true },
  { slug: "is-a-ski-season-worth-it", countries: [], town: true },
  { slug: "how-to-find-ski-season-accommodation", countries: [], town: true },
  { slug: "how-to-set-up-in-a-ski-town-on-a-budget", countries: [], town: true },
  { slug: "how-to-avoid-ski-job-scams", countries: [] },
];

/** Normalised so "USA" and "United States" are one country, as elsewhere. */
function sameCountry(a: string, b: string): boolean {
  const n = (s: string) =>
    s.trim().toLowerCase().replace(/^the /, "").replace(/^(usa|united states of america)$/, "united states");
  return n(a) === n(b);
}

/**
 * The slugs to offer on a page, most relevant first.
 *
 * A town page gets the guides about living and earning somewhere; a country
 * or resort page leads with anything written about that country.
 */
export function guideSlugsFor(scope: GuideScope, limit = 3): string[] {
  if (scope.kind === "town") {
    return GUIDES.filter((g) => g.town).map((g) => g.slug).slice(0, limit);
  }
  const specific = GUIDES.filter((g) => g.countries.some((c) => sameCountry(c, scope.country)));
  const general = GUIDES.filter((g) => g.countries.length === 0);
  // ⚠️ Country-specific guides lead, but never fill the list. Canada has
  // three posts of its own and carries over half the open board, so without
  // this cap the country where most readers actually are would never be
  // shown "what to ask before you accept" or the scams guide.
  const leading = general.length > 0 ? Math.max(1, limit - 1) : limit;
  return [...specific.slice(0, leading), ...general].map((g) => g.slug).slice(0, limit);
}

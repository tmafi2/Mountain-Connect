/**
 * What each post is about, as a few words a reader can scan.
 *
 * ⚠️ DISPLAY ONLY — THERE ARE NO TAG PAGES, DELIBERATELY. At 15 posts every
 * grouping produces buckets of one to four, and a `/blog/tag/{x}` route would
 * be a list of links with no content of its own. This site has twice been hurt
 * by thin public pages: the `/employers` directory that read as 89%
 * placeholders, and the retired business shells in `sitemap.xml`. Chips that
 * filter the existing index cost no new URLs and no migration.
 *
 * ⚠️ A FILTER CHIP CARRIES ITS COUNT. The `/jobs` category filter rendered two
 * options for 355 jobs (00110), and a worker reads an empty filter as "there
 * is nothing here". A reader can see "Canada 4" before deciding to click.
 *
 * ⚠️ THIS IS A STATIC MAP, SO A NEW POST HAS NO TAGS UNTIL IT IS ADDED HERE.
 * That is the trade for not adding a column and an admin UI to carry three
 * words per post. A post with no entry shows no chips rather than a wrong one.
 */

/** The whole vocabulary. Keep it short — a tag per post is not a tag. */
export const TAGS = [
  "Canada",
  "Japan",
  "Australia",
  "New Zealand",
  "Pay",
  "Housing",
  "Visas",
  "Getting hired",
  "Planning",
  "Scams",
] as const;

export type Tag = (typeof TAGS)[number];

/** At most three, so a card is still a card and not a wall of labels. */
const BY_SLUG: Record<string, Tag[]> = {
  "australian-working-holiday-visa-ski-season": ["Visas", "Australia"],
  "new-zealand-vs-australia-ski-season-pay": ["Pay", "Australia", "New Zealand"],
  "two-ski-seasons-in-one-year": ["Planning", "Visas"],
  "questions-to-ask-before-accepting-ski-season-job": ["Getting hired", "Pay", "Housing"],
  "is-a-ski-season-worth-it": ["Pay", "Housing", "Planning"],
  "how-to-avoid-ski-job-scams": ["Scams", "Getting hired"],
  "best-ski-resorts-to-work-at-in-canada": ["Canada", "Getting hired"],
  "canada-ski-season-checklist-what-to-sort-before-you-go": ["Canada", "Planning"],
  "doing-a-ski-season-at-big-white": ["Canada", "Planning"],
  "canada-vs-japan-ski-season": ["Canada", "Japan", "Planning"],
  "how-to-find-ski-season-accommodation": ["Housing"],
  "how-to-set-up-in-a-ski-town-on-a-budget": ["Housing", "Planning"],
  "how-to-land-your-first-ski-resort-job": ["Getting hired"],
  "australian-ski-season-packing-list": ["Australia", "Planning"],
  "first-ski-season-survival-guide": ["Planning"],
};

/** A post's tags, or none. Never a guess. */
export function tagsFor(slug: string): Tag[] {
  return BY_SLUG[slug] ?? [];
}

/** Every tag in use, with how many posts carry it — most used first. */
export function tagCounts(slugs: string[]): { tag: Tag; count: number }[] {
  const counts = new Map<Tag, number>();
  for (const s of slugs) for (const t of tagsFor(s)) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

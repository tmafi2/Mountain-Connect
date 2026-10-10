/**
 * The address of a resort page.
 *
 * /resorts/<id> accepts TWO ids for the same resort: the legacy id the static
 * `resorts` array is keyed on ("11"), and the database UUID. Both rendered a
 * full page, so nothing looked broken — but the same resort sat at two urls,
 * and which one a link used depended on whether the data behind it came from
 * `lib/data/resorts.ts` or from a Supabase `resorts` select.
 *
 * The legacy form is the real one. Everything else already uses it: all 111
 * urls in sitemap.xml, the country pages, the region pages, the regions
 * dropdown, the globe and the job detail page. Town pages were the one place
 * emitting the UUID form, four links each across 89 towns, and the job board
 * panel built its link from `job_posts.resort_id`, which is also a UUID.
 *
 * Fixing the links is half of it; /resorts/<uuid> now answers a permanent
 * redirect to the legacy form, so the duplicate cannot be linked back into
 * existence from somewhere this helper does not reach.
 */

/**
 * Build the path for a resort, preferring the legacy id.
 *
 * The UUID fallback is deliberate rather than defensive theatre: it keeps a
 * link working if `legacy_id` is ever absent, because the UUID form still
 * resolves (it redirects). Returning `/resorts/null` would be a 404, which is
 * strictly worse than a redirect.
 *
 * All 111 resort rows carry a legacy id today, and every one of them matches
 * an entry in the static array — checked against production, because a row
 * whose legacy id has no static entry would 404 on BOTH forms.
 */
export function resortPath(legacyId: string | null | undefined, uuid: string): string {
  const id = legacyId && legacyId.trim() !== "" ? legacyId : uuid;
  return `/resorts/${id}`;
}

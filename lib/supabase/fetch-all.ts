/**
 * Read every row, not the first thousand.
 *
 * ⚠️ THIS PROJECT SETS PostgREST's db-max-rows, AND IT IS SILENT. A select
 * against a 1377-row table returns 1000 rows with no error, no warning and no
 * truncation flag. Measured against production on 2026-10-10, not assumed —
 * along with both ways round it: a `{ count: "exact", head: true }` count is
 * computed by the database and comes back 1377, and `.range()` pages past it.
 *
 * So `data.length` is not a row count and `data` is not a table. Both are
 * correct right up until the table crosses a line nothing reports, and then
 * they are quietly wrong — a sitemap missing urls, a job board missing jobs,
 * a counter understating the platform. That is the same shape as the bug that
 * left "69 resorts" on a live page for five months, and the same shape as the
 * sitemap shipping 150 urls instead of 628 (57fb081).
 *
 * THE RULE:
 *   - a pure count            -> { count: "exact", head: true }, never .length
 *   - rows you actually need  -> this helper
 *   - genuinely want the top N -> .limit(N), which says so out loud
 *
 * It throws rather than returning a short list, because a partial read that
 * looks like a small table is the whole problem.
 */

/** PostgREST's page size here. Asking for more per page does not help: the
 *  server caps the response regardless of what the client requests. */
export const PAGE_SIZE = 1000;

/** Guards a runaway loop if a filter ever makes `range` non-progressing.
 *  200 pages is 200k rows — far beyond anything this app reads at once. */
const MAX_PAGES = 200;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/**
 * @param build called once per page with an inclusive `[from, to]` range,
 *              and must apply it with `.range(from, to)`.
 * @param label used in the thrown message so a failure names its caller.
 */
export async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<PageResult<T>>,
  label: string
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`${label}: ${error.message}`);
    const rows = data ?? [];
    all.push(...rows);
    // A short page is the last page. An exactly-full one might not be, so it
    // always costs one more request to find out.
    if (rows.length < PAGE_SIZE) return all;
  }
  throw new Error(`${label}: still reading after ${MAX_PAGES} pages — refusing to loop`);
}

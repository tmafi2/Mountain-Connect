/**
 * One-click unsubscribe headers, the kind Gmail and Yahoo require of anyone
 * sending bulk mail.
 *
 * The outreach emails carried an unsubscribe LINK in their footer and no
 * List-Unsubscribe header at all, so the provider could not offer its own
 * "Unsubscribe" button beside the sender name. Without that button the only
 * exit a recipient has is "Report spam", and on 2026-09-20 outreach stood at
 * 219 emails to 41 scraped addresses — 5.3 touches each — which is exactly
 * the traffic that teaches Gmail to file the whole domain as spam.
 *
 * Two headers are needed, not one. `List-Unsubscribe` offers the addresses,
 * and `List-Unsubscribe-Post` is what promises the https one is safe to POST
 * without asking the recipient anything. A mailto on its own does not satisfy
 * the requirement.
 */

/**
 * Tyler's own address, on purpose (2026-09-20). It used to be
 * unsubscribe@mountainconnects.com, an address nothing proves is a real
 * mailbox — and a mailto unsubscribe that bounces is worse than none, since
 * the recipient's next move is "Report spam". The https one-click address is
 * what providers use anyway; this is the fallback for clients that only do
 * mailto. The subject stays "Unsubscribe" so it filters in one rule.
 */
export const UNSUBSCRIBE_MAILTO = "mailto:tyler@mountainconnects.com?subject=Unsubscribe";

const PAGE_PATH = "/unsubscribe/";
const ONE_CLICK_PATH = "/api/unsubscribe/";

/** Tokens are per-lead values from outreach_leads.unsubscribe_token. */
const TOKEN = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * The POST endpoint that matches a footer link. Callers already build
 * `{BASE_URL}/unsubscribe/{token}` for the footer, so deriving keeps the
 * two in step instead of asking five call sites to pass both.
 *
 * Returns null for anything that isn't one of our links — a caller that
 * changes the footer URL shape gets no header rather than a broken one.
 */
export function oneClickUrlFrom(pageUrl: string): string | null {
  const at = pageUrl.indexOf(PAGE_PATH);
  if (at === -1) return null;

  const token = pageUrl.slice(at + PAGE_PATH.length);
  if (!TOKEN.test(token)) return null;

  return pageUrl.slice(0, at) + ONE_CLICK_PATH + token;
}

/**
 * Headers for one outreach email. Falls back to the mailto alone when the
 * link isn't one we recognise, which is still better than no header.
 */
export function unsubscribeHeaders(pageUrl: string): Record<string, string> {
  const oneClick = oneClickUrlFrom(pageUrl);
  if (!oneClick) {
    return { "List-Unsubscribe": `<${UNSUBSCRIBE_MAILTO}>` };
  }

  return {
    "List-Unsubscribe": `<${oneClick}>, <${UNSUBSCRIBE_MAILTO}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}

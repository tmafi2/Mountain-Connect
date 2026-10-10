import { createPublicClient } from "@/lib/supabase/public";

/**
 * Whether a job URL should answer 410 Gone.
 *
 * WHY 410 AND NOT 404: a listing that has expired WAS at this address and is
 * permanently finished. 410 tells a crawler to drop it immediately, where 404
 * is "maybe it will come back" and is retried for weeks. Google's job-posting
 * guidance accepts either, but an expired seasonal role is the textbook case
 * for Gone.
 *
 * ⚠️ WHY THIS LIVES IN MIDDLEWARE. An App Router page cannot set a status
 * code: `notFound()` is 404 and its only siblings are `forbidden()` (403) and
 * `unauthorized()` (401). There is no `gone()`. The documented place for a
 * request-time status is middleware, so that is where it goes.
 *
 * ⚠️ IT FAILS OPEN. Any error, timeout or unreadable row returns false and the
 * page renders as normal. Wrongly serving 410 on a live listing would delete
 * it from search results; wrongly serving the page for a few hours costs
 * nothing. The page itself carries a backstop check, so an expired listing is
 * still never rendered as if it were open.
 *
 * ONLY expiry produces 410. A draft, an owner-paused listing or a filled role
 * is left to the page, which answers 404 — those were never, or are not
 * permanently, gone.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The job id in a /jobs/<uuid> path, or null for anything else. */
export function jobIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/jobs\/([^/?#]+)\/?$/);
  const id = m?.[1];
  return id && UUID.test(id) ? id : null;
}

/** True only when the row is definitely an expired listing. */
export function isExpired(row: {
  status?: string | null;
  paused_reason?: string | null;
  expires_at?: string | null;
}, now: Date = new Date()): boolean {
  if (row.paused_reason === "expired") return true;
  // Past its date but the daily sweep has not run yet — still gone, as far as
  // a visitor and a crawler are concerned.
  if (row.expires_at && new Date(row.expires_at) <= now) return true;
  return false;
}

export async function jobIsGone(id: string): Promise<boolean> {
  try {
    const { data, error } = await createPublicClient()
      .from("job_posts")
      .select("status, paused_reason, expires_at")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return false;
    return isExpired(data);
  } catch {
    return false;
  }
}

/** The body served with a 410. Plain and small; crawlers read the status. */
export const GONE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="robots" content="noindex"><title>This role has closed</title>
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#3d4f5f">
<div style="text-align:center;padding:24px">
<h1 style="margin:0 0 8px;font-size:22px;color:#0a1e33">This role has closed</h1>
<p style="margin:0 0 20px;font-size:15px">The listing is no longer accepting applications.</p>
<a href="/jobs" style="display:inline-block;border-radius:8px;background:#3b9ede;padding:10px 20px;color:#fff;font-weight:700;text-decoration:none">Browse open roles</a>
</div></body></html>`;

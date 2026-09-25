import type { FunnelEvent } from "./track";
import { metaPixelAllowedOn } from "./meta-pixel";

/**
 * The half of the funnel that does not depend on a cookie banner.
 *
 * GA4 and the Meta Pixel load only after the banner is accepted, and the
 * banner blocks nothing, so almost nobody answers it — 23–24 September it saw
 * 7 people on a page 117 real visitors reached. Every rate computed from that
 * data describes the ~6% who tapped Accept, who are by definition the most
 * engaged people on the page.
 *
 * This sends the same events to our own server instead, where a count with no
 * identifier attached is a count rather than tracking: no cookie is read or
 * written, nothing is stored that could pick one visitor out of the traffic,
 * and so it measures everybody. See 00106 for what the table may never hold.
 *
 * FIRE AND FORGET. Beacon first, because a click on a link unloads the page
 * and a normal fetch dies with it — sendBeacon is the one request the browser
 * promises to finish. Every failure is swallowed: a missing number is a
 * missing number, an exception in an analytics call is a broken landing page.
 */

const ENDPOINT = "/api/campaign-event";

export interface ServerFunnelBody {
  event: FunnelEvent;
  destination?: string;
  season?: string;
  work_type?: string;
  placement?: string;
}

export function recordServerSide(event: FunnelEvent, params: Record<string, string>): void {
  if (typeof window === "undefined") return;

  // Production only, for the same reason the Meta Pixel is: a developer
  // clicking through the quiz on localhost, or a preview deployment being
  // smoke-tested, would land in the same table as real ad traffic and there
  // is nothing in a row to tell them apart afterwards. Reusing the pixel's
  // host list keeps the two from drifting.
  if (!metaPixelAllowedOn(window.location?.hostname)) return;

  const body: ServerFunnelBody = { event };
  for (const key of ["destination", "season", "work_type", "placement"] as const) {
    const v = params[key];
    if (v) body[key] = v;
  }

  try {
    const payload = JSON.stringify(body);
    // sendBeacon takes a Blob; the type matters because the route parses JSON.
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const ok = navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
      if (ok) return;
      // A false return means the browser refused it (usually a queue limit),
      // so fall through rather than lose the event silently.
    }
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Deliberately silent — see above.
  }
}

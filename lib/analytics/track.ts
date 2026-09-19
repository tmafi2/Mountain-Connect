/**
 * Funnel events for paid-traffic landing pages.
 *
 * WHERE THEY GO: Google Analytics 4, the only analytics this site loads.
 * components/ui/CookieConsent.tsx injects gtag.js once a visitor accepts
 * cookies and NEXT_PUBLIC_GA_MEASUREMENT_ID is set (it is, in production).
 * Until then window.gtag does not exist and nothing is sent.
 *
 * WHY THERE IS A QUEUE: the view event fires on load, while the cookie banner
 * is still up, so without one it would be lost for nearly every visitor.
 * Events raised before consent wait in memory — never in storage — and go out
 * with the next event after gtag appears. Nothing leaves the device unless the
 * visitor accepts; after a decline the queue is discarded with the page.
 *
 * WHAT IS NOT HERE: there is no Meta Pixel on this site, and this file does
 * not pretend there is. To add one, load it behind the same consent check in
 * CookieConsent (and allow connect.facebook.net in the CSP in next.config.ts),
 * then forward from send() below. `Lead` on worker_signup_clicked is the event
 * to optimise the campaign for.
 *
 * NO PERSONAL DATA: FunnelProps is a closed set of keys, and cleanProps drops
 * anything else, so a caller cannot slip an email or a name into an event.
 */

export type FunnelEvent =
  | "go_for_a_season_view"
  | "find_my_season_started"
  | "destination_selected"
  | "season_selected"
  | "work_type_selected"
  | "find_my_season_completed"
  | "worker_signup_clicked"
  | "browse_jobs_clicked";

export interface FunnelProps {
  destination?: string;
  season?: string;
  work_type?: string;
  /** Which button on the page: "hero", "result", "final", "header"… */
  placement?: string;
}

const PROP_KEYS = ["destination", "season", "work_type", "placement"] as const;
const MAX_QUEUE = 50;

type Gtag = (command: "event", name: string, params: Record<string, string>) => void;

const queue: Array<[FunnelEvent, Record<string, string>]> = [];

export function cleanProps(props: FunnelProps): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of PROP_KEYS) {
    const v = props[key];
    if (typeof v === "string" && v) out[key] = v.slice(0, 64);
  }
  return out;
}

function send(gtag: Gtag, event: FunnelEvent, params: Record<string, string>) {
  gtag("event", event, params);
}

export function track(event: FunnelEvent, props: FunnelProps = {}): void {
  if (typeof window === "undefined") return;
  const params = cleanProps(props);

  if (process.env.NODE_ENV === "development") {
    console.debug("[track]", event, params);
  }

  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") {
    if (queue.length < MAX_QUEUE) queue.push([event, params]);
    return;
  }
  while (queue.length > 0) {
    const [queuedEvent, queuedParams] = queue.shift()!;
    send(gtag, queuedEvent, queuedParams);
  }
  send(gtag, event, params);
}

/** Test-only: the events still waiting for consent. */
export function pendingEventsForTest(): ReadonlyArray<[FunnelEvent, Record<string, string>]> {
  return queue;
}

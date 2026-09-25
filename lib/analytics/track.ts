/**
 * Funnel events for paid-traffic landing pages and the signup they lead to.
 *
 * WHERE THEY GO: Google Analytics 4 and the Meta Pixel, and only after the
 * visitor accepts cookies — components/ui/CookieConsent.tsx loads both behind
 * the banner (GA4 when NEXT_PUBLIC_GA_MEASUREMENT_ID is set, the pixel on the
 * production domain; see lib/analytics/meta-pixel.ts). Until a script loads,
 * its window.gtag / window.fbq does not exist and nothing is sent to it.
 *
 * WHY THERE ARE QUEUES: the view event fires on load, while the cookie banner
 * is still up, so without them it would be lost for nearly every visitor.
 * Events raised before consent wait in memory — never in storage — and go out
 * with the next event after a destination appears. Each destination has its
 * own queue, because the two scripts load independently: one flushing first
 * must not take the other's events with it. Nothing leaves the device unless
 * the visitor accepts; after a decline the queues are discarded with the page.
 *
 * META: the two moments the ads are optimised for go as Meta's standard events
 * — `Lead` when someone taps "Create my free profile", `CompleteRegistration`
 * when a worker account is actually created. Everything else goes as a custom
 * event under its own name, for building audiences (e.g. finished the quiz but
 * did not sign up).
 *
 * NO PERSONAL DATA: FunnelProps is a closed set of keys, and cleanProps drops
 * anything else, so a caller cannot slip an email or a name into an event.
 */

import { recordServerSide } from "./server-funnel";

/**
 * The closed set, as a value as well as a type: POST /api/campaign-event is a
 * public write endpoint and validates against this, so the list cannot drift
 * from what the client is allowed to send.
 */
export const FUNNEL_EVENTS = [
  "go_for_a_season_view",
  "find_my_season_started",
  "destination_selected",
  "season_selected",
  "work_type_selected",
  "find_my_season_completed",
  "worker_signup_clicked",
  "browse_jobs_clicked",
  "worker_signup_completed",
] as const;

export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];

export interface FunnelProps {
  destination?: string;
  season?: string;
  work_type?: string;
  /** Which button on the page: "hero", "result", "final", "header"… */
  placement?: string;
}

const PROP_KEYS = ["destination", "season", "work_type", "placement"] as const;
const MAX_QUEUE = 50;

/** Meta's standard event for a funnel event, where one fits; the rest are custom. */
export const META_STANDARD_EVENTS: Partial<Record<FunnelEvent, string>> = {
  worker_signup_clicked: "Lead",
  worker_signup_completed: "CompleteRegistration",
};

type Params = Record<string, string>;
type Queued = [FunnelEvent, Params];
type Gtag = (command: "event", name: string, params: Params) => void;
type Fbq = (command: "track" | "trackCustom", name: string, params: Params) => void;

const queues: Record<"ga" | "meta", Queued[]> = { ga: [], meta: [] };

export function cleanProps(props: FunnelProps): Params {
  const out: Params = {};
  for (const key of PROP_KEYS) {
    const v = props[key];
    if (typeof v === "string" && v) out[key] = v.slice(0, 64);
  }
  return out;
}

function sendToMeta(fbq: Fbq, event: FunnelEvent, params: Params) {
  const standard = META_STANDARD_EVENTS[event];
  if (standard) fbq("track", standard, params);
  else fbq("trackCustom", event, params);
}

/** Delivers whatever each destination has waiting, if its script has loaded. */
function flush() {
  const w = window as unknown as { gtag?: Gtag; fbq?: Fbq };
  if (typeof w.gtag === "function") {
    for (const [event, params] of queues.ga.splice(0)) w.gtag("event", event, params);
  }
  if (typeof w.fbq === "function") {
    for (const [event, params] of queues.meta.splice(0)) sendToMeta(w.fbq, event, params);
  }
}

export function track(event: FunnelEvent, props: FunnelProps = {}): void {
  if (typeof window === "undefined") return;
  const params = cleanProps(props);

  if (process.env.NODE_ENV === "development") {
    console.debug("[track]", event, params);
  }

  // Our own server first, and WITHOUT the consent gate below — a count with no
  // identifier attached is not tracking, so it measures everybody rather than
  // the minority who answer the cookie banner. It is deliberately outside the
  // queues: those exist to hold events until a consent-gated script appears,
  // and this has nothing to wait for.
  recordServerSide(event, params);

  for (const queue of Object.values(queues)) {
    if (queue.length < MAX_QUEUE) queue.push([event, params]);
  }
  flush();
}

/** Test-only: the events each destination still has waiting. */
export function pendingEventsForTest(): Readonly<Record<"ga" | "meta", ReadonlyArray<Queued>>> {
  return queues;
}

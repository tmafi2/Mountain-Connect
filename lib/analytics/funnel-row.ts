import { FUNNEL_EVENTS } from "./track";
import { isInAppBrowser } from "@/lib/utils/in-app-browser";
import { looksLikeBot } from "@/lib/campaigns/visit-log";

/**
 * Turns an untrusted POST body into a campaign_events row, or nothing.
 *
 * POST /api/campaign-event is public and unauthenticated, because the
 * visitors it measures are. Validation is therefore the real defence and not
 * the rate limiter: the event must be one of nine known names and every
 * property is length- and character-checked, so the worst an abuser achieves
 * is inflating a count they cannot read.
 *
 * Pure, so those rules can be tested without a request or a database — the
 * part that has to hold is "nothing unexpected reaches the table", and that
 * should be provable rather than asserted.
 */

const EVENTS = new Set<string>(FUNNEL_EVENTS);
const PROP_KEYS = ["destination", "season", "work_type", "placement"] as const;

/**
 * Quiz values and placements are slugs and short words. Anything else is not
 * ours, whoever sent it.
 *
 * The comma is in the set because question 3 takes several answers and they
 * arrive joined ("hospitality,retail"). Leaving it out silently dropped
 * work_type for every multi-select answer — caught by the test below, not by
 * anything that would have shown up in the data until somebody wondered why
 * the column was always empty. 64 matches cleanProps in track.ts, which
 * truncates there before sending; all five selectable work types joined come
 * to 59 characters.
 */
const SAFE_VALUE = /^[a-zA-Z0-9 ,_-]{1,64}$/;

export interface CampaignEventRow {
  event: string;
  destination?: string;
  season?: string;
  work_type?: string;
  placement?: string;
  in_app_browser: boolean;
  likely_bot: boolean;
}

export function buildEventRow(input: unknown, userAgent: string | null | undefined): CampaignEventRow | null {
  if (!input || typeof input !== "object") return null;
  const body = input as Record<string, unknown>;

  const event = typeof body.event === "string" ? body.event : "";
  if (!EVENTS.has(event)) return null;

  const row: CampaignEventRow = {
    event,
    // Derived from the request and then thrown away: the user agent itself is
    // never stored, only these two answers about it.
    in_app_browser: isInAppBrowser(userAgent),
    likely_bot: looksLikeBot(userAgent),
  };

  for (const key of PROP_KEYS) {
    const value = body[key];
    if (typeof value === "string" && SAFE_VALUE.test(value)) row[key] = value;
  }
  return row;
}

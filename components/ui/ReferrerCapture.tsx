"use client";

import { useEffect, useRef } from "react";
import { captureReferrer } from "@/lib/campaigns/referrer";

/**
 * Records the referring HOST on a visitor's first page, once. Renders nothing.
 *
 * Mounted in the root layout rather than on a single page because the landing
 * page is whatever Google sent them to — /ski-resort-jobs/italy as readily as
 * the homepage — and by the time anyone reaches /signup the referrer is our
 * own host. Capture has to happen wherever they arrive.
 *
 * ⚠️ Deliberately NOT inside the cookie banner's consent gate, and that is the
 * same call `campaign_visits` made in migration 00105: this stores a hostname
 * and a timestamp in the visitor's own browser, with no identifier of any
 * kind, and it is read once if and when that person chooses to create an
 * account. Consent-gating it would blind it to exactly the traffic it exists
 * to measure, which is how GA4 came to see 7 visitors out of 117.
 *
 * Everything here is best effort — `captureReferrer` goes through safe-storage,
 * which cannot throw. A referrer we fail to record costs a number; a cookie
 * banner that threw once took whole pages down (see lib/utils/safe-storage.ts).
 */
export default function ReferrerCapture() {
  // Guards React's development double-effect, as CampaignCapture does.
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    try {
      captureReferrer(document.referrer, window.location.hostname);
    } catch {
      // Never let attribution break a page render.
    }
  }, []);

  return null;
}

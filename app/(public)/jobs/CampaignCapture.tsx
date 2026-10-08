"use client";

import { useEffect, useRef } from "react";
import { captureSignupContextFromUrl } from "@/lib/campaigns/signup-context-store";

/**
 * Picks up a campaign context left in the URL by "Browse jobs" on a landing
 * page, and re-saves it here. Renders nothing.
 *
 * WHY /jobs OF ALL PAGES: it is the one page paid traffic reaches by a route
 * that is not the signup link, and it is the more popular of the two — 57 taps
 * on "Browse jobs" against 8 on "Create my profile" over 25 Sep - 8 Oct 2026.
 * Before this, that route carried the attribution only in localStorage, which
 * for an audience arriving in the Instagram and Facebook in-app browsers is
 * the transport least likely to survive. Capturing again here gives it a
 * second write, at the point the visitor is actually browsing.
 *
 * It is deliberately NOT initSignupContext: a visitor who arrives at /jobs
 * from Google carries no campaign parameters, and nothing here may invent an
 * attribution for them. With no parameters it does nothing at all.
 */
export default function CampaignCapture() {
  // Guards the dev-mode double effect, as LandingInit does.
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    captureSignupContextFromUrl("jobs");
  }, []);

  return null;
}

"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/track";
import { initSignupContext } from "@/lib/campaigns/signup-context-store";

/**
 * Runs once when the page mounts: captures the ad's UTMs from the URL before
 * anything can navigate away from it, and records the view. Renders nothing.
 */
export default function LandingInit() {
  // Guards the dev-mode double effect so one visit is one view.
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    initSignupContext("go-for-a-season");
    track("go_for_a_season_view");
  }, []);

  return null;
}

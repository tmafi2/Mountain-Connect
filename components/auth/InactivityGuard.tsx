"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const INACTIVITY_LIMIT = 55 * 60 * 1000; // 55 minutes — show warning
const LOGOUT_GRACE = 5 * 60 * 1000;      // 5 more minutes — auto logout
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
const THROTTLE_MS = 30_000; // only update last-active every 30s to avoid perf overhead

export default function InactivityGuard() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(300); // seconds remaining
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivity = useRef(Date.now());

  const clearAllTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  }, []);

  const handleLogout = useCallback(async () => {
    clearAllTimers();
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login?reason=inactive";
  }, [clearAllTimers]);

  const startWarningCountdown = useCallback(() => {
    setShowWarning(true);
    setCountdown(Math.floor(LOGOUT_GRACE / 1000));

    countdownInterval.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    logoutTimer.current = setTimeout(handleLogout, LOGOUT_GRACE);
  }, [handleLogout]);

  const resetTimers = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    lastActivity.current = Date.now();

    warningTimer.current = setTimeout(startWarningCountdown, INACTIVITY_LIMIT);
  }, [clearAllTimers, startWarningCountdown]);

  // Set up activity listeners
  useEffect(() => {
    let lastThrottled = Date.now();

    const onActivity = () => {
      const now = Date.now();
      // Throttle: only reset timers if enough time has passed since last reset
      if (now - lastThrottled < THROTTLE_MS) return;
      lastThrottled = now;

      // Don't reset if warning is already showing — user must click the button
      if (!showWarning) {
        resetTimers();
      }
    };

    // Initial timer
    resetTimers();

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true })
    );

    return () => {
      clearAllTimers();
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, onActivity)
      );
    };
  }, [showWarning, resetTimers, clearAllTimers]);

  const handleStayLoggedIn = () => {
    resetTimers();
  };

  if (!showWarning) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-primary">Session Expiring</h2>
          <p className="mt-2 text-sm text-foreground/60">
            You&apos;ve been inactive for a while. For your security, you&apos;ll be logged out soon.
          </p>

          {/* Countdown */}
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-2xl font-bold text-amber-700 tabular-nums">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </p>
            <p className="text-xs text-amber-600 mt-1">remaining before auto logout</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleStayLoggedIn}
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Stay Logged In
          </button>
          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-accent py-3 text-sm font-medium text-foreground/60 transition-colors hover:bg-accent/20"
          >
            Log Out Now
          </button>
        </div>
      </div>
    </div>
  );
}

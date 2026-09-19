"use client";

import { useSyncExternalStore } from "react";
import {
  contextFromParams,
  loadSignupContext,
  mergeContexts,
  saveSignupContext,
  type SignupContext,
} from "./attribution";
import type { SeasonAnswers } from "./season-quiz";

/**
 * The campaign context for the page being viewed, shared by every signup link
 * on it — the header's Sign up (rendered by the layout), the quiz result and
 * the final CTA. A module-level store rather than React context because the
 * header sits in the layout, outside any provider the page could render.
 *
 * It works without storage: the in-memory copy is what the links read, and
 * localStorage is only the backup for a later visit.
 */

let current: SignupContext | null = null;
const listeners = new Set<() => void>();

function publish(next: SignupContext | null) {
  current = next;
  if (next) saveSignupContext(next);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Called once when a landing page mounts: reads UTMs (and any answers) from
 * the URL and merges them over whatever an earlier visit stored. Always
 * attributes to `source` — the page being viewed now.
 */
export function initSignupContext(source: string): void {
  const fromUrl = contextFromParams(new URLSearchParams(window.location.search), source);
  const merged = mergeContexts(fromUrl, loadSignupContext());
  const now = Date.now();
  publish({
    source,
    utm: merged?.utm,
    answers: merged?.answers,
    capturedAt: now,
  });
}

export function setSeasonAnswers(answers: SeasonAnswers): void {
  publish({
    source: current?.source ?? "go-for-a-season",
    utm: current?.utm,
    answers,
    capturedAt: Date.now(),
  });
}

/** Null during server render and hydration; the real context after mount. */
export function useSignupContext(): SignupContext | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

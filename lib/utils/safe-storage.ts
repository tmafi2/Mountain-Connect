/**
 * localStorage / sessionStorage that cannot throw.
 *
 * Reading `window.localStorage` is not merely empty when storage is
 * unavailable — it THROWS. Safari in private mode, Chrome with third-party
 * cookies blocked, embedded webviews (the in-app browsers in Facebook and
 * Instagram, which is how a lot of seasonal workers arrive here) and
 * enterprise policy all raise SecurityError on the property access itself,
 * before any get or set.
 *
 * That is not hypothetical: it reached Sentry as
 *   "SecurityError: Failed to read the 'localStorage' property from
 *    'Window': Access is denied for this document"
 * on /ski-resort-jobs, thrown from the cookie banner, which runs on every
 * page for every visitor.
 *
 * Storage here is only ever a convenience — a dismissed banner, a remembered
 * filter. Losing it should cost the reader nothing, so every operation
 * degrades to "no value stored" rather than taking the page down with it.
 */

type Store = "local" | "session";

function store(kind: Store): Storage | null {
  try {
    // The property access is what throws, so it has to be inside the try.
    const s = kind === "local" ? window.localStorage : window.sessionStorage;
    // Some webviews expose the object and then fail on use. Prove it works.
    const probe = "__mc_probe__";
    s.setItem(probe, "1");
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function safeGet(key: string, kind: Store = "local"): string | null {
  try {
    return store(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Returns whether the value was actually persisted. */
export function safeSet(key: string, value: string, kind: Store = "local"): boolean {
  try {
    const s = store(kind);
    if (!s) return false;
    s.setItem(key, value);
    return true;
  } catch {
    // Also covers QuotaExceededError, which iOS raises in private mode even
    // when the property itself is readable.
    return false;
  }
}

export function safeRemove(key: string, kind: Store = "local"): void {
  try {
    store(kind)?.removeItem(key);
  } catch {
    /* nothing to do — the value is unreachable either way */
  }
}

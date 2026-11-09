import { safeGet, safeSet } from "@/lib/utils/safe-storage";

/**
 * Where a visitor came from, for the 89% of signups that carry no UTM.
 *
 * Of the 73 accounts created between 19 Sep and 9 Nov 2026, 65 arrived with no
 * `src` and no UTM, so `signup_source` was NULL on all of them. That is honest
 * — nothing tagged them — but it collapses "found us on Google", "typed the
 * address", "followed a link from ChatGPT" and "we never looked" into one
 * value. This separates them.
 *
 * ⚠️ THE HOSTNAME, NEVER THE URL. A full referrer can carry a search query or
 * a private path, and `document.referrer` hands us the whole thing. Only the
 * host survives `referrerHost`, capped and character-checked, so what reaches
 * storage and then user_metadata is "google.com", never what they searched
 * for. Nothing here records an IP, a user agent or an identifier, which is the
 * same posture as `campaign_visits` (migration 00105).
 *
 * ⚠️ FIRST TOUCH, not last. The referrer that brought someone to the site is
 * the interesting one; once they are browsing, `document.referrer` is our own
 * host on every page. So the first capture wins and later ones are ignored —
 * the opposite of `mergeContexts`, which is last-touch on purpose because a
 * second ad click really does re-attribute a paid visitor.
 *
 * ⚠️ "DIRECT" IS A VALUE, ABSENCE IS NOT. A visitor with no referrer stores
 * the DIRECT sentinel rather than nothing, so a signup can say "we looked and
 * there was no referrer". An absent `signup_referrer` keeps its own meaning:
 * we never captured one — an account created before this shipped, storage
 * blocked in an in-app browser, or the OAuth hop losing it. Four previous
 * columns in this schema had to be migrated because one value quietly meant
 * both "no" and "unknown" (00109, 00114, 00115, 00118). Not a fifth.
 */

export const SIGNUP_REFERRER_STORAGE_KEY = "mc-signup-referrer";
export const SIGNUP_REFERRER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Recorded when the visitor arrived with no referrer at all. */
export const DIRECT = "(direct)";

/** Values travel in the auth JWT, so the host is capped like a UTM. */
const MAX_HOST_LENGTH = 100;
/** Hostnames only. Excludes the parens, so DIRECT can never be mistaken for one. */
const HOST_PATTERN = /^[a-z0-9][a-z0-9.-]{0,99}$/;

export interface StoredReferrer {
  /** A hostname, or DIRECT. */
  host: string;
  /** Epoch ms; expires 30 days after capture. */
  capturedAt: number;
}

/**
 * The host a referrer points at, or DIRECT for an empty one.
 *
 * Returns undefined — meaning "do not record anything" — when the referrer is
 * our own site, which is every internal navigation, or when it cannot be
 * parsed into a plausible host.
 */
export function referrerHost(raw: string | null | undefined, currentHost: string): string | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return DIRECT;

  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  if (!host) return undefined;

  const self = (currentHost || "").toLowerCase().replace(/^www\./, "");
  const bare = host.replace(/^www\./, "");
  // Our own host, or a subdomain of it: an internal hop, not a referral.
  if (self && (bare === self || bare.endsWith(`.${self}`))) return undefined;

  const capped = bare.slice(0, MAX_HOST_LENGTH);
  return HOST_PATTERN.test(capped) ? capped : undefined;
}

/** Validates a stored value, dropping anything unrecognised or expired. */
export function parseStoredReferrer(input: unknown, now: number = Date.now()): StoredReferrer | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  if (typeof o.host !== "string") return null;
  if (o.host !== DIRECT && !HOST_PATTERN.test(o.host)) return null;
  if (typeof o.capturedAt !== "number" || !Number.isFinite(o.capturedAt)) return null;
  if (now - o.capturedAt > SIGNUP_REFERRER_TTL_MS || o.capturedAt > now + 60_000) return null;
  return { host: o.host, capturedAt: o.capturedAt };
}

/** The stored record, including when it was captured. */
export function loadStoredReferrer(now: number = Date.now()): StoredReferrer | null {
  const raw = safeGet(SIGNUP_REFERRER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return parseStoredReferrer(JSON.parse(raw), now);
  } catch {
    return null;
  }
}

export function loadReferrer(now: number = Date.now()): string | null {
  return loadStoredReferrer(now)?.host ?? null;
}

/**
 * Records where this visitor came from, once. Safe to call on every page.
 *
 * Returns what is held afterwards, which is the EXISTING value when one is
 * already stored — first touch wins. Storage is best effort throughout: an
 * in-app browser that refuses it costs a number, never a page.
 */
export function captureReferrer(
  rawReferrer: string | null | undefined,
  currentHost: string,
  now: number = Date.now(),
): string | null {
  const held = loadReferrer(now);
  if (held) return held;

  const host = referrerHost(rawReferrer, currentHost);
  if (!host) return null;

  safeSet(SIGNUP_REFERRER_STORAGE_KEY, JSON.stringify({ host, capturedAt: now } satisfies StoredReferrer));
  return host;
}

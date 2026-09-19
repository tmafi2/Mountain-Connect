import { safeGet, safeSet } from "@/lib/utils/safe-storage";
import { parseAnswers, type SeasonAnswers } from "./season-quiz";

/**
 * Carries a paid-traffic visitor's campaign context — which ad brought them
 * (UTMs) and what they told the quiz — from a landing page to the account
 * they create, so a signup can be traced back to the ad that produced it.
 *
 * THREE TRANSPORTS, because each one fails for part of this audience:
 *
 *  1. The signup link's query string. The primary path. It needs no storage,
 *     so it survives the Instagram and Facebook in-app browsers, where even
 *     reading localStorage can throw (see lib/utils/safe-storage.ts).
 *  2. localStorage, for 30 days — for the visitor who browses jobs first and
 *     signs up later from a link that carries nothing.
 *  3. auth user_metadata, written by signUp(). The only one that survives the
 *     email-confirmation hop: the confirmation link usually opens in a
 *     different browser (the phone's default) from the one they signed up in.
 *
 * To count signups per ad:
 *   select raw_user_meta_data->'signup_utm'->>'utm_content' as ad, count(*)
 *   from auth.users
 *   where raw_user_meta_data->>'signup_source' = 'go-for-a-season'
 *   group by 1 order by 2 desc;
 */

export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type Utm = Partial<Record<UtmKey, string>>;

export interface SignupContext {
  /** The landing page the visitor came through, e.g. "go-for-a-season". */
  source: string;
  utm?: Utm;
  answers?: SeasonAnswers;
  /** Epoch ms; storage expires 30 days after the last write. */
  capturedAt: number;
}

export const SIGNUP_CONTEXT_STORAGE_KEY = "mc-signup-context";
export const SIGNUP_CONTEXT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** user_metadata travels inside the auth JWT, so every value is capped. */
const MAX_UTM_LENGTH = 100;
const SOURCE_PATTERN = /^[a-z0-9-]{1,40}$/;

function cleanValue(raw: string | null | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  // Control characters have no business in a campaign name; strip, trim, cap.
  const v = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, MAX_UTM_LENGTH);
  return v || undefined;
}

/** The five standard UTM keys, cleaned. Anything else in the URL is ignored. */
export function utmFromParams(params: URLSearchParams): Utm | undefined {
  const out: Utm = {};
  for (const key of UTM_KEYS) {
    const v = cleanValue(params.get(key));
    if (v) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function utmFromUnknown(input: unknown): Utm | undefined {
  if (!input || typeof input !== "object") return undefined;
  const o = input as Record<string, unknown>;
  const out: Utm = {};
  for (const key of UTM_KEYS) {
    const v = cleanValue(typeof o[key] === "string" ? (o[key] as string) : undefined);
    if (v) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Reads context from a URL: `src` names the landing page, `dest`/`season`/`work`
 * are the quiz answers, plus the UTM keys. Returns null when the URL carries
 * none of it. A URL with UTMs but no `src` is an ad pointing somewhere
 * directly, so it is attributed to `fallbackSource` (the page reading it).
 */
export function contextFromParams(
  params: URLSearchParams,
  fallbackSource: string,
  now: number = Date.now(),
): SignupContext | null {
  const src = params.get("src");
  const source = src && SOURCE_PATTERN.test(src) ? src : undefined;
  const utm = utmFromParams(params);
  const answers =
    parseAnswers({ destination: params.get("dest"), season: params.get("season"), workType: params.get("work") }) ??
    undefined;
  if (!source && !utm && !answers) return null;
  return { source: source ?? fallbackSource, utm, answers, capturedAt: now };
}

/** The inverse of contextFromParams, for building a signup link. */
export function contextToParams(ctx: SignupContext): URLSearchParams {
  const params = new URLSearchParams();
  params.set("src", ctx.source);
  if (ctx.answers) {
    params.set("dest", ctx.answers.destination);
    params.set("season", ctx.answers.season);
    params.set("work", ctx.answers.workType);
  }
  for (const key of UTM_KEYS) {
    const v = ctx.utm?.[key];
    if (v) params.set(key, v);
  }
  return params;
}

/** The worker signup URL, carrying whatever context exists. */
export function workerSignupHref(ctx: SignupContext | null): string {
  if (!ctx) return "/signup?role=worker";
  return `/signup?role=worker&${contextToParams(ctx).toString()}`;
}

/**
 * Combines a fresh context (from the URL) with a stored one. The fresh one
 * wins field by field, so a second ad click re-attributes the visitor (last
 * touch) but arriving without UTMs does not erase the ones already held.
 */
export function mergeContexts(
  fresh: SignupContext | null,
  stored: SignupContext | null,
): SignupContext | null {
  if (!fresh) return stored;
  if (!stored) return fresh;
  return {
    source: fresh.source,
    utm: fresh.utm ?? stored.utm,
    answers: fresh.answers ?? stored.answers,
    capturedAt: fresh.capturedAt,
  };
}

/** Validates a stored or decoded context, dropping anything unrecognised. */
export function parseSignupContext(input: unknown, now: number = Date.now()): SignupContext | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  if (typeof o.source !== "string" || !SOURCE_PATTERN.test(o.source)) return null;
  if (typeof o.capturedAt !== "number" || !Number.isFinite(o.capturedAt)) return null;
  if (now - o.capturedAt > SIGNUP_CONTEXT_TTL_MS || o.capturedAt > now + 60_000) return null;
  return {
    source: o.source,
    utm: utmFromUnknown(o.utm),
    answers: parseAnswers(o.answers) ?? undefined,
    capturedAt: o.capturedAt,
  };
}

export function loadSignupContext(now: number = Date.now()): SignupContext | null {
  const raw = safeGet(SIGNUP_CONTEXT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return parseSignupContext(JSON.parse(raw), now);
  } catch {
    return null;
  }
}

/** Best effort: storage is a convenience here, never the only copy. */
export function saveSignupContext(ctx: SignupContext): void {
  safeSet(SIGNUP_CONTEXT_STORAGE_KEY, JSON.stringify(ctx));
}

export interface SignupMetadata {
  signup_source?: string;
  signup_utm?: Utm;
  season_intent?: { destination: string; season: string; work_type: string };
}

/**
 * What signUp() stores in auth user_metadata. Keys are snake_case like the
 * existing full_name / account_type. Quiz answers go on worker accounts only;
 * attribution goes on either, since an ad can send a business too.
 */
export function signupMetadata(ctx: SignupContext | null, accountType: "worker" | "business"): SignupMetadata {
  if (!ctx) return {};
  const out: SignupMetadata = { signup_source: ctx.source };
  if (ctx.utm) out.signup_utm = ctx.utm;
  if (accountType === "worker" && ctx.answers) {
    out.season_intent = {
      destination: ctx.answers.destination,
      season: ctx.answers.season,
      work_type: ctx.answers.workType,
    };
  }
  return out;
}

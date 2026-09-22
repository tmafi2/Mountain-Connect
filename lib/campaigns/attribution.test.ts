import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SIGNUP_CONTEXT_STORAGE_KEY,
  SIGNUP_CONTEXT_TTL_MS,
  contextFromParams,
  contextToParams,
  loadSignupContext,
  mergeContexts,
  parseSignupContext,
  saveSignupContext,
  signupMetadata,
  utmFromParams,
  workerSignupHref,
  type SignupContext,
} from "./attribution";

const NOW = Date.UTC(2026, 8, 19);
const answers: import("./season-quiz").SeasonAnswers = { destination: "canada", season: "northern-winter", workTypes: ["hospitality"] };

test("UTMs: the five standard keys only, trimmed, stripped of control characters, capped", () => {
  const nul = String.fromCharCode(0);
  const params = new URLSearchParams({
    utm_source: "  facebook  ",
    utm_medium: `paid${nul}_social`,
    utm_campaign: "x".repeat(500),
    utm_content: "",
    gclid: "ignored",
    email: "someone@example.com",
  });
  assert.deepEqual(utmFromParams(params), {
    utm_source: "facebook",
    utm_medium: "paid_social",
    utm_campaign: "x".repeat(100),
  });
  assert.equal(utmFromParams(new URLSearchParams("fbclid=abc")), undefined);
});

test("context from a URL: src names the page; a bad or missing src falls back", () => {
  const withSrc = contextFromParams(new URLSearchParams("src=go-for-a-season&utm_source=ig"), "signup", NOW);
  assert.equal(withSrc?.source, "go-for-a-season");

  const hostile = contextFromParams(new URLSearchParams("src=<script>&utm_source=ig"), "signup", NOW);
  assert.equal(hostile?.source, "signup");

  // An ad pointing straight at /signup: UTMs, no src.
  assert.equal(contextFromParams(new URLSearchParams("utm_source=fb"), "signup", NOW)?.source, "signup");

  // Nothing campaign-shaped at all.
  assert.equal(contextFromParams(new URLSearchParams("role=worker&ref=abc"), "signup", NOW), null);

  // Half an answer set is no answer set.
  const partial = contextFromParams(new URLSearchParams("src=go-for-a-season&dest=canada"), "signup", NOW);
  assert.equal(partial?.answers, undefined);
});

test("the signup link round-trips answers and UTMs", () => {
  const ctx: SignupContext = {
    source: "go-for-a-season",
    utm: { utm_source: "instagram", utm_campaign: "gfas-sep", utm_content: "reel 3 & friends" },
    answers,
    capturedAt: NOW,
  };
  const href = workerSignupHref(ctx);
  assert.ok(href.startsWith("/signup?role=worker&"), href);
  const back = contextFromParams(new URLSearchParams(href.split("?")[1]), "signup", NOW);
  assert.deepEqual(back, ctx);
  assert.equal(workerSignupHref(null), "/signup?role=worker");
  assert.equal(contextToParams(ctx).get("work"), "hospitality");
});

test("merging: a fresh visit re-attributes, but never erases what it lacks", () => {
  const stored: SignupContext = { source: "go-for-a-season", utm: { utm_content: "ad-a" }, answers, capturedAt: NOW - 1000 };
  const fresh: SignupContext = { source: "go-for-a-season", utm: { utm_content: "ad-b" }, capturedAt: NOW };
  assert.deepEqual(mergeContexts(fresh, stored), { ...fresh, answers });
  const noUtm: SignupContext = { source: "signup", capturedAt: NOW };
  assert.deepEqual(mergeContexts(noUtm, stored)?.utm, { utm_content: "ad-a" });
  assert.equal(mergeContexts(null, stored), stored);
  assert.equal(mergeContexts(fresh, null), fresh);
});

test("stored context expires, and junk is dropped rather than trusted", () => {
  const good = { source: "go-for-a-season", utm: { utm_source: "ig" }, answers, capturedAt: NOW };
  assert.deepEqual(parseSignupContext(good, NOW), good);
  assert.equal(parseSignupContext({ ...good, capturedAt: NOW - SIGNUP_CONTEXT_TTL_MS - 1 }, NOW), null);
  assert.equal(parseSignupContext({ ...good, capturedAt: NOW + 24 * 3600 * 1000 }, NOW), null);
  assert.equal(parseSignupContext({ ...good, source: "Bad Source!" }, NOW), null);
  assert.equal(parseSignupContext({ ...good, answers: { destination: "mars" } }, NOW)?.answers, undefined);
  assert.equal(parseSignupContext({ ...good, utm: { utm_source: 42, evil: "x" } }, NOW)?.utm, undefined);
});

test("storage round-trip, and a corrupt entry reads as nothing", () => {
  const data = new Map<string, string>();
  const fakeStorage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  const g = globalThis as unknown as { window?: unknown };
  g.window = { localStorage: fakeStorage, sessionStorage: fakeStorage };
  try {
    const ctx: SignupContext = { source: "go-for-a-season", utm: { utm_source: "ig" }, answers, capturedAt: Date.now() };
    saveSignupContext(ctx);
    assert.deepEqual(loadSignupContext(), ctx);
    data.set(SIGNUP_CONTEXT_STORAGE_KEY, "{not json");
    assert.equal(loadSignupContext(), null);
  } finally {
    delete g.window;
  }
  // No window at all (server render): nothing, and no throw.
  assert.equal(loadSignupContext(), null);
});

test("signup metadata: answers on worker accounts only, attribution on both", () => {
  const ctx: SignupContext = { source: "go-for-a-season", utm: { utm_source: "ig" }, answers, capturedAt: NOW };
  assert.deepEqual(signupMetadata(ctx, "worker"), {
    signup_source: "go-for-a-season",
    signup_utm: { utm_source: "ig" },
    season_intent: { destination: "canada", season: "northern-winter", work_type: "hospitality" },
  });
  assert.deepEqual(signupMetadata(ctx, "business"), {
    signup_source: "go-for-a-season",
    signup_utm: { utm_source: "ig" },
  });
  assert.deepEqual(signupMetadata(null, "worker"), {});
});

/** user_metadata rides inside the auth JWT and so inside every request's cookie. */
test("even maximal UTMs keep the metadata small", () => {
  const long = Object.fromEntries(
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].map((k) => [k, "y".repeat(1000)]),
  );
  const ctx = contextFromParams(new URLSearchParams({ src: "go-for-a-season", ...long }), "signup", NOW);
  const size = JSON.stringify({ ...signupMetadata(ctx, "worker"), season_intent: { destination: "new-zealand", season: "exploring", work_type: "mountain-operations" } }).length;
  assert.ok(size < 800, `metadata is ${size} bytes`);
});

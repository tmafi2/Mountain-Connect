import test from "node:test";
import assert from "node:assert/strict";
import {
  DIRECT,
  parseStoredReferrer,
  referrerHost,
  SIGNUP_REFERRER_TTL_MS,
} from "./referrer";
import { signupMetadata } from "./attribution";

const SELF = "www.mountainconnects.com";

test("an inbound referral records the bare host", () => {
  assert.equal(referrerHost("https://www.google.com/", SELF), "google.com");
  assert.equal(referrerHost("https://chatgpt.com/", SELF), "chatgpt.com");
  assert.equal(referrerHost("https://l.facebook.com/", SELF), "l.facebook.com");
});

// The privacy guarantee of this module: document.referrer hands over the whole
// URL, and only the host may survive it. A Google referral can carry the
// search terms, and nothing should ever write those to a user's account.
test("the path and query are discarded, always", () => {
  assert.equal(
    referrerHost("https://www.google.com/search?q=ski+jobs+whistler+visa", SELF),
    "google.com",
  );
  assert.equal(referrerHost("https://example.com/a/private/path#frag", SELF), "example.com");
});

test("our own site is not a referral", () => {
  assert.equal(referrerHost("https://www.mountainconnects.com/jobs", SELF), undefined);
  assert.equal(referrerHost("https://mountainconnects.com/", SELF), undefined);
  // A subdomain of ours is still an internal hop.
  assert.equal(referrerHost("https://staging.mountainconnects.com/", SELF), undefined);
});

// "Direct" and "we never looked" must stay distinguishable — the bug class
// that cost migrations 00109, 00114, 00115 and 00118.
test("no referrer is recorded as DIRECT, not as nothing", () => {
  assert.equal(referrerHost("", SELF), DIRECT);
  assert.equal(referrerHost(null, SELF), DIRECT);
  assert.equal(referrerHost(undefined, SELF), DIRECT);
});

test("junk is dropped rather than stored", () => {
  assert.equal(referrerHost("not a url", SELF), undefined);
  assert.equal(referrerHost("javascript:alert(1)", SELF), undefined);
});

test("a stored record round-trips, and an expired one does not", () => {
  const now = 1_700_000_000_000;
  assert.deepEqual(parseStoredReferrer({ host: "google.com", capturedAt: now }, now), {
    host: "google.com",
    capturedAt: now,
  });
  assert.deepEqual(parseStoredReferrer({ host: DIRECT, capturedAt: now }, now), {
    host: DIRECT,
    capturedAt: now,
  });
  assert.equal(
    parseStoredReferrer({ host: "google.com", capturedAt: now - SIGNUP_REFERRER_TTL_MS - 1 }, now),
    null,
  );
  // A timestamp from the future is a tampered or broken clock.
  assert.equal(parseStoredReferrer({ host: "google.com", capturedAt: now + 120_000 }, now), null);
  // Anything that is neither a plausible host nor the sentinel.
  assert.equal(parseStoredReferrer({ host: "(spoofed)", capturedAt: now }, now), null);
  assert.equal(parseStoredReferrer({ host: "has spaces", capturedAt: now }, now), null);
});

// The reason this module exists: 89% of signups have no campaign context, so
// the referrer has to be recorded WITHOUT one — and must not invent a source,
// because every existing query reads NULL signup_source as "arrived untagged".
test("a referrer is recorded with no campaign context, and invents no source", () => {
  const meta = signupMetadata(null, "worker", "google.com");
  assert.equal(meta.signup_referrer, "google.com");
  assert.equal(meta.signup_source, undefined);
  assert.equal(meta.signup_utm, undefined);
});

test("a campaign signup keeps its source and gains the referrer", () => {
  const ctx = {
    source: "go-for-a-season",
    utm: { utm_source: "ig", utm_medium: "paid" },
    capturedAt: Date.now(),
  };
  const meta = signupMetadata(ctx, "worker", "l.instagram.com");
  assert.equal(meta.signup_source, "go-for-a-season");
  assert.equal(meta.signup_utm?.utm_source, "ig");
  assert.equal(meta.signup_referrer, "l.instagram.com");
});

test("no referrer leaves the field off entirely, rather than writing a placeholder", () => {
  assert.equal(signupMetadata(null, "worker", null).signup_referrer, undefined);
  assert.equal(signupMetadata(null, "worker").signup_referrer, undefined);
  assert.deepEqual(signupMetadata(null, "worker"), {});
});

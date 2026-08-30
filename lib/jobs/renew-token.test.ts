import { test } from "node:test";
import assert from "node:assert/strict";

import { signRenewToken, verifyRenewToken } from "./renew-token";

// The module reads the signing secret inside its functions rather than at
// import time, so setting it here — after the hoisted imports have run — is
// still in time. Any value works: these tests only care that signing and
// verifying agree, and that a forged or stale token is rejected.
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-secret-for-renew-tokens";

const NOW = new Date("2026-09-01T00:00:00Z");
const BIZ = "3f1a0a2c-0000-4000-8000-000000000001";

test("a freshly signed token verifies back to its business", () => {
  const v = verifyRenewToken(signRenewToken(BIZ, NOW), NOW);
  assert.equal(v.ok, true);
  assert.equal(v.ok && v.businessId, BIZ);
});

test("a token is still good just before its 21 days are up", () => {
  const almost = new Date(NOW.getTime() + 20.9 * 86_400_000);
  assert.equal(verifyRenewToken(signRenewToken(BIZ, NOW), almost).ok, true);
});

test("a token past 21 days is rejected as expired, not as invalid", () => {
  const late = new Date(NOW.getTime() + 22 * 86_400_000);
  const v = verifyRenewToken(signRenewToken(BIZ, NOW), late);
  assert.equal(v.ok, false);
  assert.equal(v.ok === false && v.reason, "expired", "the page shows a different message for expired");
});

/**
 * The payload is base64 in the URL and trivially readable. What must not be
 * possible is editing it — swapping in another business's id — without the
 * signature failing.
 */
test("editing the business id in a token breaks the signature", () => {
  const token = signRenewToken(BIZ, NOW);
  const [encoded, sig] = token.split(".");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  payload.b = "99999999-0000-4000-8000-000000000999";
  const forged = Buffer.from(JSON.stringify(payload)).toString("base64url") + "." + sig;

  const v = verifyRenewToken(forged, NOW);
  assert.equal(v.ok, false);
  assert.equal(v.ok === false && v.reason, "bad_signature");
});

test("extending the expiry in a token breaks the signature", () => {
  const token = signRenewToken(BIZ, NOW);
  const [encoded, sig] = token.split(".");
  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  payload.exp = payload.exp + 365 * 86_400_000;
  const forged = Buffer.from(JSON.stringify(payload)).toString("base64url") + "." + sig;

  assert.equal(verifyRenewToken(forged, NOW).ok, false);
});

test("junk is rejected without throwing", () => {
  for (const bad of ["", "nonsense", "a.b.c", "....", "!!!.???"]) {
    const v = verifyRenewToken(bad, NOW);
    assert.equal(v.ok, false, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

/**
 * A signature of the wrong length must not reach timingSafeEqual, which
 * throws on mismatched buffers — that would turn a forged token into a 500
 * instead of a clean rejection.
 */
test("a truncated signature is rejected cleanly rather than throwing", () => {
  const token = signRenewToken(BIZ, NOW);
  const [encoded] = token.split(".");
  const v = verifyRenewToken(`${encoded}.abc123`, NOW);
  assert.equal(v.ok, false);
  assert.equal(v.ok === false && v.reason, "bad_signature");
});

test("tokens for different businesses do not collide", () => {
  const a = signRenewToken("aaaaaaaa-0000-4000-8000-00000000000a", NOW);
  const b = signRenewToken("bbbbbbbb-0000-4000-8000-00000000000b", NOW);
  assert.notEqual(a, b);
  const va = verifyRenewToken(a, NOW);
  assert.equal(va.ok && va.businessId, "aaaaaaaa-0000-4000-8000-00000000000a");
});

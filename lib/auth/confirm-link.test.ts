import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfirmParams } from "./confirm-link";

const HASH = "pkce_0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4";

test("accepts a signup confirmation link", () => {
  assert.deepEqual(parseConfirmParams({ token_hash: HASH, type: "email" }), {
    tokenHash: HASH,
    type: "email",
  });
});

test("treats the older 'signup' type as 'email'", () => {
  assert.equal(parseConfirmParams({ token_hash: HASH, type: "signup" })?.type, "email");
});

test("accepts a password-reset link", () => {
  assert.equal(parseConfirmParams({ token_hash: HASH, type: "recovery" })?.type, "recovery");
});

test("defaults a missing type to 'email'", () => {
  assert.equal(parseConfirmParams({ token_hash: HASH })?.type, "email");
});

test("rejects a missing or empty token hash", () => {
  assert.equal(parseConfirmParams({}), null);
  assert.equal(parseConfirmParams({ token_hash: "", type: "email" }), null);
  assert.equal(parseConfirmParams({ token_hash: "   ", type: "email" }), null);
});

test("rejects token hashes with characters GoTrue never produces", () => {
  assert.equal(parseConfirmParams({ token_hash: "abc def", type: "email" }), null);
  assert.equal(parseConfirmParams({ token_hash: "abc<script>", type: "email" }), null);
  assert.equal(parseConfirmParams({ token_hash: "a".repeat(513), type: "email" }), null);
});

test("rejects types this flow does not handle", () => {
  for (const type of ["magiclink", "invite", "email_change", "sms", "EMAIL"]) {
    assert.equal(parseConfirmParams({ token_hash: HASH, type }), null, type);
  }
});

test("ignores non-string values from a form", () => {
  assert.equal(parseConfirmParams({ token_hash: 42, type: "email" }), null);
  assert.equal(parseConfirmParams({ token_hash: HASH, type: 7 })?.type, "email");
});

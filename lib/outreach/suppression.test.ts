import { test } from "node:test";
import assert from "node:assert/strict";
import { suppressed, type SuppressionList } from "./suppression";

const list = (emails: string[], lookupFailed = false): SuppressionList => ({
  unsubscribed: new Set(emails),
  lookupFailed,
});

test("an address that unsubscribed is suppressed", () => {
  assert.equal(suppressed(list(["gm@rocksandgemscanada.com"]), "gm@rocksandgemscanada.com"), true);
});

test("case and stray spacing don't let an email through", () => {
  const l = list(["gm@rocksandgemscanada.com"]);
  for (const variant of ["GM@RocksAndGemsCanada.com", "  gm@rocksandgemscanada.com  "]) {
    assert.equal(suppressed(l, variant), true, variant);
  }
});

test("everyone else still gets their email", () => {
  const l = list(["gm@rocksandgemscanada.com"]);
  assert.equal(suppressed(l, "recruitment@odin-living.com"), false);
  assert.equal(suppressed(l, "gm@example.com"), false);
});

test("a business with no address on file is not 'suppressed', just unreachable", () => {
  const l = list(["gm@rocksandgemscanada.com"]);
  assert.equal(suppressed(l, null), false);
  assert.equal(suppressed(l, undefined), false);
  assert.equal(suppressed(l, ""), false);
});

/**
 * The rule that matters when the database misbehaves: a skipped nudge is
 * retried next run, an email to someone who opted out cannot be recalled.
 */
test("a failed lookup suppresses everything", () => {
  const broken = list([], true);
  assert.equal(suppressed(broken, "anybody@example.com"), true);
  assert.equal(suppressed(broken, "recruitment@odin-living.com"), true);
  // Still not "suppressed" when there is no address to send to at all.
  assert.equal(suppressed(broken, null), true);
});

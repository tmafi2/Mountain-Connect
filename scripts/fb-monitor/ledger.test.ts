import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";

// The ledger resolves its path per call, so pointing it at a scratch file
// here — after the hoisted imports — is in time.
const dir = mkdtempSync(path.join(tmpdir(), "mc-ledger-"));
process.env.FB_LEDGER_PATH = path.join(dir, "ledger.json");

import { loadLedger, saveLedger, record, alreadyExtracted, hashText } from "./ledger";

const DAY = 86_400_000;

test("a post extracted before is skipped the next night", () => {
  const l = new Map();
  record(l, "post-1", "Chef wanted, staff accommodation provided");
  assert.equal(alreadyExtracted(l, "post-1", "Chef wanted, staff accommodation provided"), true);
});

test("a post never seen is extracted", () => {
  const l = new Map();
  assert.equal(alreadyExtracted(l, "post-unknown", "anything"), false);
});

/**
 * The property that makes this lossless rather than a tradeoff: an employer
 * editing their post — adding "position filled", changing the rate — changes
 * the hash, so it is read again.
 */
test("an edited post is extracted again", () => {
  const l = new Map();
  record(l, "post-1", "Chef wanted, $28/hr");
  assert.equal(alreadyExtracted(l, "post-1", "Chef wanted, $32/hr"), false, "rate changed — re-read it");
  assert.equal(alreadyExtracted(l, "post-1", "Chef wanted, $28/hr — POSITION FILLED"), false);
});

test("entries older than the TTL are dropped on load", () => {
  const now = Date.now();
  const stale = { h: hashText("old advert"), t: now - 31 * DAY };
  const fresh = { h: hashText("new advert"), t: now - 2 * DAY };
  writeFileSync(process.env.FB_LEDGER_PATH!, JSON.stringify({ old: stale, recent: fresh }));

  const l = loadLedger(now);
  assert.equal(l.has("recent"), true);
  assert.equal(l.has("old"), false, "a month-old advert is worth reading again");
});

test("a round trip through disk preserves what was recorded", () => {
  const l = new Map();
  record(l, "a", "first post");
  record(l, "b", "second post");
  saveLedger(l);

  const back = loadLedger();
  assert.equal(alreadyExtracted(back, "a", "first post"), true);
  assert.equal(alreadyExtracted(back, "b", "second post"), true);
  assert.equal(alreadyExtracted(back, "b", "edited second post"), false);
});

/**
 * Losing the ledger costs money. Refusing to extract costs listings. The
 * cheaper failure is the right one.
 */
test("a corrupt ledger extracts everything rather than nothing", () => {
  writeFileSync(process.env.FB_LEDGER_PATH!, "{ this is not json");
  const l = loadLedger();
  assert.equal(l.size, 0);
  assert.equal(alreadyExtracted(l, "anything", "any text"), false, "must not skip on a broken file");
});

test("a missing ledger is an empty one, not an error", () => {
  process.env.FB_LEDGER_PATH = path.join(dir, "does-not-exist.json");
  assert.doesNotThrow(() => loadLedger());
  assert.equal(loadLedger().size, 0);
});

test("hashing is stable and distinguishes near-identical text", () => {
  assert.equal(hashText("Chef wanted"), hashText("Chef wanted"));
  assert.notEqual(hashText("Chef wanted"), hashText("Chef wanted "));
  assert.notEqual(hashText("$28/hr"), hashText("$29/hr"));
});

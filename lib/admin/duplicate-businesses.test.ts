import { test } from "node:test";
import assert from "node:assert/strict";
import {
  findDuplicateBusinesses,
  editDistance,
  nameKey,
  emailDomain,
  type BizRecord,
} from "./duplicate-businesses";

const biz = (id: string, business_name: string | null, email: string | null): BizRecord => ({
  id, business_name, email,
});

/**
 * The case this exists for. Three records, one company, already emailed
 * separately before anyone noticed.
 */
test("the real Odin records are all linked to each other", () => {
  const dupes = findDuplicateBusinesses([
    biz("a", "Odin Living / Odin Hills", "recruitment@odin-living.com"),
    biz("b", "Odin Living", "hrmanager@odin-living.com"),
    biz("c", "The Barn by Odin", "recuritment@odin-living.com"),
    biz("z", "Kamado", "info@dnaniseko.com"),
  ]);
  assert.equal(dupes.get("a")?.length, 2, "linked to both siblings");
  assert.equal(dupes.get("b")?.length, 2);
  assert.equal(dupes.get("c")?.length, 2);
  assert.equal(dupes.has("z"), false, "an unrelated business is left alone");
});

/**
 * The failure of the first naive version: grouping on domain alone turned
 * every gmail address on the board into one cluster.
 */
test("free email providers are not treated as a shared company", () => {
  const dupes = findDuplicateBusinesses([
    biz("a", "Hakuba Matata Lodge", "hakubamatata@gmail.com"),
    biz("b", "Shizen Cafe", "shizencafe@gmail.com"),
    biz("c", "Smokies Restaurant", "smokies@gmail.com"),
  ]);
  assert.equal(dupes.size, 0, "three unrelated gmail businesses are not duplicates");
});

test("a shared corporate domain is a duplicate signal", () => {
  const dupes = findDuplicateBusinesses([
    biz("a", "Seasons Niseko", "coo@seasons-niseko.com"),
    biz("b", "Seasons Niseko Rentals", "rentals@seasons-niseko.com"),
  ]);
  assert.equal(dupes.get("a")?.[0].reason, "domain");
});

test("the same name punctuated differently is caught", () => {
  const dupes = findDuplicateBusinesses([
    biz("a", "Chalet Ivy Hirafu & Chalet Ivy Weiss", "a@chaletivy.com"),
    biz("b", "Chalet Ivy Hirafu / Chalet Ivy Weiss", "careers@example.org"),
  ]);
  assert.equal(dupes.get("a")?.[0].reason, "name", "punctuation must not hide a match");
});

/**
 * The signal that earns its keep on its own: a typo'd address at a domain
 * nothing else shares.
 */
test("a one-character typo is caught even across different domains", () => {
  const dupes = findDuplicateBusinesses([
    biz("a", "Snow Lodge", "bookings@snowlodge.com"),
    biz("b", "Snow Lodge Annexe", "bookings@snowlodge.co"),
  ]);
  assert.equal(dupes.get("a")?.length, 1);
  assert.equal(dupes.get("b")?.length, 1);
});

test("genuinely different addresses are not linked", () => {
  const dupes = findDuplicateBusinesses([
    biz("a", "Kamado", "info@dnaniseko.com"),
    biz("b", "The Winston Lodge", "rowanzuba.sayahotels@gmail.com"),
    biz("c", "Nakiska Ski Club", "athleticdirector@skinasa.org"),
  ]);
  assert.equal(dupes.size, 0);
});

test("a record missing an email is never linked by email", () => {
  const dupes = findDuplicateBusinesses([
    biz("a", "Something", null),
    biz("b", "Another", null),
  ]);
  assert.equal(dupes.size, 0);
});

test("very short names do not collide", () => {
  const dupes = findDuplicateBusinesses([
    biz("a", "Zen", "one@example.com"),
    biz("b", "Zen", "two@somewhere.org"),
  ]);
  assert.equal(dupes.size, 0, "a three-letter name is too weak to act on");
});

test("stronger evidence wins when two signals overlap", () => {
  const dupes = findDuplicateBusinesses([
    biz("a", "Odin Living", "recruitment@odin.com"),
    biz("b", "Odin Living", "recuritment@odin.com"),
  ]);
  assert.equal(dupes.get("a")?.[0].reason, "domain", "domain is tested before typo");
  assert.equal(dupes.get("a")?.length, 1, "one link per pair, not one per signal");
});

test("editDistance bails out past the cap instead of computing the truth", () => {
  assert.equal(editDistance("recruitment", "recuritment"), 2);
  assert.equal(editDistance("abc", "abc"), 0);
  assert.ok(editDistance("completely", "different") > 2);
});

test("keys normalise the way the matcher assumes", () => {
  assert.equal(nameKey("Odin Living / Odin Hills"), "odinlivingodinhills");
  assert.equal(nameKey(null), "");
  assert.equal(emailDomain("A@Example.COM"), "example.com");
  assert.equal(emailDomain("nonsense"), null);
});

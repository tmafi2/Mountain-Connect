/**
 * The bug: `job_posts.pay_currency` carried a column default of 'USD', and
 * the importer omitted the field when extraction found no currency. So an
 * omitted currency meant US dollars — on a board with no US resorts. 177 of
 * 341 open listings said USD on 2026-10-10, and every one of them was a row
 * with no pay at all.
 *
 * Two questions, two different answers, which is the whole point:
 *   nothing to denominate -> NULL
 *   priced but unnamed    -> the resort's country
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { currencyForJob, COUNTRY_CURRENCY } from "./currency";

test("no pay means no currency, never a default", () => {
  for (const empty of [null, undefined, "", "   "]) {
    assert.equal(currencyForJob(empty, null, "Canada"), null);
    // Even a stated currency is meaningless with nothing to denominate.
    assert.equal(currencyForJob(empty, "USD", "Canada"), null);
  }
});

test("a currency the advert states always wins", () => {
  assert.equal(currencyForJob("20", "CAD", "Canada"), "CAD");
  // Including one that disagrees with the country: a Japanese resort hiring
  // through an Australian agency really can quote AUD, and the advert knows
  // better than the map does.
  assert.equal(currencyForJob("25", "aud", "Japan"), "AUD");
});

test("priced but unnamed falls back to the resort's country", () => {
  assert.equal(currencyForJob("20", null, "Canada"), "CAD");
  assert.equal(currencyForJob("1500", "", "Japan"), "JPY");
  assert.equal(currencyForJob("2500", null, "France"), "EUR");
});

test("an unknown country yields null rather than a guess", () => {
  assert.equal(currencyForJob("20", null, "Narnia"), null);
  assert.equal(currencyForJob("20", null, null), null);
});

test("every country we carry has a currency", () => {
  // Georgia was missing from the copy of this map inside the business
  // post-job form, so a Georgian resort fell through to nothing.
  const carried = [
    "Andorra", "Argentina", "Australia", "Austria", "Canada", "Chile",
    "France", "Georgia", "Italy", "Japan", "New Zealand", "Sweden",
    "Switzerland", "USA",
  ];
  const missing = carried.filter((c) => !COUNTRY_CURRENCY[c]);
  assert.deepEqual(missing, [], `resorts.country values with no currency: ${missing.join(", ")}`);
});

/** Read a repo file relative to the project root. */
function source(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

test("no public reader invents a currency the row does not have", () => {
  const files = [
    "app/(public)/jobs/page.tsx",
    "app/(worker)/interviews/page.tsx",
  ];
  const offenders: string[] = [];
  for (const f of files) {
    const code = source(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    // `pay_currency ... || "XXX"` is the shape that labels an unpriced job.
    if (/pay_currency[^\n]*\|\|\s*"[A-Z]{3}"/.test(code)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], `these invent a currency: ${offenders.join(", ")}`);
});

test("the currency map lives in one place", () => {
  // It was duplicated into the business post-job form, where it had already
  // drifted — Georgia was absent there and present nowhere else.
  const dupes = ["app/(business)/business/post-job/page.tsx"].filter((f) =>
    /const COUNTRY_CURRENCY[^=]*=\s*\{/.test(source(f))
  );
  assert.deepEqual(dupes, [], `these redeclare COUNTRY_CURRENCY: ${dupes.join(", ")}`);
});

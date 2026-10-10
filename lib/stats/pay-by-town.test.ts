import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_LISTINGS, percentile, toWeekly, canQuotePay, canQuoteHousing,
  money, range, rangeByCurrency, publishable, type TownPay,
} from "./pay-by-town";

function town(over: Partial<TownPay> = {}): TownPay {
  return {
    town: "Revelstoke", slug: "revelstoke", country: "Canada", resorts: ["Revelstoke"],
    jobCount: 25, pricedCount: 10, currency: "CAD",
    medianHourly: 25.5, p25Hourly: 20.25, p75Hourly: 29,
    pctWithHousing: 4, medianWeeklyHousing: null, housingCostCount: 0, ...over,
  };
}

test("percentiles interpolate the usual way", () => {
  assert.equal(percentile([1, 2, 3, 4], 0.5), 2.5);
  assert.equal(percentile([10], 0.5), 10);
  assert.ok(Number.isNaN(percentile([], 0.5)));
});

test("a month is 52/12 weeks, not 4", () => {
  // Treating a month as 4 weeks understates a monthly rent by 8% — on a
  // published figure that is the difference between right and roughly right.
  assert.equal(Math.round(toWeekly(20000, "month")!), 4615);
  assert.equal(toWeekly(150, "week"), 150);
  assert.equal(toWeekly(26, "night"), 182);
  assert.equal(toWeekly(100, null), null);
  assert.equal(toWeekly(100, "fortnight"), null);
});

/** The rule AEO.md commits to, enforced where a page cannot skip it. */
test("no wage is quotable below the listing floor", () => {
  assert.equal(canQuotePay(town({ pricedCount: MIN_LISTINGS })), true);
  assert.equal(canQuotePay(town({ pricedCount: MIN_LISTINGS - 1 })), false);
  assert.equal(canQuotePay(town({ medianHourly: null })), false);
  // A median with no currency cannot be published either: "$25.50" is four
  // different wages on a board covering Canada, Japan and France.
  assert.equal(canQuotePay(town({ currency: null })), false);
});

test("housing has its own floor, counted separately from pay", () => {
  assert.equal(canQuoteHousing(town({ housingCostCount: 10, medianWeeklyHousing: 4615 })), true);
  assert.equal(canQuoteHousing(town({ housingCostCount: 4, medianWeeklyHousing: 4615 })), false);
  // A town can have plenty of priced jobs and no stated housing cost at all.
  assert.equal(canQuoteHousing(town()), false);
});

test("money shows the code as well as the symbol", () => {
  assert.equal(money(25.5, "CAD"), "CAD $25.50");
  assert.equal(money(1400, "JPY"), "JPY ¥1,400");
  assert.equal(money(25.5, null), null);
  assert.equal(money(null, "CAD"), null);
});

test("the quartile range refuses to render below the floor", () => {
  assert.equal(range(town()), "CAD $20.25–$29");
  // Whole numbers keep no decimals; JPY has no minor unit at all.
  assert.equal(money(1400, "JPY"), "JPY ¥1,400");
  assert.equal(money(21, "CAD"), "CAD $21");
  assert.equal(range(town({ pricedCount: 2 })), null);
});

/**
 * A town with listings but not enough PRICED ones still belongs on the page:
 * it can honestly say how many jobs it has and what share include housing.
 * Dropping it would make the page look like that town has no work at all.
 */
test("a town with jobs but no wage data is kept, with its wage left blank", () => {
  const hakuba = town({ town: "Hakuba", slug: "hakuba", jobCount: 13, pricedCount: 4, medianHourly: null });
  const kept = publishable([hakuba]);
  assert.equal(kept.length, 1);
  assert.equal(canQuotePay(kept[0]), false);
});

test("a town below the floor on listings is left off entirely", () => {
  assert.deepEqual(publishable([town({ jobCount: 4 })]), []);
});

test("towns are ordered by how much work they actually have", () => {
  const out = publishable([
    town({ town: "Fernie", slug: "fernie", jobCount: 10 }),
    town({ town: "Revelstoke", slug: "revelstoke", jobCount: 25 }),
    town({ town: "Furano", slug: "furano", jobCount: 11 }),
  ]);
  assert.deepEqual(out.map((t) => t.town), ["Revelstoke", "Furano", "Fernie"]);
});

/**
 * The bug this caught, rendered and read before it shipped: a plain min/max
 * across towns produced "median hourly pay ranges from CAD $21 to CAD $1,400"
 * — 1,400 being YEN, labelled as Canadian dollars — inside the FAQPage schema
 * that an answer engine quotes verbatim.
 */
test("a range never puts two currencies in one span", () => {
  const out = rangeByCurrency([
    town({ town: "Revelstoke", currency: "CAD", medianHourly: 25.5, pricedCount: 10 }),
    town({ town: "Fernie", currency: "CAD", medianHourly: 21, pricedCount: 5 }),
    town({ town: "Furano", currency: "JPY", medianHourly: 1400, pricedCount: 5 }),
  ]);
  assert.ok(out.includes("CAD $21 to CAD $25.50"), out);
  assert.ok(out.includes("JPY ¥1,400"), out);
  // ⚠️ THE ASSERTION THAT MATTERS, and it took two goes to write. The bug did
  // NOT put two currency codes in one span — it rendered "CAD $21 to CAD
  // $1,400", both ends labelled CAD, where 1,400 was a YEN figure. A check
  // for "two codes in one span" passes that string happily. What catches it
  // is asserting that a yen VALUE never appears under a dollar label.
  // It needs BOTH checks, because the pre-fix code could emit either shape
  // depending on which town happened to sort last:
  //   "CAD $21 to CAD $1,400"  — a yen value under a dollar label
  //   "CAD $21 to JPY ¥1,400"  — one span, two currencies
  // The first is invisible to a code-counting check; the second is invisible
  // to a value check. Reproducing the old implementation produced the second,
  // while the page actually rendered the first.
  assert.ok(!out.includes("CAD $1,400"), `a yen median was labelled CAD: ${out}`);
  for (const span of out.split(/;|, and /)) {
    const codes = [...new Set(span.match(/\b[A-Z]{3}\b/g) ?? [])];
    assert.ok(codes.length <= 1, `span mixes currencies: "${span.trim()}"`);
  }
  // Each currency's span is bounded by its own towns' medians, so the CAD
  // span cannot reach past 25.50 whatever the yen figures are.
  const cadSpan = out.split(/;|, and /).find((p) => p.includes("CAD")) ?? "";
  assert.equal(cadSpan.trim(), "CAD $21 to CAD $25.50");
});

test("one currency with one town reads as a single figure, not a range", () => {
  assert.equal(rangeByCurrency([town({ currency: "CAD", medianHourly: 25.5 })]), "CAD $25.50");
});

test("towns that cannot quote pay are left out of the range entirely", () => {
  assert.equal(rangeByCurrency([town({ pricedCount: 2, medianHourly: null })]), "");
});

test("a range with identical ends is not shown at all", () => {
  // Fernie rendered "CAD $21–$21" and Furano "JPY ¥1,400–¥1,400" — which
  // reads as a broken template, not as "every listing pays the same". The
  // median printed above it already carries the number.
  assert.equal(range(town({ p25Hourly: 21, p75Hourly: 21 })), null);
  assert.equal(range(town({ p25Hourly: 20.25, p75Hourly: 29 })), "CAD $20.25–$29");
});

test("two currencies read with a comma, three or more with semicolons", () => {
  const two = rangeByCurrency([
    town({ currency: "CAD", medianHourly: 25.5 }),
    town({ currency: "JPY", medianHourly: 1400 }),
  ]);
  assert.equal(two, "CAD $25.50, and JPY ¥1,400");
  assert.ok(!two.includes(";"), two);
});

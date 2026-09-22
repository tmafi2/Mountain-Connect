import { test } from "node:test";
import assert from "node:assert/strict";
import { visitFromRequest, looksLikeBot, isCampaignPath } from "./visit-log";

const IG = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Instagram 300.0.0.0";
const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1";

test("an ad click is recorded with the ad that produced it", () => {
  const url = new URL("https://www.mountainconnects.com/go-for-a-season?utm_source=ig&utm_medium=paid_social&utm_campaign=Go%20for%20a%20season&utm_content=Come%20back%20ad");
  const v = visitFromRequest(url, IG);
  assert.deepEqual(v, {
    path: "/go-for-a-season",
    utm_source: "ig",
    utm_medium: "paid_social",
    utm_campaign: "Go for a season",
    utm_content: "Come back ad",
    in_app_browser: true,
    likely_bot: false,
  });
});

test("the in-app browser is what we are actually trying to see", () => {
  const url = new URL("https://x.test/go-for-a-season");
  assert.equal(visitFromRequest(url, IG).in_app_browser, true);
  assert.equal(visitFromRequest(url, SAFARI).in_app_browser, false);
});

test("a visit with no UTMs still counts", () => {
  const v = visitFromRequest(new URL("https://x.test/go-for-a-season"), SAFARI);
  assert.equal(v.utm_source, null);
  assert.equal(v.path, "/go-for-a-season");
});

/**
 * The count is only worth having if it is not mostly crawlers — every ad URL
 * gets fetched by scanners and previewers.
 */
test("crawlers and scanners are flagged, real browsers are not", () => {
  for (const ua of ["facebookexternalhit/1.1", "Googlebot/2.1", "curl/8.1", "python-requests/2.31", "HeadlessChrome/120"]) {
    assert.equal(looksLikeBot(ua), true, ua);
  }
  for (const ua of [IG, SAFARI]) assert.equal(looksLikeBot(ua), false, ua);
});

test("a request with no user agent is treated as a bot, not as a person", () => {
  assert.equal(looksLikeBot(null), true);
  assert.equal(looksLikeBot(""), true);
});

test("only the campaign page is counted, trailing slash or not", () => {
  assert.equal(isCampaignPath("/go-for-a-season"), true);
  assert.equal(isCampaignPath("/go-for-a-season/"), true);
  for (const p of ["/", "/jobs", "/signup", "/go-for-a-season-extra"]) {
    assert.equal(isCampaignPath(p), false, p);
  }
});

test("a hostile UTM cannot smuggle control characters or unbounded text", () => {
  const url = new URL("https://x.test/go-for-a-season?utm_source=" + encodeURIComponent("i\u0000g\n") + "&utm_campaign=" + "x".repeat(400));
  const v = visitFromRequest(url, SAFARI);
  assert.equal(v.utm_source, "ig");
  assert.equal(v.utm_campaign?.length, 120);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEventRow } from "./funnel-row";
import { FUNNEL_EVENTS } from "./track";

const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile Safari/604.1";
const IG = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Instagram 300.0.0.0";

test("a real funnel event becomes a row", () => {
  const row = buildEventRow(
    { event: "find_my_season_completed", destination: "canada", season: "northern-winter", work_type: "hospitality,retail" },
    IG,
  );
  assert.deepEqual(row, {
    event: "find_my_season_completed",
    destination: "canada",
    season: "northern-winter",
    // Joined, because question 3 takes more than one answer. A whitelist
    // without the comma dropped this silently.
    work_type: "hospitality,retail",
    in_app_browser: true,
    likely_bot: false,
  });
});

test("all five work types joined still fit the length cap", () => {
  const joined = "hospitality,mountain-operations,accommodation,retail,trades";
  assert.ok(joined.length <= 64, `${joined.length} characters`);
  assert.equal(buildEventRow({ event: "work_type_selected", work_type: joined }, SAFARI)?.work_type, joined);
});

test("every event the client can send is accepted", () => {
  for (const event of FUNNEL_EVENTS) {
    assert.equal(buildEventRow({ event }, SAFARI)?.event, event, event);
  }
});

/**
 * The endpoint is public and unauthenticated. Validation is the defence, so
 * anything that is not one of ours has to be refused outright rather than
 * stored and sorted out later.
 */
test("anything that is not one of our nine events is refused", () => {
  for (const event of ["", "pageview", "DROP TABLE", "worker_signup_completed ", null, 42, undefined]) {
    assert.equal(buildEventRow({ event }, SAFARI), null, JSON.stringify(event));
  }
  assert.equal(buildEventRow(null, SAFARI), null);
  assert.equal(buildEventRow("go_for_a_season_view", SAFARI), null);
  assert.equal(buildEventRow([], SAFARI), null);
});

test("a property that is not a short, plain value is dropped, not stored", () => {
  const row = buildEventRow(
    {
      event: "destination_selected",
      destination: "<script>alert(1)</script>",
      season: "x".repeat(65),
      work_type: "",
      placement: "result",
    },
    SAFARI,
  );
  assert.ok(row);
  assert.equal(row.destination, undefined, "script tag stored");
  assert.equal(row.season, undefined, "over-length value stored");
  assert.equal(row.work_type, undefined, "empty value stored");
  assert.equal(row.placement, "result", "a good value was dropped");
});

test("keys we do not recognise never reach the row", () => {
  const row = buildEventRow(
    { event: "go_for_a_season_view", email: "a@b.com", ip: "1.2.3.4", session_id: "abc", user_id: "u1" },
    SAFARI,
  );
  assert.ok(row);
  assert.deepEqual(Object.keys(row).sort(), ["event", "in_app_browser", "likely_bot"]);
});

test("the user agent decides two booleans and is not itself kept", () => {
  const ig = buildEventRow({ event: "go_for_a_season_view" }, IG);
  assert.equal(ig?.in_app_browser, true);
  assert.equal(ig?.likely_bot, false);
  const bot = buildEventRow({ event: "go_for_a_season_view" }, "facebookexternalhit/1.1");
  assert.equal(bot?.likely_bot, true);
  const none = buildEventRow({ event: "go_for_a_season_view" }, null);
  assert.equal(none?.likely_bot, true, "no user agent is a bot, not a person");
  for (const row of [ig, bot, none]) {
    assert.ok(row && !JSON.stringify(row).includes("Mozilla"), "the user agent was stored");
  }
});

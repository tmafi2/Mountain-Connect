import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanProps, pendingEventsForTest, track } from "./track";

test("event properties are a closed set, so nothing personal can ride along", () => {
  const sneaky = {
    destination: "canada",
    work_type: "hospitality",
    placement: "x".repeat(200),
    email: "someone@example.com",
    name: "Someone",
  } as unknown as Parameters<typeof cleanProps>[0];
  assert.deepEqual(cleanProps(sneaky), {
    destination: "canada",
    work_type: "hospitality",
    placement: "x".repeat(64),
  });
  assert.deepEqual(cleanProps({ destination: undefined, season: "" }), {});
});

test("events wait for consent, then go out in order with the next one", () => {
  const g = globalThis as unknown as { window?: { gtag?: (...args: unknown[]) => void } };
  g.window = {};
  try {
    // Before consent: gtag.js has not been loaded, so nothing can be sent.
    track("go_for_a_season_view");
    track("destination_selected", { destination: "japan" });
    assert.equal(pendingEventsForTest().length, 2);

    // Consent granted: CookieConsent loads gtag.js.
    const sent: unknown[][] = [];
    g.window.gtag = (...args: unknown[]) => void sent.push(args);
    track("season_selected", { destination: "japan", season: "winter" });

    assert.deepEqual(sent, [
      ["event", "go_for_a_season_view", {}],
      ["event", "destination_selected", { destination: "japan" }],
      ["event", "season_selected", { destination: "japan", season: "winter" }],
    ]);
    assert.equal(pendingEventsForTest().length, 0);
  } finally {
    delete g.window;
  }
});

test("on the server it does nothing and does not throw", () => {
  assert.doesNotThrow(() => track("worker_signup_clicked", { placement: "result" }));
  assert.equal(pendingEventsForTest().length, 0);
});

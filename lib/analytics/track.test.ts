import { test } from "node:test";
import assert from "node:assert/strict";
import { META_STANDARD_EVENTS, cleanProps, pendingEventsForTest, track } from "./track";

type Win = { gtag?: (...args: unknown[]) => void; fbq?: (...args: unknown[]) => void };
const g = globalThis as unknown as { window?: Win };

/** Empties both queues between tests by letting stub destinations drain them. */
function drain() {
  g.window = { gtag: () => {}, fbq: () => {} };
  track("go_for_a_season_view");
  delete g.window;
}

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
  drain();
  g.window = {};
  try {
    // Before consent: neither script has loaded, so nothing can be sent.
    track("go_for_a_season_view");
    track("destination_selected", { destination: "japan" });
    assert.equal(pendingEventsForTest().ga.length, 2);
    assert.equal(pendingEventsForTest().meta.length, 2);

    // Consent granted: CookieConsent loads gtag.js.
    const sent: unknown[][] = [];
    g.window.gtag = (...args: unknown[]) => void sent.push(args);
    track("season_selected", { destination: "japan", season: "northern-winter" });

    assert.deepEqual(sent, [
      ["event", "go_for_a_season_view", {}],
      ["event", "destination_selected", { destination: "japan" }],
      ["event", "season_selected", { destination: "japan", season: "northern-winter" }],
    ]);
    assert.equal(pendingEventsForTest().ga.length, 0);
  } finally {
    delete g.window;
  }
});

/**
 * The two scripts load independently. If GA flushed a shared queue before the
 * pixel arrived, Meta would never hear about the quiz — the events the
 * retargeting audiences are built from.
 */
test("one destination loading first does not take the other's events", () => {
  drain();
  g.window = {};
  try {
    track("find_my_season_completed", { destination: "canada" });
    const ga: unknown[][] = [];
    g.window.gtag = (...args: unknown[]) => void ga.push(args);
    track("worker_signup_clicked", { placement: "result" });
    assert.equal(ga.length, 2);
    assert.equal(pendingEventsForTest().meta.length, 2, "Meta's copies must still be waiting");

    const meta: unknown[][] = [];
    g.window.fbq = (...args: unknown[]) => void meta.push(args);
    track("browse_jobs_clicked", { placement: "result" });
    assert.deepEqual(meta, [
      ["trackCustom", "find_my_season_completed", { destination: "canada" }],
      ["track", "Lead", { placement: "result" }],
      ["trackCustom", "browse_jobs_clicked", { placement: "result" }],
    ]);
    assert.equal(pendingEventsForTest().meta.length, 0);
  } finally {
    delete g.window;
  }
});

test("the two moments the ads optimise for are Meta standard events", () => {
  assert.deepEqual(META_STANDARD_EVENTS, {
    worker_signup_clicked: "Lead",
    worker_signup_completed: "CompleteRegistration",
  });
  drain();
  const meta: unknown[][] = [];
  g.window = { fbq: (...args: unknown[]) => void meta.push(args) };
  try {
    track("worker_signup_completed", { destination: "japan", season: "northern-winter", work_type: "retail" });
    assert.deepEqual(meta, [
      ["track", "CompleteRegistration", { destination: "japan", season: "northern-winter", work_type: "retail" }],
    ]);
  } finally {
    delete g.window;
  }
});

test("a destination that never loads cannot grow without limit", () => {
  drain();
  g.window = {};
  try {
    for (let i = 0; i < 200; i++) track("destination_selected", { destination: "usa" });
    assert.equal(pendingEventsForTest().ga.length, 50);
    assert.equal(pendingEventsForTest().meta.length, 50);
  } finally {
    delete g.window;
  }
  drain();
});

test("on the server it does nothing and does not throw", () => {
  drain();
  assert.doesNotThrow(() => track("worker_signup_clicked", { placement: "result" }));
  assert.equal(pendingEventsForTest().ga.length, 0);
  assert.equal(pendingEventsForTest().meta.length, 0);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  OUTREACH_SEQUENCE,
  STANDALONE_TEMPLATES,
  findNextStep,
  allManualTemplates,
} from "./sequence";

/**
 * The cadence is a deliverability decision, not a preference: scraped
 * addresses that never opted in got 5.3 emails each, and the domain's mail
 * started landing in spam. These tests exist so a future edit that
 * re-lengthens the automatic funnel has to be deliberate.
 */
test("nobody receives more than two automatic emails", () => {
  assert.equal(OUTREACH_SEQUENCE.length, 2);
  assert.deepEqual(
    OUTREACH_SEQUENCE.map((s) => s.template),
    ["winter-outreach", "winter-followup-1"]
  );
});

test("the funnel stops after the one follow-up", () => {
  // Step 0 is fired by hand, so the cron only ever progresses from it.
  assert.equal(findNextStep("winter-outreach")?.template, "winter-followup-1");
  assert.equal(findNextStep("winter-followup-1"), null);
});

test("the cron never auto-progresses from a hand-sent email", () => {
  for (const t of ["winter-followup-2", "winter-followup-3", "winter-followup-final", "sales-dropin"]) {
    assert.equal(findNextStep(t), null, t);
  }
  // Never emailed at all: step 0 is manual, so the cron must not start anyone.
  assert.equal(findNextStep(null), null);
});

test("the retired follow-ups are still available to send by hand", () => {
  const manual = allManualTemplates().map((t) => t.template);
  for (const t of ["winter-followup-2", "winter-followup-3", "winter-followup-final"]) {
    assert.ok(manual.includes(t), `${t} should still be sendable`);
    assert.ok(
      STANDALONE_TEMPLATES.some((s) => s.template === t),
      `${t} should sit in the standalone bucket`
    );
  }
});

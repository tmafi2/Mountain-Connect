import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { isFatalForRun } from "./extract";

const H = new Headers();
const badRequest = () =>
  new Anthropic.BadRequestError(
    400,
    { type: "error", error: { type: "invalid_request_error", message: "Invalid request data" } },
    "Invalid request data",
    H,
  );

/**
 * The 16 September Canada run: 33 posts extracted and paid for, then post 34
 * carried something the API refused, and the whole run was thrown away on the
 * reasoning that "every post would fail the same way". Thirty-three successes
 * are proof that it would not.
 */
test("a 400 after a success is the post's fault, not the run's", () => {
  const out = isFatalForRun(badRequest(), true);
  assert.equal(out.fatal, false);
});

test("a 400 before any success stops the run", () => {
  const out = isFatalForRun(badRequest(), false);
  assert.equal(out.fatal, true, "a bad request shape would fail on all 77 — do not spend them");
});

/** Credentials and credits are run-level however far in they surface. */
test("auth, credit and model failures stay fatal regardless of progress", () => {
  const cases: Array<[string, unknown]> = [
    ["bad key", new Anthropic.AuthenticationError(401, {}, "unauthorized", H)],
    ["no credits", new Anthropic.PermissionDeniedError(403, {}, "credit balance too low", H)],
    ["wrong model", new Anthropic.NotFoundError(404, {}, "model not found", H)],
  ];
  for (const [label, err] of cases) {
    assert.equal(isFatalForRun(err, false).fatal, true, label + " (nothing succeeded yet)");
    assert.equal(isFatalForRun(err, true).fatal, true, label + " (after successes)");
  }
});

/** Anything unrecognised — a timeout, a socket reset — was never run-level. */
test("an unrecognised error is not fatal", () => {
  assert.equal(isFatalForRun(new Error("socket hang up"), false).fatal, false);
  assert.equal(isFatalForRun(new Error("socket hang up"), true).fatal, false);
});

test("the non-fatal 400 explains why it is being skipped", () => {
  const out = isFatalForRun(badRequest(), true);
  assert.match(String(out.hint), /this post only/i);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { lifespanDaysFor, expiryForTier, JOB_POST_LIFESPAN_DAYS, FREE_JOB_POST_LIFESPAN_DAYS } from "./expiry";
import { evaluatePostGate, canPostJob } from "@/lib/tier";

/**
 * The two rules that define the free offer: one post, ever, for four weeks.
 *
 * Both changed on 2026-08-30 — the slot used to come back each January, and
 * every tier used to get the same eight-week window. Worth pinning, because
 * either one silently reverting turns the trial back into a permanent free
 * listing and nobody would notice from the UI.
 */

const NOW = new Date("2026-09-01T00:00:00Z");
const free = { tier: "free" as const };
const paid = {
  tier: "free" as const,
  selected_tier: "standard" as const,
  subscription_status: "active",
};

test("a free post runs four weeks, a paid post eight", () => {
  assert.equal(lifespanDaysFor("free"), 28);
  assert.equal(lifespanDaysFor("standard"), 56);
  assert.equal(lifespanDaysFor("premium"), 56);
  assert.equal(FREE_JOB_POST_LIFESPAN_DAYS, 28);
  assert.equal(JOB_POST_LIFESPAN_DAYS, 56);
});

test("expiryForTier counts forward from the moment of publishing", () => {
  assert.equal(expiryForTier("free", NOW).toISOString().slice(0, 10), "2026-09-29");
  assert.equal(expiryForTier("standard", NOW).toISOString().slice(0, 10), "2026-10-27");
});

test("a free business with no history may post", () => {
  const g = evaluatePostGate(free, 0, 0, NOW, false);
  assert.equal(g.allowed, true);
  assert.equal(g.effectiveTier, "free");
});

/**
 * The heart of it: the slot is spent for good. A post that has been closed,
 * deleted or allowed to expire still counts, so "delete and repost" buys
 * nothing — which is what makes gating renewal fair rather than merely
 * annoying.
 */
test("a free business that has ever published cannot publish again", () => {
  const g = evaluatePostGate(free, 0, 1, NOW, false);
  assert.equal(g.allowed, false, "no live posts, but the slot was already spent");
  assert.equal(g.reason, "free_limit");
});

test("the free slot does not come back in a later year", () => {
  const nextYear = new Date("2027-03-01T00:00:00Z");
  const g = evaluatePostGate(free, 0, 1, nextYear, false);
  assert.equal(g.allowed, false, "it is once per account, not once per calendar year");
});

test("drafts do not spend the slot — only posts that went live count", () => {
  // everLiveJobs excludes drafts at the query level; the gate simply trusts
  // the count, so a business sitting on ten drafts is still allowed one.
  const g = evaluatePostGate(free, 0, 0, NOW, false);
  assert.equal(g.allowed, true);
});

test("paid tiers are capped by concurrent posts, not by history", () => {
  assert.equal(evaluatePostGate(paid, 0, 99, NOW, false).allowed, true, "history is irrelevant when paying");
  assert.equal(evaluatePostGate(paid, 5, 0, NOW, false).allowed, false, "but the active cap still applies");
});

test("canPostJob agrees with the gate for a spent free slot", () => {
  assert.equal(canPostJob("free", 0, 1), false);
  assert.equal(canPostJob("free", 0, 0), true);
});

/**
 * Without a count the gate must not invent headroom.
 */
test("a missing history count falls back to the active count, never to allowed", () => {
  assert.equal(canPostJob("free", 1), false, "one active post already fills the free tier");
});

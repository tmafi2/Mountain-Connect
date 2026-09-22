import { test } from "node:test";
import assert from "node:assert/strict";
import { paceDaily, deferredMessage, DAILY_OUTREACH_LIMIT } from "./pacing";

const leads = (n: number) => Array.from({ length: n }, (_, i) => `lead-${i}`);

test("a small batch goes out untouched", () => {
  const { send, deferred } = paceDaily(leads(10), 0, 50);
  assert.equal(send.length, 10);
  assert.equal(deferred.length, 0);
});

test("a big batch is trimmed to the limit, and the rest is kept, not dropped", () => {
  const { send, deferred } = paceDaily(leads(209), 0, 50);
  assert.equal(send.length, 50);
  assert.equal(deferred.length, 159);
  // Nothing is lost between the two halves.
  assert.deepEqual([...send, ...deferred], leads(209));
});

test("today's earlier sends count against the same budget", () => {
  const { send, deferred, roomToday } = paceDaily(leads(40), 45, 50);
  assert.equal(roomToday, 5);
  assert.equal(send.length, 5);
  assert.equal(deferred.length, 35);
});

test("once the day is spent nothing else goes out", () => {
  for (const sent of [50, 51, 5000]) {
    const { send, deferred } = paceDaily(leads(20), sent, 50);
    assert.equal(send.length, 0, `sent=${sent}`);
    assert.equal(deferred.length, 20);
  }
});

test("the limit can never be exceeded, whatever it is handed", () => {
  for (const already of [-10, 0, 7, 49, 50]) {
    for (const wanted of [0, 1, 49, 50, 500]) {
      const { send } = paceDaily(leads(wanted), already, 50);
      assert.ok(send.length + Math.max(0, already) <= 50, `already=${already} wanted=${wanted}`);
    }
  }
});

test("the deferred message says what happened rather than looking like an error", () => {
  assert.match(deferredMessage(0), /pacing limit/);
  assert.match(deferredMessage(5), /only 5/);
  for (const m of [deferredMessage(0), deferredMessage(5)]) {
    assert.match(m, /next run/);
    assert.ok(!/fail|error/i.test(m), m);
  }
});

test("the shipped limit is a sane number", () => {
  assert.ok(DAILY_OUTREACH_LIMIT > 0 && DAILY_OUTREACH_LIMIT <= 200, String(DAILY_OUTREACH_LIMIT));
});

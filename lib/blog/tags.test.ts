import { test } from "node:test";
import assert from "node:assert/strict";
import { TAGS, tagsFor, tagCounts } from "./tags";

const ALL = [
  "australian-working-holiday-visa-ski-season","new-zealand-vs-australia-ski-season-pay",
  "two-ski-seasons-in-one-year","questions-to-ask-before-accepting-ski-season-job",
  "is-a-ski-season-worth-it","how-to-avoid-ski-job-scams","best-ski-resorts-to-work-at-in-canada",
  "canada-ski-season-checklist-what-to-sort-before-you-go","doing-a-ski-season-at-big-white",
  "canada-vs-japan-ski-season","how-to-find-ski-season-accommodation",
  "how-to-set-up-in-a-ski-town-on-a-budget","how-to-land-your-first-ski-resort-job",
  "australian-ski-season-packing-list","first-ski-season-survival-guide",
];

test("every post that exists has at least one tag", () => {
  for (const s of ALL) assert.ok(tagsFor(s).length > 0, s);
});

test("an unknown post shows no chips rather than a wrong one", () => {
  assert.deepEqual(tagsFor("a-post-published-tomorrow"), []);
});

test("no post carries more than three — a card is not a wall of labels", () => {
  for (const s of ALL) assert.ok(tagsFor(s).length <= 3, `${s}: ${tagsFor(s).join(",")}`);
});

test("every tag used is in the vocabulary, and every tag in it is used", () => {
  const used = new Set(ALL.flatMap(tagsFor));
  for (const t of used) assert.ok((TAGS as readonly string[]).includes(t), `${t} is not declared`);
  for (const t of TAGS) assert.ok(used.has(t), `${t} is declared but tags nothing`);
});

test("a post's tags are not duplicated", () => {
  for (const s of ALL) assert.equal(new Set(tagsFor(s)).size, tagsFor(s).length, s);
});

// ⚠️ The /jobs category filter offered two options for 355 jobs (00110) and a
// worker read that as "there are no chef jobs here". Every chip shows its count.
test("counts are real and ordered by how much there is to read", () => {
  const counts = tagCounts(ALL);
  assert.ok(counts.length > 0);
  for (const { tag, count } of counts) {
    assert.equal(count, ALL.filter((s) => tagsFor(s).includes(tag)).length);
    assert.ok(count >= 1);
  }
  for (let i = 1; i < counts.length; i++) assert.ok(counts[i - 1].count >= counts[i].count);
});

test("filtering by any chip returns exactly what its count promised", () => {
  for (const { tag, count } of tagCounts(ALL)) {
    assert.equal(ALL.filter((s) => tagsFor(s).includes(tag)).length, count, tag);
  }
});

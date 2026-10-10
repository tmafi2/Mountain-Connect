import { test } from "node:test";
import assert from "node:assert/strict";
import { businessBelongsInSitemap } from "./sitemap-business";

const withJobs = new Set(["has-jobs"]);
const long = "x".repeat(120);

test("a live job is content, even with an empty profile", () => {
  // 163 of 164 businesses with live listings have no description and no logo.
  // This is the case that looks like a thin page and is not.
  assert.equal(
    businessBelongsInSitemap({ id: "has-jobs", is_claimed: false, description: null }, withJobs),
    true,
  );
});

test("a claimed business with a real description keeps its page between seasons", () => {
  assert.equal(
    businessBelongsInSitemap({ id: "quiet", is_claimed: true, description: long }, withJobs),
    true,
  );
});

test("claiming alone is not content", () => {
  assert.equal(
    businessBelongsInSitemap({ id: "empty", is_claimed: true, description: null }, withJobs),
    false,
  );
  assert.equal(
    businessBelongsInSitemap({ id: "stub", is_claimed: true, description: "   " }, withJobs),
    false,
  );
  assert.equal(
    businessBelongsInSitemap({ id: "short", is_claimed: true, description: "A pub." }, withJobs),
    false,
  );
});

test("an unclaimed shell with no jobs never gets in", () => {
  // These are import shells — 65 of them, and the thing 00098/00101 cleaned up.
  assert.equal(
    businessBelongsInSitemap({ id: "shell", is_claimed: false, description: null }, withJobs),
    false,
  );
  assert.equal(
    businessBelongsInSitemap({ id: "shell2", is_claimed: false, description: long }, withJobs),
    false,
    "a description does not make an unclaimed shell a real page",
  );
});

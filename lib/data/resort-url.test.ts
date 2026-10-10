/**
 * Guards the one-url-per-resort rule.
 *
 * /resorts/<id> answers on both the legacy id and the database UUID, which is
 * why the duplicate was invisible for so long: every link worked. The two
 * halves of the fix are the links (resortPath) and the redirect, and either
 * one alone leaves the duplicate reachable — so both are checked here.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resortPath } from "./resort-url";

const UUID = "e45a1b9d-1f95-4143-9910-70c42eb6ac57";

test("prefers the legacy id", () => {
  assert.equal(resortPath("11", UUID), "/resorts/11");
});

test("falls back to the UUID rather than emitting a 404", () => {
  // The UUID form redirects, so it still reaches the page. /resorts/null
  // would not, which is why this is a fallback and not an assertion.
  assert.equal(resortPath(null, UUID), `/resorts/${UUID}`);
  assert.equal(resortPath(undefined, UUID), `/resorts/${UUID}`);
  assert.equal(resortPath("", UUID), `/resorts/${UUID}`);
  assert.equal(resortPath("   ", UUID), `/resorts/${UUID}`);
});

test("never renders a nullish id into the path", () => {
  for (const legacy of [null, undefined, "", "  "]) {
    const path = resortPath(legacy as string | null | undefined, UUID);
    assert.ok(!/null|undefined/.test(path), `${String(legacy)} produced ${path}`);
  }
});

/** Read a repo file relative to the project root. */
function source(relative: string): string {
  return readFileSync(join(process.cwd(), relative), "utf8");
}

test("the town page builds every resort link through the helper", () => {
  // Town pages held four of these and were the only page type emitting the
  // UUID form in server-rendered html — the form a crawler actually sees.
  const src = source("app/(public)/towns/[slug]/page.tsx");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const raw = code.match(/\/resorts\/\$\{[^}]*\}/g) ?? [];
  assert.deepEqual(raw, [], `build these with resortPath: ${raw.join(", ")}`);
  assert.match(code, /resortPath\(/, "the town page must import and use resortPath");
});

test("the job board links the resort by legacy id, not job_posts.resort_id", () => {
  const code = source("app/(public)/jobs/JobsClient.tsx")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  assert.ok(
    !/\/resorts\/\$\{\s*job\.resort_id\s*\}/.test(code),
    "job.resort_id is the UUID — pass it to resortPath with the legacy id"
  );
  assert.match(code, /resortPath\(job\.resort_legacy_id/);
});

test("the jobs query selects the legacy id, or the fallback silently takes over", () => {
  // resortPath falls back to the UUID, so forgetting this in the select is a
  // regression that shows up as a redirect rather than as a broken link.
  const src = source("app/(public)/jobs/page.tsx");
  assert.match(src, /resorts\(name, country, legacy_id\)/);
  assert.match(src, /resort_legacy_id:/);
});

test("the UUID form permanently redirects to the legacy form", () => {
  const src = source("app/(public)/resorts/[id]/page.tsx");
  assert.match(src, /permanentRedirect\(/, "a canonical tag alone leaves the duplicate crawlable");
  // Guarded on `uuid`, which resolveResort only sets when the route was
  // ENTERED by UUID. Redirecting unconditionally would loop.
  assert.match(src, /if \(uuid\) \{/);
});

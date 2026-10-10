/**
 * No page may write the brand into a title the root template already suffixes.
 *
 * app/layout.tsx sets `template: "%s | Mountain Connects"`, so a page title
 * naming the brand itself ships doubled. Ten pages read
 * "Log In | Mountain Connects | Mountain Connects", including the home page
 * and /about — the two most likely to be quoted.
 *
 * ⚠️ THIS IS A TEST AND NOT A GREP ON PURPOSE. The first pass at this fixed
 * eight pages by searching for `title: "… | Mountain Connects"`, and missed
 * the home page, /about, /signup and /welcome because those put the brand at
 * the FRONT or the middle of the phrase ("About Mountain Connects — …"). One
 * shape of a bug is not the bug. This checks the only thing that actually
 * matters: does the string contain the brand at all.
 *
 * Two legitimate ways out, both in use:
 *   - drop it, and let the template add it ("Dashboard")
 *   - `title: { absolute: "…" }` when the brand is part of the sentence
 * `absolute` is an object, so it never matches the string pattern here.
 *
 * openGraph and twitter titles are NOT run through the template and SHOULD
 * carry the brand, so a title nested in one of those blocks is skipped.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const APP = join(process.cwd(), "app");
const BRAND = "Mountain Connects";

/** Every page/layout source under app/. */
function appSources(dir = APP): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...appSources(full));
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

/** True when `index` sits inside a still-open `openGraph:`/`twitter:` block. */
function insideSocialBlock(src: string, index: number): boolean {
  for (const key of ["openGraph: {", "twitter: {"]) {
    const start = src.lastIndexOf(key, index);
    if (start < 0) continue;
    let depth = 0;
    for (const ch of src.slice(start, index)) depth += Number(ch === "{") - Number(ch === "}");
    if (depth > 0) return true;
  }
  return false;
}

test("there are app sources to scan, so a bad walk cannot pass this file", () => {
  assert.ok(appSources().length > 50, `found ${appSources().length} files`);
});

test("the root layout still appends the brand, which is what makes this a rule", () => {
  const layout = readFileSync(join(APP, "layout.tsx"), "utf8");
  assert.match(layout, /template: "%s \| Mountain Connects"/);
});

test("no page title names the brand the template will append", () => {
  const offenders: string[] = [];
  for (const file of appSources()) {
    const src = readFileSync(file, "utf8");
    if (!src.includes(BRAND)) continue;
    for (const m of src.matchAll(/title:\s*"([^"]*)"/g)) {
      if (!m[1].includes(BRAND)) continue;
      if (insideSocialBlock(src, m.index ?? 0)) continue;
      const line = src.slice(0, m.index).split("\n").length;
      offenders.push(`${relative(process.cwd(), file)}:${line} → "${m[1]} | ${BRAND}"`);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `drop the brand, or use title: { absolute: "…" }:\n  ${offenders.join("\n  ")}`
  );
});

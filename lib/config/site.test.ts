/**
 * Guards the rule in lib/config/site.ts by scanning the cron routes
 * themselves, the way email-compat.test.ts scans the template directory: a
 * NEW cron is checked the moment it is saved, without anyone remembering to
 * add it here.
 *
 * The bug this exists for shipped twice. `new URL(request.url).origin` inside
 * a cron reads the Vercel DEPLOYMENT url, which is behind Deployment
 * Protection, so every emailed link lands on a login wall. It sent 127 day-14
 * warnings and 99 final notices with unopenable claim links before anyone
 * noticed, and the copy of it in job-post-expiry was holding the renewal link.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SITE_ORIGIN } from "./site";

const CRON_DIR = join(process.cwd(), "app/api/cron");

/** Every cron route file on disk. */
function cronRoutes(): string[] {
  if (!existsSync(CRON_DIR)) return [];
  return readdirSync(CRON_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(CRON_DIR, e.name, "route.ts"))
    .filter((f) => existsSync(f));
}

test("there are cron routes to check, so a bad glob cannot pass this file", () => {
  assert.ok(cronRoutes().length >= 4, `found ${cronRoutes().length} cron routes`);
});

test("no cron derives its origin from its own request", () => {
  const offenders: string[] = [];
  for (const file of cronRoutes()) {
    const src = readFileSync(file, "utf8");
    // Strip comments: the fix deliberately NAMES the forbidden expression in a
    // comment at each site, so that the next person reads it where the mistake
    // would be made. Only real code counts.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    if (/new URL\(\s*request\.url\s*\)\s*\.origin/.test(code)) {
      offenders.push(file.replace(process.cwd() + "/", ""));
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `cron routes must use SITE_ORIGIN from lib/config/site.ts, not the request url:\n  ${offenders.join("\n  ")}`
  );
});

test("the canonical origin is the public site, with no trailing slash", () => {
  assert.equal(SITE_ORIGIN, "https://www.mountainconnects.com");
  assert.ok(!SITE_ORIGIN.endsWith("/"), "a trailing slash would double up in `${origin}/claim/...`");
  assert.ok(!/vercel\.app/.test(SITE_ORIGIN), "a vercel.app origin is behind Deployment Protection");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import nextConfig from "../../next.config";

/**
 * Vercel Web Analytics has TWO halves and only one of them lives in this
 * repository. `<Analytics />` in app/layout.tsx is ours; the switch at
 * Vercel → the project → Analytics → Enable is not, and with it off the
 * script 404s and the component collects nothing while looking perfectly
 * healthy. Nothing here can test that half — these tests guard the half
 * that can regress in a commit.
 */

const layout = () => readFileSync(path.join(process.cwd(), "app", "layout.tsx"), "utf8");

type HeaderRule = { headers: Array<{ key: string; value: string }> };
type ConfigWithHeaders = { headers: () => Promise<HeaderRule[]> };

/**
 * NODE_ENV is typed read-only (Next declares it so), but the whole point here
 * is to read the header the app sends under each one. Writing it through an
 * indexed view is the assignment TypeScript will accept; the finally block
 * puts it back so test order cannot matter.
 */
const env_ = process.env as Record<string, string | undefined>;

/** The script-src directive the app would actually send under `env`. */
async function scriptSrcFor(env: "development" | "production"): Promise<string> {
  const before = process.env.NODE_ENV;
  try {
    env_.NODE_ENV = env;
    const rules = await (nextConfig as unknown as ConfigWithHeaders).headers();
    const csp = rules
      .flatMap((r) => r.headers)
      .find((h) => h.key === "Content-Security-Policy")?.value;
    assert.ok(csp, "no Content-Security-Policy header is being sent");
    const start = csp.indexOf("script-src");
    assert.ok(start >= 0, "the CSP has no script-src directive");
    const end = csp.indexOf(";", start);
    return csp.slice(start, end === -1 ? undefined : end);
  } finally {
    env_.NODE_ENV = before;
  }
}

/**
 * The import path is load-bearing. `@vercel/analytics/react` renders a
 * component that records the page it mounted on and nothing after it, so on
 * the App Router every client-side navigation would go uncounted — and this
 * is a site where a visitor lands on /go-for-a-season and moves through a
 * three-step quiz without a single full page load. `/next` reads the pathname
 * and reports each change. Both imports typecheck and both render; only one
 * measures the site.
 */
test("the root layout renders Analytics from the Next-aware entry point", () => {
  const src = layout();
  assert.match(
    src,
    /import\s*\{\s*Analytics\s*\}\s*from\s*["']@vercel\/analytics\/next["']/,
    "Analytics must come from @vercel/analytics/next — /react silently stops counting after the first page",
  );
  assert.match(src, /<Analytics\s*\/>/, "the layout imports Analytics but never renders it");
});

/**
 * Speed Insights was switched on at the Vercel dashboard for weeks while no
 * package was installed, so it collected nothing and looked fine from both
 * sides. The `dsn` assertion is the one that matters long-term: supplying it
 * moves the script to va.vercel-scripts.com IN PRODUCTION, where the CSP
 * blocks it — a prop that silently turns a working feature off.
 */
test("the root layout renders SpeedInsights first-party, with no dsn", () => {
  const src = layout();
  assert.match(
    src,
    /import\s*\{\s*SpeedInsights\s*\}\s*from\s*["']@vercel\/speed-insights\/next["']/,
    "SpeedInsights must come from @vercel/speed-insights/next",
  );
  assert.match(src, /<SpeedInsights\s*\/>/, "the layout imports SpeedInsights but never renders it");
  assert.ok(
    !/<SpeedInsights[^/>]*\bdsn\b/.test(src),
    "a dsn prop moves the production script to va.vercel-scripts.com, which the production CSP blocks",
  );
});

/**
 * In production the script is served first-party from the site's own origin
 * (/_vercel/insights/script.js), which is why 'self' is enough and why ad
 * blockers do not stop it. Under `next dev` the package swaps to a debug
 * build on va.vercel-scripts.com instead. That host belongs in the
 * development list only: putting it in production would be allowing a
 * third-party script host for a script production never requests.
 */
test("the analytics debug host is allowed in development and absent from production", async () => {
  const dev = await scriptSrcFor("development");
  const prod = await scriptSrcFor("production");

  assert.ok(
    dev.includes("https://va.vercel-scripts.com"),
    "development script-src needs va.vercel-scripts.com or the dev console only shows a CSP violation",
  );
  assert.ok(
    !prod.includes("va.vercel-scripts.com"),
    "production must not allow the analytics debug host — production loads analytics first-party",
  );
  // 'self' is what actually serves analytics in production. Narrowing it
  // would break the script without breaking anything that looks related.
  assert.ok(prod.includes("'self'"), "production script-src must keep 'self' for /_vercel/insights/script.js");
});

/**
 * Every other analytics tool on this site is gated behind the cookie banner.
 * This one deliberately is not, because it sets no cookie — so the policy
 * cannot be left saying that analytics runs only on consent. A reader of
 * section 2 would otherwise conclude nothing is counted unless they accept.
 */
test("the privacy policy discloses the cookieless page view counts", () => {
  const policy = readFileSync(
    path.join(process.cwd(), "app", "(public)", "privacy", "page.tsx"),
    "utf8",
  );
  assert.match(policy, /Vercel Web Analytics/, "section 2 must name the tool");
  assert.match(policy, /not covered by the cookie banner/, "it must say the banner does not gate it");
  assert.match(policy, /reset every 24 hours/, "it must say the visitor hash does not persist");
});

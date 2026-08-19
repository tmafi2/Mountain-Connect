/**
 * scripts/fb-monitor/browser.ts
 *
 * Shared browser plumbing for the collector.
 *
 * SESSION STORAGE. The logged-in profile lives at ~/.mountain-connect/fb-profile,
 * deliberately OUTSIDE the repository. It holds a live Facebook session; keeping
 * it out of the working tree means no .gitignore mistake can ever commit it.
 *
 * WHY NOT REUSE CHROME'S OWN PROFILE. On macOS Chrome encrypts its cookie store
 * with a key held in the login Keychain under "Chrome Safe Storage", released
 * only to Chrome's own code signature. A copied profile opened by Playwright's
 * Chromium decrypts to nothing, so there is no way around the one-time login.
 * In exchange the session is long-lived: a persistent profile that gets used
 * regularly stays signed in for months.
 */
import { homedir } from "node:os";
import * as path from "node:path";

import { chromium, type BrowserContext, type Page } from "playwright";

export const PROFILE_DIR = path.join(homedir(), ".mountain-connect", "fb-profile");

/** Desktop viewport — the mobile site has a different DOM we would have to learn twice. */
const VIEWPORT = { width: 1440, height: 900 };

/**
 * Launch the persistent context.
 *
 * `headless: false` for login (you need to see it); headless for scheduled runs.
 * Everything else is left at Playwright's defaults on purpose — this is not
 * pretending to be something it is not, it is just a browser signed into an
 * account that is a member of these groups.
 */
export async function launch(headless: boolean): Promise<BrowserContext> {
  return chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    viewport: VIEWPORT,
    locale: "en-US",
    // Facebook serves a heavier DOM to browsers advertising reduced motion off;
    // this also keeps animations from interfering with scroll measurement.
    reducedMotion: "reduce",
  });
}

/**
 * Is this page a logged-out wall rather than real content?
 *
 * Worth checking explicitly: a scraper that cannot tell "no posts today" from
 * "you are signed out" reports an empty run and you believe the group was quiet.
 */
export async function isLoggedOut(page: Page): Promise<boolean> {
  if (/\/login|\/checkpoint|\/recover/.test(page.url())) return true;

  // String form, not a TS callback: tsx/esbuild rewrites compiled functions
  // with helpers (__name and friends) that do not exist in page context, and
  // the resulting failures surface as opaque syntax errors inside evaluate.
  return page.evaluate(String.raw`(() => {
    return document.querySelector('input[type="password"]') !== null ||
      document.querySelector('form[action*="login"]') !== null;
  })()`) as Promise<boolean>;
}

/** Confirm the session works by loading a page only a signed-in account sees. */
export async function verifySession(page: Page): Promise<{ ok: boolean; reason?: string }> {
  await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(2_000);

  if (await isLoggedOut(page)) return { ok: false, reason: "not signed in" };
  return { ok: true };
}

/** Sleep with jitter, so pacing is never metronomic. */
export function pause(baseMs: number, jitterMs = baseMs * 0.4): Promise<void> {
  const delay = baseMs + (Math.random() * 2 - 1) * jitterMs;
  return new Promise((resolve) => setTimeout(resolve, Math.max(200, delay)));
}

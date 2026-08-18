/**
 * scripts/fb-monitor/login.ts
 *
 *   npm run fb:login
 *
 * One-time setup: opens a real browser window so YOU can sign in to Facebook.
 * The session is saved to ~/.mountain-connect/fb-profile and reused by every
 * scheduled run afterwards.
 *
 * This script never types, reads or stores your password. It opens a window and
 * then watches ONE thing from outside the page: whether a `c_user` cookie has
 * appeared, which is what Facebook sets once a session exists.
 *
 * It deliberately does not navigate, reload or evaluate anything in the page
 * while you are signing in. An earlier version polled by calling page.goto(),
 * which navigated the tab out from under the person typing into it — the login
 * form appeared to "keep refreshing" because it was being replaced every five
 * seconds. Cookie inspection happens on the context, not the page, so the tab
 * is left completely alone.
 */
import { launch, PROFILE_DIR } from "./browser";

const WAIT_MINUTES = 15;
const POLL_MS = 2_000;

async function main(): Promise<void> {
  process.stderr.write(
    `\nOpening a browser window.\n\n` +
      `  1. Sign in to Facebook as the account that belongs to your groups\n` +
      `  2. Complete any 2FA or checkpoint\n` +
      `  3. Wait here — this will detect it automatically\n\n` +
      `Nothing in this script touches the page while you work. It only watches\n` +
      `for the session cookie from outside.\n\n` +
      `Session will be saved to:\n  ${PROFILE_DIR}\n\n` +
      `Waiting up to ${WAIT_MINUTES} minutes…\n\n`,
  );

  const context = await launch(false);
  const page = context.pages()[0] ?? (await context.newPage());

  // The only navigation this script performs, before you start typing.
  await page.goto("https://www.facebook.com/", { waitUntil: "domcontentloaded" });

  const deadline = Date.now() + WAIT_MINUTES * 60_000;
  let userId: string | null = null;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));

    // Read cookies off the CONTEXT — no page interaction, no navigation.
    let cookies;
    try {
      cookies = await context.cookies("https://www.facebook.com");
    } catch {
      // The window was closed. Nothing more to wait for.
      break;
    }

    const cUser = cookies.find((cookie) => cookie.name === "c_user" && cookie.value);
    if (cUser) {
      userId = cUser.value;
      break;
    }
  }

  if (!userId) {
    process.stderr.write(
      `\nNo Facebook session detected.\n\n` +
        `  If the login form kept reloading on its own, that is Facebook declining\n` +
        `  the automated browser rather than a problem with your password.\n\n`,
    );
    await context.close().catch(() => {});
    process.exit(1);
  }

  process.stderr.write(
    `\n✓ Signed in (account id ${userId}). Session saved.\n\n` +
      `  You should not need to do this again. Next:\n` +
      `  npm run fb:collect -- --group <url> --posts 15 --headed\n\n` +
      `  Closing the window in 3 seconds…\n\n`,
  );

  // Give Chromium a moment to flush the profile to disk before we close it.
  await new Promise((resolve) => setTimeout(resolve, 3_000));
  await context.close().catch(() => {});
}

main().catch((error: unknown) => {
  process.stderr.write(`\nfb-login: ${error instanceof Error ? error.message : String(error)}\n\n`);
  process.exit(1);
});

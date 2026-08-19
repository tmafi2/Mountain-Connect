/**
 * scripts/fb-monitor/notify.ts
 *
 *   npx tsx scripts/fb-monitor/notify.ts --subject "..." --body-file <path>
 *
 * Sends an operational alert about the scheduled monitor, so a failure at 6am
 * surfaces in your inbox rather than in a log file nobody opens.
 *
 * WHY THIS EXISTS. The collector already detects an expired Facebook session
 * and writes FATAL to its log — but writing to a log only helps someone who
 * reads it. Before this, a session dying overnight meant three silent failures
 * a day until someone noticed listings had stopped appearing. That is exactly
 * how the TCC failure went unnoticed: the 06:00 run had already failed once,
 * and it only surfaced because a run was triggered by hand.
 *
 * WHAT IT CANNOT COVER. If the job fails before bash can execute run.sh at all
 * — a permissions problem, a moved repo, a broken interpreter — nothing here
 * runs either, because this script is downstream of the thing that failed.
 * Guarding against that needs a watcher outside the job; the staleness check
 * described at the bottom of this file is the cheap version.
 *
 * Uses the Resend REST API directly rather than lib/email/send.ts, which pulls
 * in the app's template stack. An ops alert wants to be plain and dependency
 * light — it has to work on the worst day, not the average one.
 */
import { readFileSync } from "node:fs";

import { loadEnvFile } from "../lead-monitor/common";

const FROM = "Mountain Connect <notifications@mountainconnects.com>";

function fail(message: string): never {
  process.stderr.write(`\nfb-notify: ${message}\n\n`);
  process.exit(1);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let subject = "Mountain Connect: fb-monitor alert";
  let bodyFile: string | null = null;
  let body = "";

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--subject") subject = argv[++i] ?? subject;
    else if (argv[i] === "--body-file") bodyFile = argv[++i] ?? null;
    else if (argv[i] === "--body") body = argv[++i] ?? "";
  }

  if (bodyFile) {
    try {
      body = readFileSync(bodyFile, "utf8");
    } catch (error) {
      body = `(could not read ${bodyFile}: ${error instanceof Error ? error.message : String(error)})`;
    }
  }

  loadEnvFile(".env.local");

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.ADMIN_NOTIFY_EMAIL?.trim();

  if (!apiKey) fail("RESEND_API_KEY is not set in .env.local");
  if (!to) {
    fail(
      "ADMIN_NOTIFY_EMAIL is not set in .env.local.\n\n" +
        "  Add the address alerts should go to:\n" +
        "    ADMIN_NOTIFY_EMAIL=you@example.com\n\n" +
        "  Note this also silently disables admin notifications in\n" +
        "  /api/support/reports and /api/location-requests, which read the\n" +
        "  same variable.",
    );
  }

  // Plain <pre> — a log excerpt should be readable, not styled.
  const html =
    `<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px">` +
    `<p style="font-family:system-ui,sans-serif;font-size:14px">` +
    `The scheduled Facebook monitor reported a problem. Log excerpt:</p>` +
    `<pre style="background:#f5f7fa;padding:12px;border-radius:8px;white-space:pre-wrap;overflow-x:auto">` +
    `${body.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c)}</pre>` +
    `<p style="font-family:system-ui,sans-serif;font-size:13px;color:#3d4f5f">` +
    `If this says the session expired, run <code>npm run fb:login</code> and sign in again.</p>` +
    `</div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text: body }),
  });

  if (!response.ok) {
    fail(`Resend returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
  }

  process.stderr.write(`alert sent to ${to}\n`);
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});

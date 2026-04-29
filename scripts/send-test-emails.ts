import { config } from "dotenv";
config({ path: ".env.local" });

import { Resend } from "resend";
import { firstApplicantNudgeEmail } from "../lib/email/templates/first-applicant-nudge";
import { eoiThresholdNudgeEmail } from "../lib/email/templates/eoi-threshold-nudge";
import { claimLastChanceEmail } from "../lib/email/templates/claim-last-chance";

const TO = "tyler@mountainconnects.com";
const FROM = "Tyler @ Mountain Connects <tyler@mountainconnects.com>";
const REPLY_TO = "tyler@mountainconnects.com";
const BASE = "https://www.mountainconnects.com";

const templates = [
  {
    name: "first-applicant-nudge",
    ...firstApplicantNudgeEmail({
      businessName: "Thredbo Alpine Village",
      jobTitle: "Lift Operator",
      claimUrl: `${BASE}/claim/abc-123-def-456`,
    }),
  },
  {
    name: "eoi-threshold-nudge",
    ...eoiThresholdNudgeEmail({
      businessName: "Thredbo Alpine Village",
      jobTitle: "Lift Operator",
      eoiCount: 5,
      claimUrl: `${BASE}/claim/abc-123-def-456`,
    }),
  },
  {
    name: "claim-last-chance",
    ...claimLastChanceEmail({
      businessName: "Thredbo Alpine Village",
      jobTitle: "Lift Operator",
      eoiCount: 7,
      takedownDate: "30 April 2026",
      claimUrl: `${BASE}/claim/abc-123-def-456`,
    }),
  },
];

// Optional filter: `npx tsx scripts/send-test-emails.ts first` only sends
// templates whose name includes the given substring. No arg → send all.
const filter = process.argv[2]?.toLowerCase();
const filtered = filter ? templates.filter((t) => t.name.toLowerCase().includes(filter)) : templates;

async function main() {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set in .env.local");
    process.exit(1);
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  if (filtered.length === 0) {
    console.error(`No templates matched filter "${filter}". Available: ${templates.map((t) => t.name).join(", ")}`);
    process.exit(1);
  }
  console.log(`Sending ${filtered.length} email${filtered.length === 1 ? "" : "s"} to ${TO}...`);

  for (const t of filtered) {
    try {
      const res = await resend.emails.send({
        from: FROM,
        replyTo: REPLY_TO,
        to: TO,
        subject: `[TEST] ${t.subject}`,
        html: t.html,
      });
      console.log(`${t.name.padEnd(32)} → ${res.data?.id ?? "no id"} ${res.error ? "ERROR: " + JSON.stringify(res.error) : "✓"}`);
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.log(`${t.name.padEnd(32)} ✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

main();

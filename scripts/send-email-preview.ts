/**
 * scripts/send-email-preview.ts
 *
 * Posts yourself the claim invites, in the states that actually differ, so
 * you can read them in a real inbox before anyone else does.
 *
 *   npx tsx scripts/send-email-preview.ts you@example.com
 *
 * Contacts no business and writes nothing. Every send goes to the one
 * address on the command line — there is no mode in which this mails a
 * recipient from the database, which is why it is separate from
 * send-claim-invite-it.ts rather than another flag on it.
 *
 * The states are chosen to straddle the thresholds the copy branches on:
 * whether there is any interest at all, and whether there is enough of it to
 * be worth naming a figure (five, the same cutoff the nudge emails fire on).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { sendImportOutreachEmail, sendImportOutreachItEmail } from "../lib/email/send";
import { SITE_ORIGIN } from "../lib/config/site";

const TO = process.argv[2];
if (!TO || !TO.includes("@")) {
  console.error("Usage: npx tsx scripts/send-email-preview.ts you@example.com");
  process.exit(1);
}

const CLAIM = `${SITE_ORIGIN}/claim/PREVIEW-TOKEN`;
// A real excerpt from the board, chosen because the sanitiser passes it:
// no name, no email address, no phone number, no link.
const EXCERPT =
  "I have experience working both front desk and in a bar. I also have over 10 years of customer service experience and love jobs where I can interact with people.";

async function main() {
  const sends: Array<{ what: string; run: () => Promise<unknown> }> = [
    {
      what: "EN · 3 listings · interest + a quote",
      run: () =>
        sendImportOutreachEmail({
          to: TO,
          businessName: "Alpine Lodge Whistler",
          jobTitle: "Line Cook",
          source: "Facebook",
          claimUrl: CLAIM,
          eoiCount: 3,
          otherListings: 2,
          coverLetterExcerpt: EXCERPT,
        }),
    },
    {
      what: "EN · 3 listings · no interest yet (the usual case)",
      run: () =>
        sendImportOutreachEmail({
          to: TO,
          businessName: "Alpine Lodge Whistler",
          jobTitle: "Line Cook",
          source: "Facebook",
          claimUrl: CLAIM,
          eoiCount: 0,
          otherListings: 2,
        }),
    },
    {
      what: "IT · 5 listings · 102 applicants (count in the subject)",
      run: () =>
        sendImportOutreachItEmail({
          to: TO,
          businessName: "Arnoga Mountain View Resort & Spa",
          source: "Facebook",
          claimUrl: CLAIM,
          eoiCount: 102,
          otherListings: 4,
          coverLetterExcerpt: EXCERPT,
        }),
    },
    {
      what: "IT · 1 listing · 2 applicants (below the threshold)",
      run: () =>
        sendImportOutreachItEmail({
          to: TO,
          businessName: "Pasticceria Svizzera",
          source: "Facebook",
          claimUrl: CLAIM,
          eoiCount: 2,
          otherListings: 0,
        }),
    },
  ];

  console.log(`\nSending ${sends.length} preview(s) to ${TO}. No business is contacted.\n`);
  for (const s of sends) {
    try {
      await s.run();
      console.log(`  sent  ${s.what}`);
    } catch (err) {
      console.error(`  FAILED  ${s.what}`, err);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  console.log("");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

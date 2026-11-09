interface ImportOutreachEmailProps {
  /**
   * A sanitised opening from one applicant's cover letter, or undefined.
   * ALWAYS from lib/email/cover-letter-excerpt.ts — never the raw `message`,
   * which carries an email address, a phone number or the writer's own name
   * in about one application in five. The helper refuses rather than
   * redacts, and respects expressions_of_interest.share_with_employer.
   */
  coverLetterExcerpt?: string;
  businessName: string;
  jobTitle: string;
  /**
   * Where the advert was found, e.g. "Facebook". ⚠️ DELIBERATELY NOT
   * RENDERED since 2026-11-09: naming the source in the opening line made a
   * cold email read like surveillance rather than an offer. Kept on the
   * props because every caller supplies it and because it is the honest
   * answer if a business asks where we got their advert — which the
   * reply-to invites them to do.
   */
  source: string;
  claimUrl: string;
  eoiCount: number;
  /**
   * How many FURTHER listings we published for this business alongside
   * jobTitle. We import one listing per role, so publishing a business's
   * queue can be a dozen jobs; they get one email, and it has to describe
   * what actually happened rather than name one listing and hide the rest.
   */
  otherListings?: number;
}

export function importOutreachEmail({
  businessName,
  jobTitle,
  source,
  claimUrl,
  eoiCount,
  coverLetterExcerpt,
  otherListings = 0,
}: ImportOutreachEmailProps) {
  const many = otherListings > 0;
  const listingCount = otherListings + 1;

  // NOTE ON "free". We publish every imported listing, so all of them are
  // genuinely live when this email goes out — but the free tier keeps ONE
  // live once the business claims, and they choose which (see the picker in
  // app/(public)/claim/[token]/ClaimForm.tsx). So the count and the word
  // "free" must never be joined: "13 free listings" is a promise the claim
  // page then takes back, which is the worst possible first impression.
  // Say how many exist, and say the claim is of a free listing, singular.

  // ⚠️ "generating interest" ONLY when there is interest, and NEVER with the
  // number attached. The branch stays because most of these go out the day
  // the listing is published, when the count is zero, and an email claiming
  // interest nobody has shown would make a business distrust the rest of it.
  //
  // The figure is dropped because it usually works against us: this email
  // fires at publish time, so the count is typically one to three, and "3
  // expressions of interest" reads as nobody is applying. "Generating
  // interest" is true at three and still true at ninety. The emails that DO
  // quote a number — eoi-threshold-nudge, claim-applicants-waiting — only
  // fire at five or more, so theirs is never a small one.
  const eoiLine = eoiCount > 0
    ? `${many ? "They're" : "It's"} already live and generating interest from seasonal workers looking for their next opportunity!`
    : `${many ? "They're" : "It's"} already live and visible to seasonal workers looking for their next opportunity.`;

  const subjectLine = many
    ? `Your ${listingCount} jobs on Mountain Connects`
    : `Your ${jobTitle} job on Mountain Connects`;
  const headerLine = many ? `${listingCount} LISTINGS` : jobTitle;
  // "a couple" up to three, "several" beyond it. The phrasing is Tyler's and
  // reads better than a bare figure, but it has to stay true: one business on
  // the board has nine listings, and telling them we found "a couple" is a
  // mistake they can count.
  const others = otherListings <= 3 ? "a couple of" : "several of";
  const sawLine = many
    ? `We came across your <strong>${jobTitle}</strong> position and ${others} your other job openings`
    : `We came across your <strong>${jobTitle}</strong> position`;

  return {
    subject: subjectLine,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <!-- Brand Masthead -->
          <tr>
            <td style="background-color:#ffffff;padding:24px 32px 0;text-align:center;">
              <img src="https://www.mountainconnects.com/images/email-logo.png" alt="Mountain Connects" width="52" height="52" style="display:inline-block;width:52px;height:52px;border-radius:12px;vertical-align:middle;" />
              <span style="display:inline-block;margin-left:10px;font-size:15px;font-weight:700;color:#0a1e33;letter-spacing:-0.3px;vertical-align:middle;">Mountain Connects</span>
            </td>
          </tr>
          <tr>
            <td bgcolor="#0a1e33" style="background-color:#0a1e33;background-image:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
              <p style="margin:0 0 10px;font-size:44px;">🏔️</p>
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;">Your ${many ? "jobs are" : "job is"} live on Mountain Connects</h1>
              <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">${headerLine}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Hi <strong style="color:#0a1e33;">${businessName}</strong>,
              </p>
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                I'm reaching out from Mountain Connects, a platform connecting seasonal workers with businesses in and around ski resorts. ${sawLine} and thought your business would be a great fit for the platform.
              </p>
              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                We've gone ahead and set up ${many ? `${listingCount} job listings` : "a job listing"} for you to get started. ${eoiLine}
              </p>
              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                You can claim your free listing below to update job details, view interested candidates, and manage applications and interviews, all in one place.
              </p>

              ${coverLetterExcerpt ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">
                <tr>
                  <td bgcolor="#f5f8fb" style="background-color:#f5f8fb;border-left:3px solid #2577ad;padding:16px 18px;">
                    <p style="margin:0 0 8px;color:#8899a6;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;">From one of the applications</p>
                    <p style="margin:0;color:#3d4f5f;font-size:14px;line-height:1.65;font-style:italic;">&ldquo;${coverLetterExcerpt}&rdquo;</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Claim your listing to read it in full and see who wrote it.
              </p>` : ""}

              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
                <tr>
                  <td bgcolor="#3b82f6" style="background-color:#3b82f6;background-image:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:10px;padding:15px 36px;text-align:center;">
                    <a href="${claimUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Claim your free listing →</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px;color:#8899a6;font-size:12px;text-align:center;">
                Or paste this link into your browser:<br/>
                <a href="${claimUrl}" style="color:#3b82f6;word-break:break-all;">${claimUrl}</a>
              </p>

              <p style="margin:0 0 16px;color:#4e5d6c;font-size:14px;line-height:1.7;">
                If you would prefer we take ${many ? "them" : "the listing"} down, just reply to this email and I will remove ${many ? "them" : "it"} right away.
              </p>

              <p style="margin:24px 0 0;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Cheers,<br/>
                <strong style="color:#0a1e33;">Tyler @ Mountain Connects</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f7f9fb;padding:24px 32px;text-align:center;border-top:1px solid #e8edf2;">
              <p style="margin:0 0 4px;color:#0a1e33;font-size:13px;font-weight:600;">Mountain Connects</p>
              <p style="margin:0;color:#8899a6;font-size:11px;line-height:1.5;">Connecting seasonal workers with mountain destinations worldwide.<br/>&copy; 2026 Mountain Connects. All rights reserved.</p>
            </td>
          </tr>
        </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

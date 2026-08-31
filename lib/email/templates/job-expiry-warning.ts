interface JobExpiryWarningEmailProps {
  businessName: string;
  jobTitles: string[];
  expiryDate: string;
  renewUrl: string;
  manageUrl: string;
  /**
   * Free accounts cannot renew — their post is a four-week trial. The email
   * must say so, or it promises a button that answers 402.
   */
  canRenew?: boolean;
}

/**
 * "Still hiring?" — sent a week before a business's job posts lapse.
 *
 * One email covers every role expiring in that window, never one per role:
 * a business with a dozen listings should not get a dozen emails. Same rule
 * migration 00088 established for the outreach cadence.
 *
 * The tone is a question, not a threat. Letting a filled role lapse is the
 * right outcome and the email says so plainly — the goal is an accurate
 * board, not a renewed one.
 */
export function jobExpiryWarningEmail({
  businessName,
  jobTitles,
  expiryDate,
  renewUrl,
  manageUrl,
  canRenew = true,
}: JobExpiryWarningEmailProps) {
  const many = jobTitles.length > 1;
  const heading = many
    ? `${jobTitles.length} of your listings expire on ${expiryDate}`
    : `Your ${jobTitles[0]} listing expires on ${expiryDate}`;

  const listRows = jobTitles
    .map(
      (t) => `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eef2f6;color:#0a1e33;font-size:15px;font-weight:600;">
                  ${t}
                </td>
              </tr>`
    )
    .join("");

  const cta = canRenew
    ? { url: renewUrl, label: many ? "Keep these listings live" : "Keep this listing live" }
    : { url: `${manageUrl.replace(/\/business\/.*$/, "")}/business/upgrade`, label: "See plans" };

  const closing = canRenew
    ? `${many ? "Filled them all?" : "Already filled it?"} Do nothing — ${
        many ? "they will pause themselves" : "it will pause itself"
      } on ${expiryDate}, and your applicants stay in your account either way.`
    : `Your first job post is free for four weeks. To keep ${
        many ? "them" : "it"
      } live past ${expiryDate} you'll need a plan — and your applicants stay in your account either way.`;

  return {
    subject: canRenew
      ? many
        ? `Still hiring? ${jobTitles.length} listings expire on ${expiryDate}`
        : `Still hiring? Your ${jobTitles[0]} listing expires on ${expiryDate}`
      : many
        ? `Your free listings end on ${expiryDate}`
        : `Your free ${jobTitles[0]} listing ends on ${expiryDate}`,
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
        <!-- Hero -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
            <p style="margin:0 0 10px;font-size:44px;">🗓️</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Still hiring?</h1>
            <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">One click to keep going</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#3d4f5f;font-size:16px;line-height:1.6;">Hi ${businessName},</p>
            <p style="margin:0 0 20px;color:#3d4f5f;font-size:16px;line-height:1.6;">
              ${heading}. We ask every couple of months so that workers browsing
              Mountain Connects only see roles that are genuinely open.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              ${listRows}
            </table>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
              <tr>
                <td style="border-radius:10px;background-color:#3b9ede;">
                  <a href="${cta.url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">
                    ${cta.label}
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px;color:#3d4f5f;font-size:15px;line-height:1.6;text-align:center;">
              ${closing}
            </p>
            <p style="margin:0;color:#7d8b99;font-size:13px;line-height:1.6;text-align:center;">
              You can also <a href="${manageUrl}" style="color:#3b9ede;text-decoration:none;">manage your listings</a> directly.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#f7f9fb;padding:24px 32px;text-align:center;border-top:1px solid #eef2f6;">
            <p style="margin:0;color:#7d8b99;font-size:12px;line-height:1.6;">
              Mountain Connects — seasonal jobs, simplified.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

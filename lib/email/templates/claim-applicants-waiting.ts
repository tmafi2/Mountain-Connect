interface ClaimApplicantsWaitingEmailProps {
  businessName: string;
  /** Roles that have someone waiting, most-wanted first. */
  roles: Array<{ title: string; count: number }>;
  totalWaiting: number;
  claimUrl: string;
}

/**
 * "Someone is waiting to hear from you" — for unclaimed businesses that have
 * real expressions of interest against their listings.
 *
 * REPLACES the removal warnings for these businesses, and they are exempt
 * from takedown. Threatening to delete a listing that people are actively
 * applying to is backwards: it is the most valuable listing on the board,
 * and the demand attached to it is the strongest argument for claiming that
 * we will ever have.
 *
 * So this email has no deadline in it. It says who is waiting and for what.
 * On 4 September one job seeker expressed interest in six bar roles across
 * four businesses in a single session; every one of those businesses had
 * already ignored a generic "claim your listing" email. "Maria applied for
 * your Bartender role today" is a different message entirely.
 *
 * Counts, never names. The people who expressed interest did not consent to
 * having their names mailed to a business that has not claimed its account
 * and has no agreement with us — that is exactly the kind of detail a
 * business should see only after signing in.
 */
export function claimApplicantsWaitingEmail({
  businessName,
  roles,
  totalWaiting,
  claimUrl,
}: ClaimApplicantsWaitingEmailProps) {
  const many = totalWaiting > 1;
  const top = roles[0];

  const rows = roles
    .map(
      (r) => `
              <tr>
                <td style="padding:11px 0;border-bottom:1px solid #eef2f6;color:#0a1e33;font-size:15px;font-weight:600;">${r.title}</td>
                <td style="padding:11px 0;border-bottom:1px solid #eef2f6;text-align:right;color:#3b9ede;font-size:15px;font-weight:700;white-space:nowrap;">
                  ${r.count} waiting
                </td>
              </tr>`
    )
    .join("");

  return {
    subject: many
      ? `${totalWaiting} people are waiting to hear from ${businessName}`
      : `Someone applied for your ${top?.title ?? "listing"}`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background-color:#ffffff;padding:24px 32px 0;text-align:center;">
            <img src="https://www.mountainconnects.com/images/email-logo.png" alt="Mountain Connect" width="52" height="52" style="display:inline-block;width:52px;height:52px;border-radius:12px;vertical-align:middle;" />
            <span style="display:inline-block;margin-left:10px;font-size:15px;font-weight:700;color:#0a1e33;letter-spacing:-0.3px;vertical-align:middle;">Mountain Connect</span>
          </td>
        </tr>
        <tr>
          <td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
            <p style="margin:0 0 8px;font-size:52px;font-weight:800;color:#22d3ee;line-height:1;">${totalWaiting}</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
              ${many ? "people are waiting to hear from you" : "person is waiting to hear from you"}
            </h1>
            <p style="margin:0;color:#f59e0b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Free to see who</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#3d4f5f;font-size:16px;line-height:1.6;">Hi ${businessName},</p>
            <p style="margin:0 0 22px;color:#3d4f5f;font-size:16px;line-height:1.6;">
              ${many ? "People have" : "Someone has"} applied to your ${roles.length > 1 ? "roles" : "role"}
              on Mountain Connect and ${many ? "are" : "is"} waiting to hear back. We can't pass
              ${many ? "their details" : "their details"} on until the listing is yours.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">${rows}</table>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
              <tr><td style="border-radius:10px;background-color:#3b9ede;">
                <a href="${claimUrl}" style="display:inline-block;padding:15px 36px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">
                  See who applied
                </a>
              </td></tr>
            </table>

            <p style="margin:0;color:#7d8b99;font-size:14px;line-height:1.6;text-align:center;">
              Claiming takes about a minute and costs nothing. Your listing stays up either way —
              we won't take it down while people are still applying.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f7f9fb;padding:24px 32px;text-align:center;border-top:1px solid #eef2f6;">
            <p style="margin:0;color:#7d8b99;font-size:12px;line-height:1.6;">Mountain Connect — seasonal jobs, simplified.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

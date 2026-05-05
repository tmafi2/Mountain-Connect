interface WinterFollowup1EmailProps {
  businessName: string;
  ctaUrl: string;
  unsubscribeUrl: string;
  locationName?: string;
  contactPersonName?: string;
}

/**
 * Email #2 in the winter outreach sequence — fired ~3 days after
 * the initial winter-outreach email. Casual "circling back" tone:
 * acknowledges the previous email and lowers the friction further.
 * Subject and copy lean on the location name when available so it
 * feels personalised rather than another mass send.
 */
export function winterFollowup1Email({
  businessName,
  ctaUrl,
  unsubscribeUrl,
  locationName,
  contactPersonName,
}: WinterFollowup1EmailProps) {
  const greeting = contactPersonName
    ? `Hi <strong style="color:#0a1e33;">${contactPersonName}</strong>,`
    : `Hi <strong style="color:#0a1e33;">${businessName}</strong> team,`;

  return {
    subject: locationName
      ? `Quick follow-up — workers asking about ${locationName}`
      : `Quick follow-up on Mountain Connects`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background-color:#ffffff;padding:24px 32px 0;text-align:center;">
            <img src="https://www.mountainconnects.com/images/email-logo.png" alt="Mountain Connects" width="52" height="52" style="display:inline-block;width:52px;height:52px;border-radius:12px;vertical-align:middle;" />
            <span style="display:inline-block;margin-left:10px;font-size:15px;font-weight:700;color:#0a1e33;letter-spacing:-0.3px;vertical-align:middle;">Mountain Connects</span>
          </td>
        </tr>
        <tr>
          <td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
            <p style="margin:0 0 10px;font-size:44px;">👀</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Just bumping this up your inbox</h1>
            <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Following up — winter 2026</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 24px;">
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              ${greeting}
            </p>
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Following up on my note from last week — workers are actively browsing Mountain Connects for ${locationName ? `<strong style="color:#0a1e33;">${locationName}</strong>-area ` : ""}roles this season, and I didn't want you to miss the chance to be on their radar.
            </p>
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Setting up a free profile for <strong style="color:#0a1e33;">${businessName}</strong> takes about two minutes — no listing required, no commitment, just a featured spot in front of workers looking right now.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="padding:18px 20px;background-color:#ecfeff;border-radius:12px;border-left:4px solid #22d3ee;">
                  <p style="margin:0 0 8px;color:#0e7490;font-size:14px;font-weight:700;">Free for businesses, always</p>
                  <ul style="margin:0;padding-left:18px;color:#155e75;font-size:13px;line-height:1.8;">
                    <li>A featured profile workers can discover</li>
                    <li>Unlimited job listings (when you want them)</li>
                    <li>Applicant inbox + direct messaging</li>
                    <li>No fees, no hidden costs, no surprises</li>
                  </ul>
                </td>
              </tr>
            </table>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
              <tr>
                <td style="background:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:10px;padding:15px 36px;text-align:center;">
                  <a href="${ctaUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Set up my profile (2 min) →</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;color:#8899a6;font-size:12px;text-align:center;">
              Or paste this link into your browser:<br/>
              <a href="${ctaUrl}" style="color:#3b82f6;word-break:break-all;">${ctaUrl}</a>
            </p>

            <p style="margin:0 0 16px;color:#4e5d6c;font-size:14px;line-height:1.7;">
              Any questions? Just hit reply.
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
            <p style="margin:0 0 10px;color:#8899a6;font-size:11px;line-height:1.5;">Connecting seasonal workers with mountain destinations worldwide.<br/>&copy; 2026 Mountain Connects. All rights reserved.</p>
            <p style="margin:0;color:#8899a6;font-size:11px;line-height:1.5;">
              <a href="${unsubscribeUrl}" style="color:#8899a6;text-decoration:underline;">Unsubscribe</a> from outreach emails
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

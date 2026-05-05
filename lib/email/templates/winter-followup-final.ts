interface WinterFollowupFinalEmailProps {
  businessName: string;
  ctaUrl: string;
  unsubscribeUrl: string;
  locationName?: string;
  contactPersonName?: string;
}

/**
 * Email #5 — the breakup. Final touch in the sequence after which
 * the lead receives nothing further from the drip cron. Warm, no
 * pressure, leaves the door open. Standard B2B "permission to close
 * the loop" pattern: psychologically lower-friction for the recipient
 * than another nudge.
 */
export function winterFollowupFinalEmail({
  businessName,
  ctaUrl,
  unsubscribeUrl,
  locationName,
  contactPersonName,
}: WinterFollowupFinalEmailProps) {
  const greeting = contactPersonName
    ? `Hi <strong style="color:#0a1e33;">${contactPersonName}</strong>,`
    : `Hi <strong style="color:#0a1e33;">${businessName}</strong> team,`;

  return {
    subject: `Last note from me`,
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
            <p style="margin:0 0 10px;font-size:44px;">👋</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Closing the loop</h1>
            <p style="margin:0;color:#94a3b8;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Final note</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 24px;">
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              ${greeting}
            </p>
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              I won't keep landing in your inbox. Just wanted to wrap up by saying — if you ever decide to give Mountain Connects a try, the door's always open.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="padding:18px 20px;background-color:#f7f9fb;border-radius:12px;border-left:4px solid #c8d5e0;">
                  <p style="margin:0 0 8px;color:#0a1e33;font-size:14px;font-weight:700;">What's there for you any time</p>
                  <ul style="margin:0;padding-left:18px;color:#4e5d6c;font-size:13px;line-height:1.8;">
                    <li>A free profile workers can discover</li>
                    <li>Unlimited job listings whenever you need them</li>
                    <li>Direct messaging + applicant management</li>
                    <li>No fees, no commitment, takes 2 minutes</li>
                  </ul>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Best of luck with the season ahead${locationName ? ` at <strong style="color:#0a1e33;">${locationName}</strong>` : ""} — wishing you a busy and successful winter.
            </p>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;" align="center">
              <tr>
                <td style="background:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:10px;padding:14px 32px;text-align:center;">
                  <a href="${ctaUrl}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Set up if you change your mind →</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;color:#8899a6;font-size:12px;text-align:center;">
              Or just reply to this email any time.
            </p>

            <p style="margin:24px 0 0;color:#4e5d6c;font-size:15px;line-height:1.7;">
              All the best,<br/>
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

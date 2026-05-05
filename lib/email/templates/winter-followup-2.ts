interface WinterFollowup2EmailProps {
  businessName: string;
  ctaUrl: string;
  unsubscribeUrl: string;
  locationName?: string;
  contactPersonName?: string;
}

/**
 * Email #3 in the winter outreach sequence — fired ~7 days after
 * email #2. Concrete-demand angle: shifts focus from "the platform"
 * to "the workers". Names actual cohorts looking right now to make
 * the demand feel real and present-tense.
 */
export function winterFollowup2Email({
  businessName,
  ctaUrl,
  unsubscribeUrl,
  locationName,
  contactPersonName,
}: WinterFollowup2EmailProps) {
  const greeting = contactPersonName
    ? `Hi <strong style="color:#0a1e33;">${contactPersonName}</strong>,`
    : `Hi <strong style="color:#0a1e33;">${businessName}</strong> team,`;

  return {
    subject: locationName
      ? `There are workers looking around ${locationName} right now`
      : `Workers actively looking right now`,
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
            <p style="margin:0 0 10px;font-size:44px;">🎿</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Workers near you, looking now</h1>
            <p style="margin:0;color:#10b981;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Live demand</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 24px;">
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              ${greeting}
            </p>
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Wanted to share something concrete — workers are actively signing up and searching${locationName ? ` for <strong style="color:#0a1e33;">${locationName}</strong>-area roles` : " for roles in your region"} this winter. Mostly the kinds of candidates seasonal businesses look for: working-holiday-visa holders, returning seasonal workers, and locals chasing flexible hours.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="padding:18px 20px;background-color:#ecfdf5;border-radius:12px;border-left:4px solid #10b981;">
                  <p style="margin:0 0 8px;color:#065f46;font-size:14px;font-weight:700;">Who's on the platform looking</p>
                  <ul style="margin:0;padding-left:18px;color:#047857;font-size:13px;line-height:1.8;">
                    <li>WHV holders looking for housekeeping, F&amp;B, and lift ops</li>
                    <li>Returning workers wanting full-season commitments</li>
                    <li>Locals after weekend or casual shifts</li>
                    <li>Experienced staff with prior alpine-resort seasons</li>
                  </ul>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              We've already connected several Snowy Mountains businesses with great hires this season — happy to do the same for you. Claiming your free profile takes about two minutes and lets you see who's looking.
            </p>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
              <tr>
                <td style="background:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:10px;padding:15px 36px;text-align:center;">
                  <a href="${ctaUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Claim profile + see who's looking →</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;color:#8899a6;font-size:12px;text-align:center;">
              Or paste this link into your browser:<br/>
              <a href="${ctaUrl}" style="color:#3b82f6;word-break:break-all;">${ctaUrl}</a>
            </p>

            <p style="margin:0 0 16px;color:#4e5d6c;font-size:14px;line-height:1.7;">
              Hit reply with any questions — happy to walk you through it.
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

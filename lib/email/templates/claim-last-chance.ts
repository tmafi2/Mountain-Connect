interface ClaimLastChanceEmailProps {
  businessName: string;
  jobTitle: string;
  eoiCount: number;
  takedownDate: string;
  claimUrl: string;
}

export function claimLastChanceEmail({ businessName, jobTitle, eoiCount, takedownDate, claimUrl }: ClaimLastChanceEmailProps) {
  const eoiLine = eoiCount > 0
    ? `You have <strong style="color:#0a1e33;">${eoiCount} ${eoiCount === 1 ? "person" : "people"}</strong> waiting to hear from you.`
    : `Job seekers are browsing your listing right now.`;

  return {
    subject: `Final notice: your ${jobTitle} listing will be removed`,
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
            <p style="margin:0 0 10px;font-size:44px;">⏰</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Final chance to claim your listing</h1>
            <p style="margin:0;color:#f59e0b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Action required</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 24px;">
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Hi <strong style="color:#0a1e33;">${businessName}</strong>,
            </p>
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Your <strong>${jobTitle}</strong> listing has been live on Mountain Connects for two weeks but has not been claimed yet. ${eoiLine}
            </p>

            <!-- Warning box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="padding:18px 20px;background-color:#fef3c7;border-radius:12px;border-left:4px solid #f59e0b;">
                  <p style="margin:0 0 6px;color:#92400e;font-size:14px;font-weight:700;">Listing will be removed on ${takedownDate}</p>
                  <p style="margin:0;color:#78350f;font-size:13px;line-height:1.6;">
                    If you do not claim your listing before this date, it will be taken down and any expressions of interest from job seekers will no longer be recoverable.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              This is a free listing — claiming it takes under a minute and gives you full control to edit details, see interested candidates, and start interviewing.
            </p>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
              <tr>
                <td style="background:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:10px;padding:15px 36px;text-align:center;">
                  <a href="${claimUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Claim your listing now →</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;color:#8899a6;font-size:12px;text-align:center;">
              Or paste this link into your browser:<br/>
              <a href="${claimUrl}" style="color:#3b82f6;word-break:break-all;">${claimUrl}</a>
            </p>

            <p style="margin:0 0 16px;color:#4e5d6c;font-size:14px;line-height:1.7;">
              If you would prefer we take the listing down now, just reply to this email.
            </p>

            <p style="margin:24px 0 0;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Cheers,<br/>
              <strong style="color:#0a1e33;">Tyler @ Mountain Connects</strong>
            </p>
          </td>
        </tr>
        <!-- Footer -->
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

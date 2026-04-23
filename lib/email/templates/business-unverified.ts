interface BusinessUnverifiedEmailProps {
  businessName: string;
  reason?: string | null;
  dashboardUrl: string;
}

export function businessUnverifiedEmail({
  businessName,
  reason,
  dashboardUrl,
}: BusinessUnverifiedEmailProps) {
  return {
    subject: `Your Mountain Connects verification has been removed`,
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
            <td style="background:linear-gradient(135deg,#0a1e33 0%,#78350f 100%);padding:44px 32px 36px;text-align:center;">
              <p style="margin:0 0 10px;font-size:44px;">⚠️</p>
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;">Verification Removed</h1>
              <p style="margin:0;color:#fbbf24;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Action required</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Hi <strong style="color:#0a1e33;">${businessName}</strong>,
              </p>
              <p style="margin:0 0 20px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Your business verification on Mountain Connects has been removed by our admin team. Your account remains active, but your profile and job listings are no longer publicly visible while you are unverified.
              </p>

              ${reason ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr><td style="padding:18px 20px;background-color:#fffbeb;border-radius:12px;border-left:4px solid #f59e0b;">
                    <p style="margin:0 0 6px;color:#78350f;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Note from our team</p>
                    <p style="margin:0;color:#4e5d6c;font-size:14px;line-height:1.6;">${reason}</p>
                </td></tr>
              </table>
              ` : ""}

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr><td style="padding:18px 20px;background-color:#f7f9fb;border-radius:12px;">
                    <p style="margin:0 0 10px;color:#0a1e33;font-size:14px;font-weight:700;">What this means</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding:3px 0;color:#4e5d6c;font-size:14px;">• Your company profile is hidden from public search</td></tr>
                      <tr><td style="padding:3px 0;color:#4e5d6c;font-size:14px;">• Active job listings are no longer visible to workers</td></tr>
                      <tr><td style="padding:3px 0;color:#4e5d6c;font-size:14px;">• You still have access to your dashboard and existing applicants</td></tr>
                      <tr><td style="padding:3px 0;color:#4e5d6c;font-size:14px;">• You can be re-verified at any time</td></tr>
                    </table>
                </td></tr>
              </table>

              <p style="margin:0 0 20px;color:#4e5d6c;font-size:14px;line-height:1.7;">
                If you believe this was in error or would like to discuss, please reply to this email or reach out to our support team.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:0 auto;" align="center">
                <tr>
                  <td style="background:linear-gradient(135deg,#0a1e33,#1a3a5c);border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="${dashboardUrl}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Go to Dashboard →</a>
                  </td>
                </tr>
              </table>
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

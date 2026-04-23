interface ListingClaimedEmailProps {
  businessName: string;
  dashboardUrl: string;
}

export function listingClaimedEmail({ businessName, dashboardUrl }: ListingClaimedEmailProps) {
  return {
    subject: `Welcome to Mountain Connects, ${businessName}!`,
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
            <td style="background:linear-gradient(135deg,#0a1e33 0%,#065f46 100%);padding:44px 32px 36px;text-align:center;">
              <p style="margin:0 0 10px;font-size:44px;">🎉</p>
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:28px;font-weight:800;">Listing claimed!</h1>
              <p style="margin:0;color:#34d399;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Welcome aboard</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Welcome, <strong style="color:#0a1e33;">${businessName}</strong>! Your listing on Mountain Connects is now under your control.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr><td style="padding:20px;background-color:#f0fdf4;border-radius:12px;border-left:4px solid #22c55e;">
                    <p style="margin:0 0 12px;color:#0a1e33;font-size:14px;font-weight:700;">What&#39;s next:</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding:5px 0;color:#4e5d6c;font-size:14px;">✅ &nbsp;Edit your listing — update the title, description, or perks</td></tr>
                      <tr><td style="padding:5px 0;color:#4e5d6c;font-size:14px;">✅ &nbsp;Check expressions of interest — see who reached out before you joined</td></tr>
                      <tr><td style="padding:5px 0;color:#4e5d6c;font-size:14px;">✅ &nbsp;Complete your profile — add a logo, cover photo, and company info</td></tr>
                      <tr><td style="padding:5px 0;color:#4e5d6c;font-size:14px;">✅ &nbsp;Apply for the verified badge to build trust with workers</td></tr>
                    </table>
                </td></tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
                <tr>
                  <td style="background:linear-gradient(135deg,#22c55e,#16a34a);border-radius:10px;padding:15px 36px;text-align:center;">
                    <a href="${dashboardUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Go to your dashboard →</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#8899a6;font-size:12px;line-height:1.6;text-align:center;">
                Got questions? Reply to this email and we&#39;ll get back to you.
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

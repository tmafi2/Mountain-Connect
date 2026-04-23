interface InstantInterviewDeclinedEmailProps {
  businessName: string;
  workerName: string;
  jobTitle: string;
  applicantsUrl: string;
}

export function instantInterviewDeclinedEmail({ businessName, workerName, jobTitle, applicantsUrl }: InstantInterviewDeclinedEmailProps) {
  return {
    subject: `${workerName} declined your instant interview request`,
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
          <tr><td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
              <p style="margin:0 0 10px;font-size:44px;">📋</p>
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;">Interview Declined</h1>
              <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Try scheduling instead</p>
          </td></tr>
          <tr><td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">Hi ${businessName},</p>
              <p style="margin:0 0 20px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                <strong style="color:#0a1e33;">${workerName}</strong> has declined your instant interview request for the <strong style="color:#0a1e33;">${jobTitle}</strong> position. They may not be available right now. You can try scheduling an interview at a mutually convenient time instead.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
                <tr><td style="background-color:#3b9ede;border-radius:10px;padding:15px 36px;text-align:center;">
                    <a href="${applicantsUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">View Applicants →</a>
                </td></tr>
              </table>
              <p style="margin:0;color:#8899a6;font-size:12px;text-align:center;">Or copy: <a href="${applicantsUrl}" style="color:#3b82f6;">${applicantsUrl}</a></p>
          </td></tr>
          <tr><td style="background-color:#f7f9fb;padding:24px 32px;text-align:center;border-top:1px solid #e8edf2;">
              <p style="margin:0 0 4px;color:#0a1e33;font-size:13px;font-weight:600;">Mountain Connects</p>
              <p style="margin:0;color:#8899a6;font-size:11px;">Connecting seasonal workers with mountain destinations worldwide.<br/>&copy; 2026 Mountain Connects.</p>
          </td></tr>
        </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

interface NewApplicantEmailProps {
  businessName: string;
  workerName: string;
  jobTitle: string;
  applicantsUrl: string;
}

export function newApplicantEmail({ businessName, workerName, jobTitle, applicantsUrl }: NewApplicantEmailProps) {
  return {
    subject: `New Application — ${workerName} applied for ${jobTitle}`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr><td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
              <p style="margin:0 0 10px;font-size:44px;">🙋</p>
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;">New Applicant!</h1>
              <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">${jobTitle}</p>
          </td></tr>
          <tr><td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">Hi ${businessName},</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr><td style="padding:20px;background-color:#eff6ff;border-radius:12px;border-left:4px solid #3b82f6;">
                    <p style="margin:0 0 6px;color:#0a1e33;font-size:16px;font-weight:700;">${workerName}</p>
                    <p style="margin:0;color:#4e5d6c;font-size:14px;">Applied for <strong>${jobTitle}</strong></p>
                </td></tr>
              </table>
              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">Review their profile, skills, and experience — then invite them for an interview or send an offer.</p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
                <tr><td style="background:linear-gradient(135deg,#3b82f6,#6366f1);border-radius:10px;padding:15px 36px;text-align:center;">
                    <a href="${applicantsUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Review Applicants →</a>
                </td></tr>
              </table>
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

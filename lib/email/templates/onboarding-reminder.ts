interface OnboardingReminderEmailProps {
  userName: string;
  accountType: "worker" | "business";
  loginUrl: string;
}

export function onboardingReminderEmail({
  userName,
  accountType,
  loginUrl,
}: OnboardingReminderEmailProps) {
  const isWorker = accountType === "worker";

  return {
    subject: `Complete your Mountain Connects profile — ${isWorker ? "start finding seasonal work" : "start posting jobs"}`,
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
            <td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
              <p style="margin:0 0 10px;font-size:44px;">${isWorker ? "⛷️" : "🏔️"}</p>
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;">Your profile is waiting!</h1>
              <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Complete your setup</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Hi <strong style="color:#0a1e33;">${userName || "there"}</strong>, you signed up for Mountain Connects but haven't completed your profile yet.
              </p>
              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                ${isWorker
                  ? "Complete your profile to start browsing seasonal jobs at ski resorts worldwide and let businesses discover you."
                  : "Complete your business profile to start posting job listings and connecting with seasonal workers."
                }
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:20px;background-color:#f0f9ff;border-radius:12px;border-left:4px solid #22d3ee;">
                    <p style="margin:0 0 10px;color:#0a1e33;font-size:14px;font-weight:700;">It only takes 2 minutes:</p>
                    <table cellpadding="0" cellspacing="0">
                      ${isWorker ? `
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.6;">1. Log in to your account</td></tr>
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.6;">2. Answer a few quick questions</td></tr>
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.6;">3. Start browsing jobs and applying</td></tr>
                      ` : `
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.6;">1. Log in to your account</td></tr>
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.6;">2. Set up your business profile</td></tr>
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.6;">3. Post your first job listing</td></tr>
                      `}
                    </table>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
                <tr>
                  <td style="background:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:10px;padding:15px 36px;text-align:center;">
                    <a href="${loginUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Complete Your Profile &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 36px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;text-align:center;">
                Mountain Connects &bull; Connecting seasonal workers with ski resort businesses worldwide
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

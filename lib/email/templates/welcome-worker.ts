interface WelcomeWorkerEmailProps {
  workerName: string;
  profileUrl: string;
}

export function welcomeWorkerEmail({
  workerName,
  profileUrl,
}: WelcomeWorkerEmailProps) {
  return {
    subject: `Welcome to Mountain Connect!`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f7f9fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f9fb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#0e2439;padding:24px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;">Mountain Connect</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;color:#0e2439;font-size:22px;">Welcome to Mountain Connect!</h1>
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.6;">
                Hi ${workerName},
              </p>
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.6;">
                Welcome aboard! Your account has been created and you're ready to start exploring seasonal job opportunities at ski resorts and mountain businesses around the world.
              </p>
              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.6;">
                To get started, complete your profile so businesses can learn more about you. A complete profile with your skills, experience, and availability helps you stand out and get noticed by top employers.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#0e2439;border-radius:8px;padding:14px 28px;">
                    <a href="${profileUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                      Complete Your Profile
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#4e5d6c;font-size:13px;line-height:1.5;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 24px;color:#a9cbe3;font-size:13px;word-break:break-all;">
                ${profileUrl}
              </p>
              <hr style="border:none;border-top:1px solid #ced7dd;margin:24px 0;" />
              <p style="margin:0;color:#4e5d6c;font-size:13px;">
                If you have any questions, log in to Mountain Connect and check your notifications.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f7f9fb;padding:20px 32px;text-align:center;">
              <p style="margin:0 0 8px;color:#4e5d6c;font-size:12px;">
                &copy; 2026 Mountain Connect. All rights reserved.
              </p>
              <p style="margin:0;color:#999999;font-size:11px;">
                You are receiving this email because you signed up on Mountain Connect. If you believe this was sent in error, please contact support.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

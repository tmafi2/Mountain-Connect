interface BusinessNewJobEmailProps {
  workerName: string;
  businessName: string;
  jobTitle: string;
  jobUrl: string;
  location: string;
  pay: string;
}

export function businessNewJobEmail({
  workerName,
  businessName,
  jobTitle,
  jobUrl,
  location,
  pay,
}: BusinessNewJobEmailProps) {
  return {
    subject: `New Job Posted — ${jobTitle} at ${businessName}`,
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
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Mountain Connect</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#0e2439;font-size:16px;line-height:1.5;">
                Hi ${workerName},
              </p>
              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.6;">
                <strong>${businessName}</strong>, a business you follow, just posted a new job listing:
              </p>

              <!-- Job Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f9fb;border-radius:8px;border:1px solid #ced7dd;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 4px;color:#0e2439;font-size:17px;font-weight:700;">${jobTitle}</p>
                    <p style="margin:0 0 8px;color:#4e5d6c;font-size:14px;">${businessName} &middot; ${location}</p>
                    <p style="margin:0;color:#0e2439;font-size:15px;font-weight:600;">${pay}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#0e2439;border-radius:8px;">
                    <a href="${jobUrl}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                      View Job &amp; Apply
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#4e5d6c;font-size:13px;line-height:1.5;">
                You're receiving this because you follow ${businessName} on Mountain Connect.
                You can manage your followed employers from your dashboard.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f7f9fb;padding:20px 32px;border-top:1px solid #ced7dd;">
              <p style="margin:0;color:#4e5d6c;font-size:12px;text-align:center;">
                Mountain Connect — Connecting seasonal workers with ski resort employers
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  };
}

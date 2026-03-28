interface ApplicationStatusChangedEmailProps {
  workerName: string;
  jobTitle: string;
  businessName: string;
  newStatus: "accepted" | "unsuccessful" | "interview";
  dashboardUrl: string;
}

function getStatusLabel(status: "accepted" | "unsuccessful" | "interview") {
  switch (status) {
    case "accepted":
      return { text: "Accepted", color: "#16a34a", bg: "#f0fdf4" };
    case "interview":
      return { text: "Interview", color: "#d97706", bg: "#fffbeb" };
    case "unsuccessful":
      return { text: "Unsuccessful", color: "#dc2626", bg: "#fef2f2" };
  }
}

export function applicationStatusChangedEmail({
  workerName,
  jobTitle,
  businessName,
  newStatus,
  dashboardUrl,
}: ApplicationStatusChangedEmailProps) {
  const status = getStatusLabel(newStatus);

  return {
    subject: `Application Update — ${jobTitle} at ${businessName}`,
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
              <h1 style="margin:0 0 16px;color:#0e2439;font-size:22px;">Application Status Update</h1>
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.6;">
                Hi ${workerName},
              </p>
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.6;">
                Your application for the <strong>${jobTitle}</strong> position at <strong>${businessName}</strong> has been updated.
              </p>
              <p style="margin:0 0 8px;color:#4e5d6c;font-size:15px;line-height:1.6;">
                Your new status is:
              </p>
              <!-- Status Badge -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:${status.bg};border-radius:8px;padding:12px 24px;border:1px solid ${status.color};">
                    <span style="color:${status.color};font-size:16px;font-weight:700;">${status.text}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.6;">
                Visit your dashboard for more details and next steps.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#0e2439;border-radius:8px;padding:14px 28px;">
                    <a href="${dashboardUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#4e5d6c;font-size:13px;line-height:1.5;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 24px;color:#a9cbe3;font-size:13px;word-break:break-all;">
                ${dashboardUrl}
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
                You are receiving this email because you have an active application on Mountain Connect. If you believe this was sent in error, please contact support.
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

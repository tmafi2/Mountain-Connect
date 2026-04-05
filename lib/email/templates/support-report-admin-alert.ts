interface SupportReportAdminAlertEmailProps {
  category: string;
  subject: string;
  userName: string;
  userEmail: string;
  message: string;
  pageUrl: string | null;
  reportUrl: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug Report",
  feature_request: "Feature Request",
  content_issue: "Content Issue",
  account_issue: "Account Issue",
  other: "General Feedback",
};

export function supportReportAdminAlertEmail({
  category,
  subject,
  userName,
  userEmail,
  message,
  pageUrl,
  reportUrl,
}: SupportReportAdminAlertEmailProps) {
  const categoryLabel = CATEGORY_LABELS[category] || "Report";

  return {
    subject: `[Mountain Connect] New ${categoryLabel} from ${userName}`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:#0a1e33;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">New ${categoryLabel}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;width:80px;">From:</td><td style="padding:6px 0;color:#0a1e33;font-size:14px;">${userName} (${userEmail})</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;">Category:</td><td style="padding:6px 0;color:#0a1e33;font-size:14px;">${categoryLabel}</td></tr>
                <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;">Subject:</td><td style="padding:6px 0;color:#0a1e33;font-size:14px;font-weight:600;">${subject}</td></tr>
                ${pageUrl ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:13px;font-weight:600;">Page:</td><td style="padding:6px 0;color:#3b9ede;font-size:13px;">${pageUrl}</td></tr>` : ""}
              </table>
              <div style="padding:16px;background-color:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;margin:0 0 24px;">
                <p style="margin:0;color:#374151;font-size:14px;line-height:1.7;white-space:pre-wrap;">${message}</p>
              </div>
              <table cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td style="background:#3b9ede;border-radius:8px;padding:12px 28px;">
                    <a href="${reportUrl}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">View in Admin Panel</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

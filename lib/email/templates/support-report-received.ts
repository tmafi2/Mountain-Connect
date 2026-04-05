interface SupportReportReceivedEmailProps {
  userName: string;
  category: string;
  subject: string;
  reportId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug Report",
  feature_request: "Feature Request",
  content_issue: "Content Issue",
  account_issue: "Account Issue",
  other: "General Feedback",
};

export function supportReportReceivedEmail({
  userName,
  category,
  subject,
  reportId,
}: SupportReportReceivedEmailProps) {
  const categoryLabel = CATEGORY_LABELS[category] || "Report";
  const refId = reportId.slice(0, 8).toUpperCase();

  return {
    subject: `We received your report — ${subject}`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
              <p style="margin:0 0 10px;font-size:44px;">📋</p>
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;">Report Received</h1>
              <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Reference: #${refId}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Hi <strong style="color:#0a1e33;">${userName}</strong>, thanks for taking the time to send us your feedback.
              </p>
              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                We've received your <strong style="color:#0a1e33;">${categoryLabel}</strong>: "${subject}"
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:20px;background-color:#f0f9ff;border-radius:12px;border-left:4px solid #22d3ee;">
                    <p style="margin:0 0 10px;color:#0a1e33;font-size:14px;font-weight:700;">What happens next:</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.6;">&#10003; &nbsp;Our team reviews all reports within 48 hours</td></tr>
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.6;">&#128269; &nbsp;We'll investigate and take appropriate action</td></tr>
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.6;">&#128233; &nbsp;You may hear from us if we need more details</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 36px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;text-align:center;">
                Mountain Connect &bull; Connecting seasonal workers with ski resort businesses worldwide
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

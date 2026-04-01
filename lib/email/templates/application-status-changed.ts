interface ApplicationStatusChangedEmailProps {
  workerName: string;
  jobTitle: string;
  businessName: string;
  newStatus: "accepted" | "unsuccessful" | "interview" | "offered" | "reviewed" | "shortlisted";
  dashboardUrl: string;
}

function getStatusConfig(status: string) {
  switch (status) {
    case "accepted": return { text: "Accepted! 🎉", emoji: "🎉", color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };
    case "offered": return { text: "Offer Received!", emoji: "🌟", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" };
    case "interview": return { text: "Interview Invited", emoji: "📅", color: "#d97706", bg: "#fffbeb", border: "#fde68a" };
    case "reviewed": return { text: "Under Review", emoji: "📋", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" };
    case "shortlisted": return { text: "Shortlisted", emoji: "⭐", color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" };
    case "unsuccessful": return { text: "Not Selected", emoji: "📨", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" };
    default: return { text: "Status Update", emoji: "📋", color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" };
  }
}

export function applicationStatusChangedEmail({
  workerName,
  jobTitle,
  businessName,
  newStatus,
  dashboardUrl,
}: ApplicationStatusChangedEmailProps) {
  const status = getStatusConfig(newStatus);

  return {
    subject: `Application Update — ${jobTitle} at ${businessName}`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
              <p style="margin:0 0 10px;font-size:44px;">${status.emoji}</p>
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;">Application Update</h1>
              <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">${jobTitle}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 20px;color:#4e5d6c;font-size:15px;line-height:1.7;">Hi ${workerName},</p>

              <!-- Status badge -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:20px;background-color:${status.bg};border-radius:12px;border:1px solid ${status.border};text-align:center;">
                    <p style="margin:0 0 6px;color:${status.color};font-size:20px;font-weight:800;">${status.text}</p>
                    <p style="margin:0;color:#4e5d6c;font-size:14px;">${jobTitle} at <strong>${businessName}</strong></p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                ${newStatus === "accepted" || newStatus === "offered"
                  ? "Congratulations! Check your dashboard for next steps."
                  : newStatus === "unsuccessful"
                  ? "Thank you for applying. Don't be discouraged — there are plenty more opportunities on Mountain Connect."
                  : "Log in to your dashboard to see the full details and take action."
                }
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
                <tr>
                  <td style="background:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:10px;padding:15px 36px;text-align:center;">
                    <a href="${dashboardUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">View Details →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f7f9fb;padding:24px 32px;text-align:center;border-top:1px solid #e8edf2;">
              <p style="margin:0 0 4px;color:#0a1e33;font-size:13px;font-weight:600;">Mountain Connect</p>
              <p style="margin:0;color:#8899a6;font-size:11px;line-height:1.5;">Connecting seasonal workers with mountain destinations worldwide.<br/>&copy; 2026 Mountain Connect. All rights reserved.</p>
            </td>
          </tr>
        </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

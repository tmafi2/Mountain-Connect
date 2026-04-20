interface AdminListingClaimedEmailProps {
  businessName: string;
  businessEmail: string;
  jobCount: number;
  adminBusinessUrl: string;
}

export function adminListingClaimedEmail({
  businessName,
  businessEmail,
  jobCount,
  adminBusinessUrl,
}: AdminListingClaimedEmailProps) {
  return {
    subject: `✅ ${businessName} claimed their listing`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:36px 32px 28px;text-align:center;">
              <p style="margin:0 0 8px;font-size:36px;">✅</p>
              <h1 style="margin:0 0 4px;color:#ffffff;font-size:22px;font-weight:700;">Listing claimed</h1>
              <p style="margin:0;color:#22d3ee;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;">Admin notification</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 20px;">
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:14px;line-height:1.7;">
                <strong style="color:#0a1e33;">${businessName}</strong> just claimed their imported listing and created an account on Mountain Connects.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#f7f9fb;border-radius:10px;">
                <tr><td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;color:#8899a6;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Business</p>
                    <p style="margin:0 0 14px;color:#0a1e33;font-size:14px;font-weight:600;">${businessName}</p>
                    <p style="margin:0 0 6px;color:#8899a6;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Email</p>
                    <p style="margin:0 0 14px;color:#0a1e33;font-size:14px;">${businessEmail}</p>
                    <p style="margin:0 0 6px;color:#8899a6;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Linked listings</p>
                    <p style="margin:0;color:#0a1e33;font-size:14px;">${jobCount} job${jobCount === 1 ? "" : "s"}</p>
                </td></tr>
              </table>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 10px;" align="center">
                <tr><td style="background:#0a1e33;border-radius:8px;padding:11px 24px;text-align:center;">
                    <a href="${adminBusinessUrl}" style="color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;">View in admin →</a>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f7f9fb;padding:16px 32px;text-align:center;border-top:1px solid #e8edf2;">
              <p style="margin:0;color:#8899a6;font-size:11px;line-height:1.5;">Mountain Connects — admin notification</p>
            </td>
          </tr>
        </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

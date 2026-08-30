interface JobAutoRenewedEmailProps {
  businessName: string;
  jobTitles: string[];
  expiryDate: string;
  pauseUrl: string;
}

/**
 * "We kept these live" — the auto-renew receipt.
 *
 * Auto-renew exists so a paying business never loses a listing to a missed
 * email. Renewing SILENTLY, though, recreates precisely the staleness this
 * whole feature was built to remove: a filled role quietly renewing itself
 * every eight weeks forever, with workers still applying to it.
 *
 * So it renews first and tells them after. Nothing to do if they are still
 * hiring, one click to stop if they are not — the opposite balance to the
 * warning email, and the right one when the default has already been taken.
 */
export function jobAutoRenewedEmail({
  businessName,
  jobTitles,
  expiryDate,
  pauseUrl,
}: JobAutoRenewedEmailProps) {
  const many = jobTitles.length > 1;
  const rows = jobTitles
    .map(
      (t) => `
              <tr><td style="padding:9px 0;border-bottom:1px solid #eef2f6;color:#0a1e33;font-size:15px;font-weight:600;">${t}</td></tr>`
    )
    .join("");

  return {
    subject: many
      ? `${jobTitles.length} listings renewed — still hiring?`
      : `${jobTitles[0]} renewed — still hiring?`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background-color:#ffffff;padding:24px 32px 0;text-align:center;">
            <img src="https://www.mountainconnects.com/images/email-logo.png" alt="Mountain Connects" width="52" height="52" style="display:inline-block;width:52px;height:52px;border-radius:12px;vertical-align:middle;" />
            <span style="display:inline-block;margin-left:10px;font-size:15px;font-weight:700;color:#0a1e33;letter-spacing:-0.3px;vertical-align:middle;">Mountain Connects</span>
          </td>
        </tr>
        <tr>
          <td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:40px 32px 32px;text-align:center;">
            <p style="margin:0 0 10px;font-size:40px;">♻️</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">${many ? "Renewed for you" : "Renewed for you"}</h1>
            <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Nothing to do</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#3d4f5f;font-size:16px;line-height:1.6;">Hi ${businessName},</p>
            <p style="margin:0 0 20px;color:#3d4f5f;font-size:16px;line-height:1.6;">
              Auto-renew is on for your account, so ${many ? "these listings are" : "this listing is"}
              staying live until <strong style="color:#0a1e33;">${expiryDate}</strong>.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${rows}</table>
            <p style="margin:0 0 18px;color:#3d4f5f;font-size:15px;line-height:1.6;">
              If ${many ? "any of these are" : "this is"} filled, please
              <a href="${pauseUrl}" style="color:#3b9ede;text-decoration:none;font-weight:600;">pause
              ${many ? "them" : "it"}</a> — workers are still applying, and a role that
              has gone is a wasted application on both sides.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f7f9fb;padding:24px 32px;text-align:center;border-top:1px solid #eef2f6;">
            <p style="margin:0;color:#7d8b99;font-size:12px;line-height:1.6;">Mountain Connects — seasonal jobs, simplified.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

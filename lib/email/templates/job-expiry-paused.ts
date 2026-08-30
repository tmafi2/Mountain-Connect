interface JobExpiryPausedEmailProps {
  businessName: string;
  jobTitles: string[];
  relistUrl: string;
  manageUrl: string;
}

/**
 * "Your listings are paused" — sent at the moment they actually pause,
 * never before. While the sweep was in emails_only this template was
 * deliberately not sent at all: telling a business their listing had been
 * paused while nothing was being paused would have been untrue.
 *
 * Applications are the reassurance that matters here. A business seeing
 * "paused" fears losing the people who already applied, and they lose
 * nothing — so that is said plainly rather than buried.
 */
export function jobExpiryPausedEmail({
  businessName,
  jobTitles,
  relistUrl,
  manageUrl,
}: JobExpiryPausedEmailProps) {
  const many = jobTitles.length > 1;
  const rows = jobTitles
    .map(
      (t) => `
              <tr><td style="padding:10px 0;border-bottom:1px solid #eef2f6;color:#0a1e33;font-size:15px;font-weight:600;">${t}</td></tr>`
    )
    .join("");

  return {
    subject: many
      ? `${jobTitles.length} of your listings are now paused`
      : `Your ${jobTitles[0]} listing is now paused`,
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
          <td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
            <p style="margin:0 0 10px;font-size:44px;">💤</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">${many ? "Your listings are paused" : "Your listing is paused"}</h1>
            <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Back in one click</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#3d4f5f;font-size:16px;line-height:1.6;">Hi ${businessName},</p>
            <p style="margin:0 0 20px;color:#3d4f5f;font-size:16px;line-height:1.6;">
              ${many ? "These roles have" : "This role has"} come to the end of the eight-week
              run and ${many ? "are" : "is"} no longer showing to workers. If you filled
              ${many ? "them" : "it"}, nothing more to do.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${rows}</table>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
              <tr><td style="border-radius:10px;background-color:#3b9ede;">
                <a href="${relistUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">
                  ${many ? "Put them back up" : "Put it back up"}
                </a>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;color:#3d4f5f;font-size:15px;line-height:1.6;text-align:center;">
              <strong style="color:#0a1e33;">Your applicants are untouched.</strong> Everyone who applied
              is still in your account, and stays there whether or not you relist.
            </p>
            <p style="margin:0;color:#7d8b99;font-size:13px;line-height:1.6;text-align:center;">
              <a href="${manageUrl}" style="color:#3b9ede;text-decoration:none;">Manage your listings</a>
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

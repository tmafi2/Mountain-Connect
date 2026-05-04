interface WinterOutreachEmailProps {
  businessName: string;
  /** Landing URL — usually /signup or a featured-business contact page. */
  ctaUrl: string;
  /** Required for any funnel email — one-click unsubscribe link with the
   *  lead's per-row token. Footer renders this as "Unsubscribe". */
  unsubscribeUrl: string;
  /** Optional location to personalise the body line — usually the resort
   *  or town the lead operates in (e.g. "Thredbo", "Jindabyne"). When
   *  set, the lead-in becomes "workers ready to start at <location>"
   *  instead of the generic copy. */
  locationName?: string;
}

export function winterOutreachEmail({
  businessName,
  ctaUrl,
  unsubscribeUrl,
  locationName,
}: WinterOutreachEmailProps) {
  const locationLine = locationName
    ? `Workers ready to start at <strong style="color:#0a1e33;">${locationName}</strong> this winter`
    : `Workers want to work for you this winter`;

  return {
    subject: locationName
      ? `Workers ready to start at ${locationName} this winter`
      : `Workers want to work for you this winter`,
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
        <!-- Hero -->
        <tr>
          <td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
            <p style="margin:0 0 10px;font-size:44px;">❄️</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">${locationLine}</h1>
            <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Winter 2026 — last-minute hiring</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 24px;">
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Hi <strong style="color:#0a1e33;">${businessName}</strong>,
            </p>
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              With the <strong style="color:#0a1e33;">2026 winter season just around the corner</strong>, we have a database of qualified workers ${locationName ? `actively looking for roles at <strong style="color:#0a1e33;">${locationName}</strong>` : `still actively looking to lock in their roles for the season`} — chefs, lift operators, instructors, housekeepers, baristas, and more.
            </p>
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              We've already connected several Snowy Mountains businesses with the perfect people for their roles this season, and we'd love to do the same for you.
            </p>

            <!-- Highlight box: low-friction pitch -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="padding:18px 20px;background-color:#ecfeff;border-radius:12px;border-left:4px solid #22d3ee;">
                  <p style="margin:0 0 6px;color:#0e7490;font-size:14px;font-weight:700;">You don't even have to list a job</p>
                  <p style="margin:0;color:#155e75;font-size:13px;line-height:1.6;">
                    If you'd rather just have your business featured on Mountain Connects, we'll showcase you to workers actively browsing the platform — no listings required, no commitment.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              And if you do have last-minute roles to fill, you can list them in under five minutes — workers will see them straight away.
            </p>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
              <tr>
                <td style="background:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:10px;padding:15px 36px;text-align:center;">
                  <a href="${ctaUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Feature my business →</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;color:#8899a6;font-size:12px;text-align:center;">
              Or paste this link into your browser:<br/>
              <a href="${ctaUrl}" style="color:#3b82f6;word-break:break-all;">${ctaUrl}</a>
            </p>

            <p style="margin:0 0 16px;color:#4e5d6c;font-size:14px;line-height:1.7;">
              Happy to answer any questions — just reply to this email.
            </p>

            <p style="margin:24px 0 0;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Cheers,<br/>
              <strong style="color:#0a1e33;">Tyler @ Mountain Connects</strong>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#f7f9fb;padding:24px 32px;text-align:center;border-top:1px solid #e8edf2;">
            <p style="margin:0 0 4px;color:#0a1e33;font-size:13px;font-weight:600;">Mountain Connects</p>
            <p style="margin:0 0 10px;color:#8899a6;font-size:11px;line-height:1.5;">Connecting seasonal workers with mountain destinations worldwide.<br/>&copy; 2026 Mountain Connects. All rights reserved.</p>
            <p style="margin:0;color:#8899a6;font-size:11px;line-height:1.5;">
              <a href="${unsubscribeUrl}" style="color:#8899a6;text-decoration:underline;">Unsubscribe</a> from outreach emails
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

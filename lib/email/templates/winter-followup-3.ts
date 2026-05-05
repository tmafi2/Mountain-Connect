interface WinterFollowup3EmailProps {
  businessName: string;
  ctaUrl: string;
  unsubscribeUrl: string;
  /** Where to send the "yes please" reply. Defaults to the from address
   *  but can be overridden if a specific sales rep should own this lead. */
  replyToEmail?: string;
  locationName?: string;
  contactPersonName?: string;
}

/**
 * Email #4 in the winter outreach sequence — fired ~14 days after
 * email #3. Removes the last bit of friction by offering to do the
 * setup ourselves. Strong commitment from the sender; should only
 * fire to leads who haven't actioned the previous emails.
 */
export function winterFollowup3Email({
  businessName,
  ctaUrl,
  unsubscribeUrl,
  replyToEmail = "tyler@mountainconnects.com",
  locationName,
  contactPersonName,
}: WinterFollowup3EmailProps) {
  const greeting = contactPersonName
    ? `Hi <strong style="color:#0a1e33;">${contactPersonName}</strong>,`
    : `Hi <strong style="color:#0a1e33;">${businessName}</strong> team,`;

  const replyMailto = `mailto:${replyToEmail}?subject=${encodeURIComponent(
    `Yes please — set up ${businessName} on Mountain Connects`
  )}&body=${encodeURIComponent(
    `Hi Tyler,\n\nGo ahead and set us up. ${locationName ? `We're based in/around ${locationName}.\n\n` : ""}Thanks!`
  )}`;

  return {
    subject: `Want me to set you up?`,
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
            <p style="margin:0 0 10px;font-size:44px;">🤝</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Happy to do the setup for you</h1>
            <p style="margin:0;color:#f59e0b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Zero-effort option</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 24px;">
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              ${greeting}
            </p>
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              I know hiring season is busy, so here's an even easier option for getting <strong style="color:#0a1e33;">${businessName}</strong> on Mountain Connects:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="padding:20px 22px;background-color:#fef3c7;border-radius:12px;border-left:4px solid #f59e0b;">
                  <p style="margin:0 0 8px;color:#92400e;font-size:15px;font-weight:700;">Just reply with "yes please"</p>
                  <p style="margin:0;color:#78350f;font-size:13px;line-height:1.7;">
                    I'll set up your free profile myself${locationName ? `, attach <strong>${locationName}</strong> as your location,` : ""} and send you the login. You don't have to do anything except review it and let me know if you want anything tweaked.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Why I'm offering this — every business that gets on the platform becomes discoverable to a database of qualified workers. The setup is the only friction. So let me remove it.
            </p>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;" align="center">
              <tr>
                <td style="background:linear-gradient(135deg,#f59e0b,#ea580c);border-radius:10px;padding:15px 36px;text-align:center;">
                  <a href="${replyMailto}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Reply "yes please" →</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;color:#8899a6;font-size:12px;text-align:center;">
              Or if you'd rather do it yourself, <a href="${ctaUrl}" style="color:#3b82f6;">set up here</a> — takes about 2 minutes.
            </p>

            <p style="margin:24px 0 0;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Cheers,<br/>
              <strong style="color:#0a1e33;">Tyler @ Mountain Connects</strong>
            </p>
          </td>
        </tr>
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

interface ClaimRemovalNoticeEmailProps {
  businessName: string;
  jobTitle: string;
  eoiCount: number;
  removalDate: string;
  claimUrl: string;
}

/**
 * The FIRST removal warning, two weeks before the listing comes down.
 *
 * Deliberately not a final notice — that is a separate email a week later.
 * This one arrives cold: the business never created this listing, has never
 * dealt with us, and may not have opened the original outreach at all. An
 * email that opens with a deadline reads as pressure from a stranger, so
 * this one leads with what they stand to lose rather than what we are about
 * to do.
 *
 * Where people are already waiting, that is the whole message. A listing
 * with five interested workers is worth claiming for its own sake, and the
 * removal date is a footnote to it.
 */
export function claimRemovalNoticeEmail({
  businessName,
  jobTitle,
  eoiCount,
  removalDate,
  claimUrl,
}: ClaimRemovalNoticeEmailProps) {
  const waiting = eoiCount > 0;
  const lead = waiting
    ? `<strong style="color:#0a1e33;">${eoiCount} ${eoiCount === 1 ? "person has" : "people have"}</strong> asked about your <strong style="color:#0a1e33;">${jobTitle}</strong> role, and ${eoiCount === 1 ? "is" : "are"} waiting to hear back.`
    : `Your <strong style="color:#0a1e33;">${jobTitle}</strong> listing has been live on Mountain Connect, in front of workers looking for the season.`;

  return {
    subject: waiting
      ? `${eoiCount} ${eoiCount === 1 ? "person is" : "people are"} waiting on your ${jobTitle} listing`
      : `Your ${jobTitle} listing comes down on ${removalDate}`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <tr>
          <td style="background-color:#ffffff;padding:24px 32px 0;text-align:center;">
            <img src="https://www.mountainconnects.com/images/email-logo.png" alt="Mountain Connect" width="52" height="52" style="display:inline-block;width:52px;height:52px;border-radius:12px;vertical-align:middle;" />
            <span style="display:inline-block;margin-left:10px;font-size:15px;font-weight:700;color:#0a1e33;letter-spacing:-0.3px;vertical-align:middle;">Mountain Connect</span>
          </td>
        </tr>
        <tr>
          <td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
            <p style="margin:0 0 10px;font-size:44px;">${waiting ? "👋" : "📋"}</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">
              ${waiting ? "Someone's waiting on you" : "Your listing is still live"}
            </h1>
            <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Free to claim</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#3d4f5f;font-size:16px;line-height:1.6;">Hi ${businessName},</p>
            <p style="margin:0 0 20px;color:#3d4f5f;font-size:16px;line-height:1.6;">${lead}</p>
            <p style="margin:0 0 24px;color:#3d4f5f;font-size:16px;line-height:1.6;">
              We listed the role after spotting your post. Claiming it takes about a minute, costs
              nothing, and puts you in control of it — ${waiting ? "and shows you who has been in touch." : "including who applies and how they reach you."}
            </p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 22px;">
              <tr><td style="border-radius:10px;background-color:#3b9ede;">
                <a href="${claimUrl}" style="display:inline-block;padding:14px 34px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">Claim your listing</a>
              </td></tr>
            </table>
            <p style="margin:0;color:#7d8b99;font-size:14px;line-height:1.6;text-align:center;">
              If we've got the wrong business, or you'd rather not be listed, ignore this and the
              listing will come down by itself on <strong style="color:#3d4f5f;">${removalDate}</strong>.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f7f9fb;padding:24px 32px;text-align:center;border-top:1px solid #eef2f6;">
            <p style="margin:0;color:#7d8b99;font-size:12px;line-height:1.6;">Mountain Connect — seasonal jobs, simplified.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

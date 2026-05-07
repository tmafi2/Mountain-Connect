interface AreaJob {
  title: string;
  businessName: string;
  location: string;
  pay: string;
  jobUrl: string;
}

interface AreaJobsUpdateEmailProps {
  workerName: string;
  areaName: string;
  jobs: AreaJob[];
  browseUrl: string;
}

// Conversational, text-heavy layout. Avoids big gradient heroes, full-
// width CTA buttons, multi-emoji blocks, and other "marketing template"
// signals so Gmail is more likely to deliver to Primary rather than
// Promotions.
export function areaJobsUpdateEmail({
  workerName,
  areaName,
  jobs,
  browseUrl,
}: AreaJobsUpdateEmailProps) {
  const greetingName = workerName?.trim() || "there";

  const jobLines = jobs
    .map((job) => {
      const meta = [job.location, job.pay].filter((s) => s && s.length > 0).join(" · ");
      return `
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #eef1f4;">
                  <a href="${job.jobUrl}" style="color:#0a1e33;text-decoration:none;font-size:15px;font-weight:600;">${job.title}</a>
                  <div style="margin-top:2px;color:#4e5d6c;font-size:13px;">${job.businessName}${meta ? ` — ${meta}` : ""}</div>
                </td>
              </tr>`;
    })
    .join("");

  return {
    subject: `${jobs.length} new jobs in ${areaName}`,
    text: [
      `Hey ${greetingName},`,
      "",
      `Just a quick heads up — ${jobs.length} new jobs have gone up in ${areaName} on Mountain Connects:`,
      "",
      ...jobs.map(
        (j) =>
          `• ${j.title} — ${j.businessName}${j.location ? ` (${j.location})` : ""}${j.pay ? ` — ${j.pay}` : ""}\n  ${j.jobUrl}`
      ),
      "",
      `You can browse the full list here: ${browseUrl}`,
      "",
      "Cheers,",
      "Tyler",
      "Mountain Connects",
      "",
      "If you'd rather not hear about new jobs in your area, just reply to this email and I'll take you off the list.",
    ].join("\n"),
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a1e33;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;padding:32px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:0 0 22px;">
            <img src="https://www.mountainconnects.com/images/email-logo.png" alt="Mountain Connects" width="32" height="32" style="display:inline-block;width:32px;height:32px;border-radius:8px;vertical-align:middle;" />
            <span style="display:inline-block;margin-left:8px;font-size:14px;font-weight:600;color:#0a1e33;vertical-align:middle;">Mountain Connects</span>
          </td>
        </tr>
        <tr>
          <td style="padding:0;color:#0a1e33;font-size:15px;line-height:1.6;">
            <p style="margin:0 0 14px;">Hey ${greetingName},</p>
            <p style="margin:0 0 14px;">Just a quick heads up — ${jobs.length} new jobs have gone up in ${areaName} on Mountain Connects:</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 16px;">
              ${jobLines}
            </table>
            <p style="margin:0 0 14px;">If any of those look like a fit, you can apply directly through the listing page. <a href="${browseUrl}" style="color:#3b9ede;text-decoration:underline;">See the full list of ${areaName} jobs</a>.</p>
            <p style="margin:0 0 4px;">Cheers,</p>
            <p style="margin:0 0 22px;">Tyler<br/><span style="color:#8899a6;font-size:13px;">Mountain Connects</span></p>
          </td>
        </tr>
        <tr>
          <td style="padding-top:16px;border-top:1px solid #eef1f4;color:#8899a6;font-size:12px;line-height:1.6;">
            If you'd rather not hear about new jobs in your area, just reply to this email and I'll take you off the list.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

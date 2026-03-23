interface InterviewConfirmationEmailProps {
  recipientName: string;
  otherPartyName: string;
  jobTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  interviewUrl: string;
}

export function interviewConfirmationEmail({
  recipientName,
  otherPartyName,
  jobTitle,
  date,
  startTime,
  endTime,
  timezone,
  interviewUrl,
}: InterviewConfirmationEmailProps) {
  return {
    subject: `Interview Confirmed — ${jobTitle} on ${date}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background-color:#f7f9fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f9fb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background-color:#0e2439;padding:24px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;">Mountain Connect</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;color:#0e2439;font-size:22px;">Interview Confirmed!</h1>
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.6;">
                Hi ${recipientName},
              </p>
              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.6;">
                Your interview for <strong>${jobTitle}</strong> with <strong>${otherPartyName}</strong> has been confirmed.
              </p>
              <!-- Details box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f9fb;border-radius:8px;margin:0 0 24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 8px;color:#0e2439;font-size:14px;font-weight:600;">Date: ${date}</p>
                    <p style="margin:0 0 8px;color:#0e2439;font-size:14px;font-weight:600;">Time: ${startTime} – ${endTime}</p>
                    <p style="margin:0;color:#4e5d6c;font-size:13px;">Timezone: ${timezone}</p>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#0e2439;border-radius:8px;padding:14px 28px;">
                    <a href="${interviewUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">
                      View Interview Details
                    </a>
                  </td>
                </tr>
              </table>
              <hr style="border:none;border-top:1px solid #ced7dd;margin:24px 0;" />
              <p style="margin:0;color:#4e5d6c;font-size:13px;">
                You&apos;ll be able to join the video call from your interview page when it&apos;s time.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f7f9fb;padding:20px 32px;text-align:center;">
              <p style="margin:0;color:#4e5d6c;font-size:12px;">
                Mountain Connect — Connecting seasonal workers with ski resort businesses worldwide.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

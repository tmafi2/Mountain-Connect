interface LoginOtpEmailProps {
  userName: string;
  code: string;
}

export function loginOtpEmail({ userName, code }: LoginOtpEmailProps) {
  return {
    subject: `${code} — Your Mountain Connects login code`,
    html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f4f8;padding:40px 20px;">
    <tr><td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
              <p style="margin:0 0 10px;font-size:44px;">🔐</p>
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;">Login Verification</h1>
              <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Two-Factor Authentication</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Hi <strong style="color:#0a1e33;">${userName}</strong>, enter this code to complete your login:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" style="padding:24px;background-color:#f0f4f8;border-radius:12px;">
                    <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:8px;color:#0a1e33;font-family:monospace;">${code}</p>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 20px;background-color:#fef3c7;border-radius:12px;border-left:4px solid #f59e0b;">
                    <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                      This code expires in <strong>10 minutes</strong>. If you didn't try to log in, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 36px;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;text-align:center;">
                Mountain Connects &bull; Connecting seasonal workers with ski resort businesses worldwide
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

interface WaitlistWorkerEmailProps {
  email: string;
}

export function waitlistWorkerEmail({ email }: WaitlistWorkerEmailProps) {
  return {
    subject: "You're on the list! ⛷️ Mountain Connects is coming this winter",
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
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <!-- Brand Masthead -->
          <tr>
            <td style="background-color:#ffffff;padding:24px 32px 0;text-align:center;">
              <img src="https://www.mountainconnects.com/images/email-logo.png" alt="Mountain Connects" width="52" height="52" style="display:inline-block;width:52px;height:52px;border-radius:12px;vertical-align:middle;" />
              <span style="display:inline-block;margin-left:10px;font-size:15px;font-weight:700;color:#0a1e33;letter-spacing:-0.3px;vertical-align:middle;">Mountain Connects</span>
            </td>
          </tr>
          <!-- Hero Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:40px 32px 32px;text-align:center;">
              <p style="margin:0 0 8px;font-size:40px;">🏔️</p>
              <h1 style="margin:0 0 4px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Mountain Connects</h1>
              <p style="margin:0;color:#22d3ee;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Coming This Winter</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 24px;">
              <h2 style="margin:0 0 16px;color:#0a1e33;font-size:22px;font-weight:700;">You're in! The adventure starts soon 🎉</h2>
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Hey there! Welcome to the Mountain Connects waitlist. You're now one of the first to know when we launch — and trust us, it's going to be worth the wait.
              </p>
              <p style="margin:0 0 20px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                We're building the ultimate platform to connect seasonal workers like you with ski resorts, mountain towns, and adventure destinations worldwide. Whether it's your first season or your tenth — we've got you.
              </p>

              <!-- Feature highlights -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 20px;background-color:#f0fdf9;border-radius:12px;border-left:4px solid #22d3ee;">
                    <p style="margin:0 0 12px;color:#0a1e33;font-size:14px;font-weight:700;">What's coming for you:</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.5;">⛷️ &nbsp;Browse jobs at ski resorts & mountain towns worldwide</td></tr>
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.5;">🏠 &nbsp;Find accommodation & connect with other seasonaires</td></tr>
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.5;">✅ &nbsp;Build a verified profile that stands out to employers</td></tr>
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.5;">🌍 &nbsp;One platform for every mountain destination</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                We'll drop you an email as soon as we're live. In the meantime, help us spread the word — the more people on the platform, the better it is for everyone!
              </p>

              <!-- Share CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;" align="center">
                <tr>
                  <td style="background:linear-gradient(135deg,#22d3ee,#3b9ede);border-radius:10px;padding:14px 32px;text-align:center;">
                    <a href="https://www.mountainconnects.com/coming-soon" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;letter-spacing:0.3px;">
                      Share Mountain Connects with Friends →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Social Links -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
                <tr>
                  <td style="text-align:center;padding:16px 0 8px;">
                    <p style="margin:0 0 12px;color:#0a1e33;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Follow the journey</p>
                    <table cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="padding:0 8px;"><a href="https://www.instagram.com/mountain.connects" style="color:#3b9ede;text-decoration:none;font-size:14px;font-weight:600;">Instagram</a></td>
                        <td style="color:#c8d5e0;">|</td>
                        <td style="padding:0 8px;"><a href="https://www.tiktok.com/@mountain.connects" style="color:#3b9ede;text-decoration:none;font-size:14px;font-weight:600;">TikTok</a></td>
                        <td style="color:#c8d5e0;">|</td>
                        <td style="padding:0 8px;"><a href="https://www.facebook.com/MountainConnects" style="color:#3b9ede;text-decoration:none;font-size:14px;font-weight:600;">Facebook</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f7f9fb;padding:24px 32px;text-align:center;border-top:1px solid #e8edf2;">
              <p style="margin:0 0 4px;color:#0a1e33;font-size:13px;font-weight:600;">Mountain Connects</p>
              <p style="margin:0;color:#8899a6;font-size:12px;line-height:1.5;">
                Connecting adventurous workers with mountain destinations worldwide.<br />
                You're receiving this because you signed up at mountainconnects.com
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

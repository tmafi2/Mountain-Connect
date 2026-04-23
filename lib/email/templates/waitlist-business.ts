interface WaitlistBusinessEmailProps {
  email: string;
  businessName: string;
  resort: string;
}

export function waitlistBusinessEmail({ email, businessName, resort }: WaitlistBusinessEmailProps) {
  return {
    subject: `Welcome to Mountain Connects — ${businessName} is on the list`,
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
          <!-- Professional Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0a1e33 0%,#132d4a 50%,#1a3a5c 100%);padding:40px 32px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin:0 0 4px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Mountain Connects</h1>
                    <p style="margin:0;color:#c8d5e0;font-size:13px;font-weight:500;letter-spacing:0.5px;">Seasonal Workforce Platform</p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <p style="margin:0;font-size:36px;">🏔️</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 24px;">
              <h2 style="margin:0 0 20px;color:#0a1e33;font-size:22px;font-weight:700;">Thank you for joining us, ${businessName}</h2>
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                We're delighted to confirm that <strong>${businessName}</strong> has been added to the Mountain Connects waitlist. You're among the first businesses to join — and that means early access when we launch this winter.
              </p>
              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Mountain Connects is a purpose-built platform designed to streamline seasonal recruitment for mountain and resort businesses. No more scattered job boards, lost applications, or last-minute staffing gaps.
              </p>

              <!-- Value Props -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="padding:20px 24px;background-color:#f8fafc;border-radius:12px;border:1px solid #e8edf2;">
                    <p style="margin:0 0 16px;color:#0a1e33;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">How Mountain Connects helps your business</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e8edf2;">
                          <table cellpadding="0" cellspacing="0"><tr>
                            <td style="padding-right:12px;vertical-align:top;"><span style="display:inline-block;width:28px;height:28px;background-color:#e0f7fa;border-radius:8px;text-align:center;line-height:28px;font-size:14px;">📋</span></td>
                            <td><p style="margin:0;color:#0a1e33;font-size:14px;font-weight:600;">Streamlined Recruitment</p><p style="margin:4px 0 0;color:#4e5d6c;font-size:13px;line-height:1.5;">Post jobs, review applications, and schedule interviews — all in one place.</p></td>
                          </tr></table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-bottom:1px solid #e8edf2;">
                          <table cellpadding="0" cellspacing="0"><tr>
                            <td style="padding-right:12px;vertical-align:top;"><span style="display:inline-block;width:28px;height:28px;background-color:#e0f7fa;border-radius:8px;text-align:center;line-height:28px;font-size:14px;">✅</span></td>
                            <td><p style="margin:0;color:#0a1e33;font-size:14px;font-weight:600;">Verified Worker Profiles</p><p style="margin:4px 0 0;color:#4e5d6c;font-size:13px;line-height:1.5;">Access a pool of pre-verified seasonal workers with experience, certifications, and references.</p></td>
                          </tr></table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;">
                          <table cellpadding="0" cellspacing="0"><tr>
                            <td style="padding-right:12px;vertical-align:top;"><span style="display:inline-block;width:28px;height:28px;background-color:#e0f7fa;border-radius:8px;text-align:center;line-height:28px;font-size:14px;">🌍</span></td>
                            <td><p style="margin:0;color:#0a1e33;font-size:14px;font-weight:600;">Global Reach, Local Focus</p><p style="margin:4px 0 0;color:#4e5d6c;font-size:13px;line-height:1.5;">Reach workers worldwide who are specifically looking for roles in mountain and resort destinations.</p></td>
                          </tr></table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What's Next -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="padding:20px 24px;background:linear-gradient(135deg,#0a1e33,#132d4a);border-radius:12px;">
                    <p style="margin:0 0 8px;color:#22d3ee;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">What happens next</p>
                    <p style="margin:0;color:#e0e8f0;font-size:14px;line-height:1.7;">
                      We'll be in touch to help set up your business account before launch. As an early adopter, you'll get priority onboarding and dedicated support to get your job listings live from day one.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                In the meantime, if you have any questions or want to learn more, don't hesitate to reach out. We'd love to hear from you.
              </p>

              <!-- Contact -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
                <tr>
                  <td style="padding:16px 24px;background-color:#f8fafc;border-radius:12px;border:1px solid #e8edf2;text-align:center;">
                    <p style="margin:0 0 8px;color:#0a1e33;font-size:13px;font-weight:700;">Get in touch</p>
                    <a href="mailto:hello@mountainconnects.com" style="color:#3b9ede;text-decoration:none;font-size:15px;font-weight:600;">hello@mountainconnects.com</a>
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
                The seasonal workforce platform for mountain businesses.<br />
                You're receiving this because ${businessName} was registered at mountainconnects.com
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

import { PRICING, FOUNDING_PRICING_ENDS, SEASON_PASS_TERM } from "@/lib/tier";

interface PaidPlansAnnouncementEmailProps {
  businessName: string;
  /** First name of the owner if we have it — makes the greeting personal. */
  contactPersonName?: string;
  /** End of this business's courtesy window (grace_period_ends_at). */
  courtesyEndsAt: Date;
  plansUrl: string;
  dashboardUrl: string;
}

// Format in UTC so a date pinned to end-of-day UTC (e.g. FOUNDING_PRICING_ENDS
// = 2027-04-30T23:59:59Z) doesn't roll into the next day in AEST/EST.
const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/**
 * One-off announcement to every business that signed up before billing
 * existed. Our Terms promise advance notice of pricing changes; this is it.
 *
 * Tone: these are the earliest supporters. Lead with what they KEEP (full
 * Premium access until their courtesy window ends, free first post forever),
 * be plain about what's changing and when, and frame founding pricing as a
 * genuine thank-you rather than a pitch. No pressure, no dark patterns.
 */
export function paidPlansAnnouncementEmail({
  businessName,
  contactPersonName,
  courtesyEndsAt,
  plansUrl,
  dashboardUrl,
}: PaidPlansAnnouncementEmailProps) {
  const greeting = contactPersonName
    ? `Hi ${contactPersonName},`
    : `Hi ${businessName} team,`;
  const courtesy = fmtDate(courtesyEndsAt);
  const foundingEnds = fmtDate(FOUNDING_PRICING_ENDS);
  const std = PRICING.standard;
  const prm = PRICING.premium;

  return {
    subject: `A heads-up about Mountain Connects pricing — and a founding-member rate for you`,
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
          <tr><td style="background:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
              <p style="margin:0 0 10px;font-size:44px;">🏔️</p>
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Thank you for being early</h1>
              <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">What's changing, and what isn't</p>
          </td></tr>
          <!-- Body -->
          <tr><td style="padding:36px 32px 8px;">
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">${greeting}</p>
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                You signed up to Mountain Connects while everything was free during our launch, and we want to say a genuine thank you — businesses like <strong style="color:#0a1e33;">${businessName}</strong> are the reason the platform exists.
              </p>
              <p style="margin:0 0 20px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                We promised we'd give you plenty of notice before introducing paid plans. This is that notice — and we've tried to make it as fair as we can.
              </p>

              <!-- What you keep -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                <tr><td style="padding:20px;background-color:#f0fdf4;border-radius:12px;border-left:4px solid #22c55e;">
                    <p style="margin:0 0 12px;color:#0a1e33;font-size:14px;font-weight:700;">Nothing changes for you until ${courtesy}</p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.6;">✅ &nbsp;You keep <strong>full Premium access</strong> — unlimited listings, featured placement, analytics — completely free until then.</td></tr>
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.6;">✅ &nbsp;<strong>None of your job listings will be removed.</strong> Ever.</td></tr>
                      <tr><td style="padding:4px 0;color:#4e5d6c;font-size:14px;line-height:1.6;">✅ &nbsp;After that date, <strong>your first job post stays free forever</strong> — no card, no catch. Applicant tracking and messaging included.</td></tr>
                    </table>
                </td></tr>
              </table>

              <p style="margin:0 0 20px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                If you want to keep posting more than one job after ${courtesy}, there'll be two plans — and because you were here early, you get our <strong style="color:#0a1e33;">founding-member rate, locked in for as long as you stay subscribed</strong>, even after prices go up for new businesses.
              </p>

              <!-- Founding pricing -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #fde68a;border-radius:12px;overflow:hidden;">
                <tr><td colspan="3" style="padding:12px 20px;background-color:#fffbeb;">
                    <p style="margin:0;color:#92400e;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">🏔️ Founding-member pricing · yours until ${foundingEnds}</p>
                </td></tr>
                <tr>
                  <td style="padding:16px 20px;border-top:1px solid #fde68a;vertical-align:top;width:50%;">
                    <p style="margin:0 0 4px;color:#0a1e33;font-size:15px;font-weight:700;">Standard</p>
                    <p style="margin:0 0 6px;color:#8899a6;font-size:12px;">Pubs, cafés, lodges · up to 5 active jobs</p>
                    <p style="margin:0;color:#0a1e33;font-size:14px;"><span style="color:#8899a6;text-decoration:line-through;">$${std.full.season}</span> <strong style="font-size:18px;">$${std.founding.season}</strong> <span style="color:#4e5d6c;">/ season pass</span></p>
                    <p style="margin:2px 0 0;color:#4e5d6c;font-size:12px;">or <span style="text-decoration:line-through;color:#8899a6;">$${std.full.month}</span> $${std.founding.month} / month</p>
                  </td>
                  <td style="padding:16px 20px;border-top:1px solid #fde68a;border-left:1px solid #fde68a;vertical-align:top;width:50%;">
                    <p style="margin:0 0 4px;color:#0a1e33;font-size:15px;font-weight:700;">Premium</p>
                    <p style="margin:0 0 6px;color:#8899a6;font-size:12px;">Hotels &amp; operators · unlimited jobs, featured placement</p>
                    <p style="margin:0;color:#0a1e33;font-size:14px;"><span style="color:#8899a6;text-decoration:line-through;">$${prm.full.season}</span> <strong style="font-size:18px;">$${prm.founding.season}</strong> <span style="color:#4e5d6c;">/ season pass</span></p>
                    <p style="margin:2px 0 0;color:#4e5d6c;font-size:12px;">or <span style="text-decoration:line-through;color:#8899a6;">$${prm.full.month}</span> $${prm.founding.month} / month</p>
                  </td>
                </tr>
                <tr><td colspan="3" style="padding:12px 20px;background-color:#fffbeb;border-top:1px solid #fde68a;">
                    <p style="margin:0;color:#4e5d6c;font-size:12px;line-height:1.5;">Prices in USD. Every plan starts with a <strong>30-day free trial</strong> — cancel anytime before it ends and you pay nothing. A season pass covers ${SEASON_PASS_TERM} from the day you subscribe.</p>
                </td></tr>
              </table>

              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                There's no rush and nothing you need to do today. You can pick a plan any time before ${courtesy} to carry straight on without interruption — or just keep using your free post. Either way, your rate is locked in as a founding member.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:0 auto 12px;" align="center">
                <tr><td style="background:linear-gradient(135deg,#0a1e33,#1a3a5c);border-radius:10px;padding:15px 36px;text-align:center;">
                    <a href="${plansUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">See the plans →</a>
                </td></tr>
              </table>
              <p style="margin:0 0 28px;text-align:center;color:#8899a6;font-size:12px;">or <a href="${dashboardUrl}" style="color:#3b9ede;text-decoration:none;">go to your dashboard</a></p>

              <p style="margin:0 0 6px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                If anything about this doesn't sit right, or the timing's tricky for your season, just reply to this email — it comes straight to me and I'd genuinely rather hear it than not.
              </p>
              <p style="margin:0 0 4px;color:#4e5d6c;font-size:15px;line-height:1.7;">Thanks again for backing us early.</p>
              <p style="margin:0 0 24px;color:#0a1e33;font-size:15px;line-height:1.7;"><strong>Tyler</strong><br/><span style="color:#8899a6;font-size:13px;">Founder, Mountain Connects</span></p>
          </td></tr>
          <!-- Footer -->
          <tr><td style="background-color:#f7f9fb;padding:24px 32px;text-align:center;border-top:1px solid #e8edf2;">
              <p style="margin:0 0 4px;color:#0a1e33;font-size:13px;font-weight:600;">Mountain Connects</p>
              <p style="margin:0;color:#8899a6;font-size:11px;line-height:1.5;">Connecting seasonal workers with mountain destinations worldwide.<br/>&copy; 2026 Mountain Connects. You're receiving this because you have a business account on Mountain Connects.</p>
          </td></tr>
        </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

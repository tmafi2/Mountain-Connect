/**
 * ITALIAN translation of first-applicant-nudge.ts — same structure, same HTML, same
 * variables, Italian copy.
 *
 * ⚠️ A TRANSLATION, NOT A REWRITE. If the English version changes, change
 * this one in the same commit: they are a pair, and a cadence that says one
 * thing in Canada and another in Italy is worse than an English-only one.
 *
 * ⚠️ The Outlook rules still apply — every gradient carries bgcolor plus
 * background-color at its darkest stop, no rgba outside box-shadow, no flex,
 * no grid, no style block. email-compat.test.ts scans this directory.
 *
 * ⚠️ The Italian here is serviceable, not native. It uses "voi" throughout
 * for businesses. Have a native speaker read it before it goes out.
 */
interface FirstApplicantNudgeItEmailProps {
  businessName: string;
  jobTitle: string;
  claimUrl: string;
}

export function firstApplicantNudgeItEmail({ businessName, jobTitle, claimUrl }: FirstApplicantNudgeItEmailProps) {
  return {
    subject: `Qualcuno è interessato al vostro annuncio per ${jobTitle}`,
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
          <td bgcolor="#0a1e33" style="background-color:#0a1e33;background-image:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
            <p style="margin:0 0 10px;font-size:44px;">👋</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">È arrivata la prima candidatura</h1>
            <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">${jobTitle}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 24px;">
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Buongiorno <strong style="color:#0a1e33;">${businessName}</strong>,
            </p>
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Qualcuno ha appena risposto al vostro annuncio per <strong>${jobTitle}</strong> su Mountain Connects ed è in attesa di una risposta.
            </p>
            <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Rivendicate il vostro profilo gratuito per vedere i suoi dati, contattarlo direttamente e gestire i colloqui da un unico posto.
            </p>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
              <tr>
                <td bgcolor="#3b82f6" style="background-color:#3b82f6;background-image:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:10px;padding:15px 36px;text-align:center;">
                  <a href="${claimUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Vedi i dati del candidato →</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;color:#8899a6;font-size:12px;text-align:center;">
              Oppure copiate questo link nel browser:<br/>
              <a href="${claimUrl}" style="color:#3b82f6;word-break:break-all;">${claimUrl}</a>
            </p>

            <p style="margin:24px 0 0;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Un saluto,<br/>
              <strong style="color:#0a1e33;">Tyler @ Mountain Connects</strong>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#f7f9fb;padding:24px 32px;text-align:center;border-top:1px solid #e8edf2;">
            <p style="margin:0 0 4px;color:#0a1e33;font-size:13px;font-weight:600;">Mountain Connects</p>
            <p style="margin:0;color:#8899a6;font-size:11px;line-height:1.5;">Mettiamo in contatto chi cerca lavoro stagionale con le località di montagna di tutto il mondo.<br/>&copy; 2026 Mountain Connects. Tutti i diritti riservati.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  };
}

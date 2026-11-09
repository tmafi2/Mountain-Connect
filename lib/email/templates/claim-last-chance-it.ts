/**
 * ITALIAN translation of claim-last-chance.ts — same structure, same HTML, same
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
 *
 * ⚠️ THIS VERSION NEVER NAMES THE ROLE, and that is a deliberate divergence
 * from the English original. `job_posts.title` is normalised to ENGLISH by the
 * extractor because it is matched against the English resort and town tables
 * (migration 00118), so an Italian advert for "cameriere di sala" is stored as
 * "Waiter/Waitress". Quoting that back inside an Italian sentence reads like a
 * machine that did not understand what they posted. The English version keeps
 * its title, because there it is the words the business actually used.
 *
 * ⚠️ VOICE IS "NOI", matching import-outreach-it.ts. Do not mix: the body
 * said "I saw your advert" while the removal line said "lo tolgo subito"
 * before this was made consistent.
 *
 * ⚠️ The Italian here is serviceable, not native. It uses "voi" throughout
 * for businesses. Have a native speaker read it before it goes out.
 */
interface ClaimLastChanceItEmailProps {
  businessName: string;
  eoiCount: number;
  takedownDate: string;
  claimUrl: string;
}

export function claimLastChanceItEmail({ businessName, eoiCount, takedownDate, claimUrl }: ClaimLastChanceItEmailProps) {
  const eoiLine = eoiCount > 0
    ? `${eoiCount === 1 ? "C’è" : "Ci sono"} <strong style="color:#0a1e33;">${eoiCount} ${eoiCount === 1 ? "persona" : "persone"}</strong> in attesa di una vostra risposta.`
    : `Chi cerca lavoro sta guardando il vostro annuncio proprio ora.`;

  return {
    subject: `Ultimo avviso: il vostro annuncio sta per essere rimosso`,
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
            <p style="margin:0 0 10px;font-size:44px;">⏰</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">Ultima occasione per rivendicare l’annuncio</h1>
            <p style="margin:0;color:#f59e0b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Azione richiesta</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 24px;">
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Gentile <strong style="color:#0a1e33;">${businessName}</strong>,
            </p>
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Il vostro annuncio è online su Mountain Connects da due settimane e non è ancora stato rivendicato. ${eoiLine}
            </p>

            <!-- Warning box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
              <tr>
                <td style="padding:18px 20px;background-color:#fef3c7;border-radius:12px;border-left:4px solid #f59e0b;">
                  <p style="margin:0 0 6px;color:#92400e;font-size:14px;font-weight:700;">L’annuncio sarà rimosso il ${takedownDate}</p>
                  <p style="margin:0;color:#78350f;font-size:13px;line-height:1.6;">
                    Se non rivendicate l’annuncio entro questa data verrà rimosso, e le candidature ricevute non saranno più recuperabili.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              La scheda è gratuita: rivendicarla richiede meno di un minuto e vi dà pieno controllo per modificare i dettagli, vedere i candidati interessati e gestire i colloqui.
            </p>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
              <tr>
                <td bgcolor="#3b82f6" style="background-color:#3b82f6;background-image:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:10px;padding:15px 36px;text-align:center;">
                  <a href="${claimUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Rivendica l’annuncio →</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;color:#8899a6;font-size:12px;text-align:center;">
              Oppure copiate questo link nel browser:<br/>
              <a href="${claimUrl}" style="color:#3b82f6;word-break:break-all;">${claimUrl}</a>
            </p>

            <p style="margin:0 0 16px;color:#4e5d6c;font-size:14px;line-height:1.7;">
              Se preferite che l’annuncio venga rimosso subito, è sufficiente rispondere a questa email.
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

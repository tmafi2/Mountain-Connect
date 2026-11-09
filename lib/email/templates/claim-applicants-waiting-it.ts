/**
 * ITALIAN translation of claim-applicants-waiting.ts — same structure, same HTML, same
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
interface ClaimApplicantsWaitingItEmailProps {
  businessName: string;
  /** Roles that have someone waiting, most-wanted first. */
  roles: Array<{ title: string; count: number }>;
  totalWaiting: number;
  claimUrl: string;
}

/**
 * "Someone is waiting to hear from you" — for unclaimed businesses that have
 * real expressions of interest against their listings.
 *
 * REPLACES the removal warnings for these businesses, and they are exempt
 * from takedown. Threatening to delete a listing that people are actively
 * applying to is backwards: it is the most valuable listing on the board,
 * and the demand attached to it is the strongest argument for claiming that
 * we will ever have.
 *
 * So this email has no deadline in it. It says who is waiting and for what.
 * On 4 September one job seeker expressed interest in six bar roles across
 * four businesses in a single session; every one of those businesses had
 * already ignored a generic "claim your listing" email. "Maria applied for
 * your Bartender role today" is a different message entirely.
 *
 * Counts, never names. The people who expressed interest did not consent to
 * having their names mailed to a business that has not claimed its account
 * and has no agreement with us — that is exactly the kind of detail a
 * business should see only after signing in.
 */
export function claimApplicantsWaitingItEmail({
  businessName,
  roles,
  totalWaiting,
  claimUrl,
}: ClaimApplicantsWaitingItEmailProps) {
  const many = totalWaiting > 1;

  // ⚠️ ONE TOTAL, NOT A BREAKDOWN BY ROLE. The English version lists each
  // role and its count, which is the better email — but roles[].title holds
  // job_posts.title, normalised to ENGLISH by the extractor (00118), so the
  // breakdown would read "Waiter/Waitress — 4 in attesa" to someone who wrote
  // their advert in Italian. Losing the breakdown costs less than that does.
  const rows = `
              <tr>
                <td style="padding:11px 0;border-bottom:1px solid #eef2f6;color:#0a1e33;font-size:15px;font-weight:600;">${roles.length > 1 ? `${roles.length} posizioni` : "La vostra posizione aperta"}</td>
                <td style="padding:11px 0;border-bottom:1px solid #eef2f6;text-align:right;color:#3b9ede;font-size:15px;font-weight:700;white-space:nowrap;">
                  ${totalWaiting} in attesa
                </td>
              </tr>`;

  return {
    subject: many
      ? `${totalWaiting} persone sono in attesa di una risposta da ${businessName}`
      : `Qualcuno ha risposto al vostro annuncio`,
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
          <td bgcolor="#0a1e33" style="background-color:#0a1e33;background-image:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
            <p style="margin:0 0 8px;font-size:52px;font-weight:800;color:#22d3ee;line-height:1;">${totalWaiting}</p>
            <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">
              ${many ? "people are waiting to hear from you" : "person is waiting to hear from you"}
            </h1>
            <p style="margin:0;color:#f59e0b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">Free to see who</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;color:#3d4f5f;font-size:16px;line-height:1.6;">Gentile ${businessName},</p>
            <p style="margin:0 0 22px;color:#3d4f5f;font-size:16px;line-height:1.6;">
              ${many ? "Alcune persone hanno" : "Qualcuno ha"} risposto a${roles.length > 1 ? "i vostri annunci" : "l vostro annuncio"}
              su Mountain Connects e ${many ? "sono" : "è"} in attesa. Non possiamo trasmettervi
              i loro dati finché la scheda non è vostra.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">${rows}</table>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
              <tr><td style="border-radius:10px;background-color:#3b9ede;">
                <a href="${claimUrl}" style="display:inline-block;padding:15px 36px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;">
                  Vedi chi ha risposto
                </a>
              </td></tr>
            </table>

            <p style="margin:0;color:#7d8b99;font-size:14px;line-height:1.6;text-align:center;">
              Rivendicare la scheda richiede circa un minuto e non costa nulla. L’annuncio resta
              online in ogni caso: non lo rimuoviamo finché le persone continuano a rispondere.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f7f9fb;padding:24px 32px;text-align:center;border-top:1px solid #eef2f6;">
            <p style="margin:0;color:#7d8b99;font-size:12px;line-height:1.6;">Mountain Connects — lavoro stagionale in montagna.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

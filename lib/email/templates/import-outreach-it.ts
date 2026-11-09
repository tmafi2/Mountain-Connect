/**
 * ITALIAN translation of import-outreach.ts — same structure, same HTML, same
 * variables, Italian copy.
 *
 * ⚠️ A TRANSLATION, NOT A REWRITE. If the English version changes, change
 * this one in the same commit: they are a pair, and a cadence that says one
 * thing in Canada and another in Italy is worse than an English-only one.
 *
 * ⚠️ WITH ONE DELIBERATE DIVERGENCE: THIS VERSION NEVER NAMES THE ROLE.
 * `job_posts.title` is normalised to ENGLISH by the extractor, because it is
 * matched against the English resort and town tables (migration 00118). So an
 * Italian advert for "cameriere di sala" is stored as "Waiter/Waitress", and
 * quoting it back inside an Italian sentence — "Il vostro annuncio per
 * Waiter/Waitress" — reads like a machine that did not understand what they
 * posted, which undercuts the "I saw your advert" opening more than any
 * wording choice could. The English version keeps the title because there it
 * is the words the business actually used.
 *
 * ⚠️ AND THE SUBJECT LEADS WITH THE APPLICANT COUNT WHERE THERE IS ONE. Of
 * the 27 Italian businesses this goes to, 7 have applications waiting and 20
 * do not; for those 7 the count is the strongest fact we hold and it belongs
 * in the subject, not three paragraphs down.
 *
 * ⚠️ The Outlook rules still apply — every gradient carries bgcolor plus
 * background-color at its darkest stop, no rgba outside box-shadow, no flex,
 * no grid, no style block. email-compat.test.ts scans this directory.
 *
 * ⚠️ `coverLetterExcerpt` IS NEVER THE RAW MESSAGE. It comes from
 * lib/email/cover-letter-excerpt.ts, which refuses rather than redacts: any
 * letter carrying an email address, a phone number, a link or the writer's
 * own name yields nothing at all. Of the 285 real cover letters on the board,
 * 66% pass and none of the passing excerpts contains an identifier. It is
 * someone else's personal data going to an address we scraped and have never
 * verified, so the bar is "could not possibly identify them", not "looks
 * fine".
 *
 * ⚠️ The Italian here is serviceable, not native. It uses "voi" throughout
 * for businesses. Have a native speaker read it before it goes out.
 */
interface ImportOutreachItEmailProps {
  businessName: string;
  source: string;
  claimUrl: string;
  eoiCount: number;
  /**
   * A sanitised opening from one applicant's cover letter, or undefined.
   * ALWAYS from lib/email/cover-letter-excerpt.ts — never raw `message`,
   * which carries an email address, a phone number or the writer's own name
   * in about one application in five.
   */
  coverLetterExcerpt?: string;
  /**
   * How many FURTHER listings we published for this business. We import one
   * listing per role, so publishing a business's queue can be a dozen jobs;
   * they get one email, and it has to describe what actually happened rather
   * than mention one listing and hide the rest.
   */
  otherListings?: number;
}

export function importOutreachItEmail({
  businessName,
  source,
  claimUrl,
  eoiCount,
  coverLetterExcerpt,
  otherListings = 0,
}: ImportOutreachItEmailProps) {
  const many = otherListings > 0;
  const listingCount = otherListings + 1;

  // NOTE ON "free". We publish every imported listing, so all of them are
  // genuinely live when this email goes out — but the free tier keeps ONE
  // live once the business claims, and they choose which (see the picker in
  // app/(public)/claim/[token]/ClaimForm.tsx). So the count and the word
  // "free" must never be joined: "13 free listings" is a promise the claim
  // page then takes back, which is the worst possible first impression.
  // Say how many exist, and say the claim is of a free listing, singular.

  const eoiLine = eoiCount > 0
    ? `${many ? "Sono già online e stanno" : "È già online e sta"} suscitando interesse tra chi cerca lavoro per la stagione.`
    : `${many ? "Sono già online e visibili ai candidati" : "È già online e visibile ai candidati"}.`;

  // ⚠️ THE COUNT APPEARS ONLY WHEN IT IS WORTH READING. "102 persone hanno
  // risposto" is the strongest subject line we can write; "2 persone hanno
  // risposto" tells a hotel that nobody wants the job. Same threshold the
  // nudge emails use, so a business never sees a number we would not put in
  // a subject line.
  const countWorthShowing = eoiCount >= 5;

  const subjectLine = countWorthShowing
    ? `${eoiCount} persone hanno risposto ${many ? "ai vostri annunci" : "al vostro annuncio"}`
    : eoiCount > 0
      ? `${many ? "I vostri annunci stanno" : "Il vostro annuncio sta"} suscitando interesse`
      : many
        ? `I vostri ${listingCount} annunci su Mountain Connects`
        : `Il vostro annuncio su Mountain Connects`;

  const headerLine = countWorthShowing
    ? `${eoiCount} CANDIDATURE`
    : eoiCount > 0
      ? "CANDIDATURE IN ARRIVO"
      : many
        ? `${listingCount} ANNUNCI`
        : "ANNUNCIO ATTIVO";

  const sawLine = many
    ? `Abbiamo notato i vostri annunci di lavoro`
    : `Abbiamo notato il vostro annuncio di lavoro`;

  return {
    subject: subjectLine,
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
          <tr>
            <td bgcolor="#0a1e33" style="background-color:#0a1e33;background-image:linear-gradient(135deg,#0a1e33 0%,#0f2942 40%,#1a3a5c 100%);padding:44px 32px 36px;text-align:center;">
              <p style="margin:0 0 10px;font-size:44px;">🏔️</p>
              <h1 style="margin:0 0 6px;color:#ffffff;font-size:26px;font-weight:800;">${many ? "I vostri annunci sono" : "Il vostro annuncio è"} online su Mountain Connects</h1>
              <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">${headerLine}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Gentile <strong style="color:#0a1e33;">${businessName}</strong>,
              </p>
              <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Vi scriviamo da Mountain Connects, una piattaforma nata per mettere in contatto le attività delle località sciistiche con chi cerca lavoro stagionale. ${sawLine} e abbiamo pensato che il nostro servizio potesse esservi utile.
              </p>
              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Per iniziare, abbiamo creato ${many ? `${listingCount} schede dedicate alla vostra struttura` : "una scheda dedicata alla vostra struttura"}. ${eoiLine} Potete rivendicare la vostra scheda gratuita tramite il link qui sotto per modificare i dettagli, visualizzare i profili interessati e gestire i colloqui da un’unica piattaforma.
              </p>

              ${coverLetterExcerpt ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 26px;">
                <tr>
                  <td bgcolor="#f5f8fb" style="background-color:#f5f8fb;border-left:3px solid #2577ad;padding:16px 18px;">
                    <p style="margin:0 0 8px;color:#8899a6;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;">Da una delle candidature</p>
                    <p style="margin:0;color:#3d4f5f;font-size:14px;line-height:1.65;font-style:italic;">&ldquo;${coverLetterExcerpt}&rdquo;</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Per leggere la candidatura completa e vedere chi l&rsquo;ha scritta, potete rivendicare la vostra scheda qui sotto.
              </p>` : ""}

              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
                <tr>
                  <td bgcolor="#3b82f6" style="background-color:#3b82f6;background-image:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:10px;padding:15px 36px;text-align:center;">
                    <a href="${claimUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">Rivendica la scheda gratuita →</a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px;color:#8899a6;font-size:12px;text-align:center;">
                Oppure copiate questo link nel browser:<br/>
                <a href="${claimUrl}" style="color:#3b82f6;word-break:break-all;">${claimUrl}</a>
              </p>

              <p style="margin:0 0 16px;color:#4e5d6c;font-size:14px;line-height:1.7;">
                Se preferite che ${many ? "gli annunci vengano rimossi" : "l’annuncio venga rimosso"}, è sufficiente rispondere a questa email e ${many ? "li rimuoveremo" : "lo rimuoveremo"} subito.
              </p>

              <p style="margin:24px 0 0;color:#4e5d6c;font-size:15px;line-height:1.7;">
                Un saluto,<br/>
                <strong style="color:#0a1e33;">Tyler @ Mountain Connects</strong>
              </p>
            </td>
          </tr>
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

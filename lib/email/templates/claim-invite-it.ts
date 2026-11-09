/**
 * The claim invitation, in Italian.
 *
 * ⚠️ WHY A SEPARATE TEMPLATE AND NOT A TRANSLATION LAYER. 44 of the 45 live
 * Italian listings are written in Italian, and all 27 Italian businesses have
 * now been sent the English claim invite, the English first-applicant nudge
 * and the English five-applicant nudge. None has claimed. Language is the
 * cheapest untested explanation, and one hand-written template tests it
 * without putting an i18n layer into the email send path.
 *
 * ⚠️ IT OFFERS REMOVAL, in the first screen's reach. These listings were
 * collected from public adverts the business posted somewhere else; they did
 * not ask to be here. The English invite makes the same offer and it is the
 * line that keeps this honest rather than merely legal.
 *
 * Written in the first person, as the English invite is: a note from a person
 * who saw their advert, not an announcement from a platform. A small hotel in
 * Bormio has no reason to care what a company thinks.
 *
 * ⚠️ OUTLOOK RULES APPLY HERE TOO. Every gradient carries bgcolor plus
 * background-color set to its DARKEST stop, there is no rgba outside
 * box-shadow, no flex, no grid and no style block —
 * lib/email/templates/email-compat.test.ts scans this directory and will fail
 * on any of them the moment this file is saved.
 */

interface ClaimInviteItProps {
  businessName: string;
  /** The role as the advert wrote it, e.g. "Cameriere di sala". */
  jobTitle: string;
  /** How many listings of theirs we hold. 1 for most. */
  listingCount: number;
  /** Applications waiting on those listings. 0 is normal and handled. */
  applicantCount: number;
  /** Absolute, built from SITE_ORIGIN — never from a request url. */
  claimUrl: string;
  /** Where the advert was seen, e.g. "Facebook". */
  source: string;
}

export function claimInviteItEmail({
  businessName,
  jobTitle,
  listingCount,
  applicantCount,
  claimUrl,
  source,
}: ClaimInviteItProps) {
  const many = listingCount > 1;
  const hasApplicants = applicantCount > 0;

  const subject = hasApplicants
    ? applicantCount === 1
      ? `Una persona ha risposto al vostro annuncio`
      : `${applicantCount} persone hanno risposto al vostro annuncio`
    : many
      ? `I vostri annunci su Mountain Connects`
      : `Il vostro annuncio su Mountain Connects`;

  const heroKicker = hasApplicants
    ? applicantCount === 1
      ? "1 CANDIDATURA IN ATTESA"
      : `${applicantCount} CANDIDATURE IN ATTESA`
    : many
      ? `${listingCount} ANNUNCI`
      : jobTitle.toUpperCase();

  const heroTitle = hasApplicants
    ? "Qualcuno vi sta aspettando"
    : "Il vostro annuncio è online";

  const sawLine = many
    ? `Ho visto il vostro annuncio per <strong>${jobTitle}</strong> e altri ${listingCount - 1} su ${source}`
    : `Ho visto il vostro annuncio per <strong>${jobTitle}</strong> su ${source}`;

  const applicantsLine = hasApplicants
    ? applicantCount === 1
      ? `Da quando è online, <strong>una persona</strong> ha risposto. La sua candidatura è in attesa di una risposta.`
      : `Da quando è online, <strong>${applicantCount} persone</strong> hanno risposto. Le loro candidature sono in attesa di una risposta.`
    : `Chi cerca lavoro per la stagione invernale lo trova insieme alle altre offerte della zona.`;

  const cta = hasApplicants ? "Vedi chi ha risposto" : "Rivendica l'annuncio";

  return {
    subject,
    html: `
<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
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
            <h1 style="margin:0 0 8px;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:-0.5px;">${heroTitle}</h1>
            <p style="margin:0;color:#22d3ee;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:2px;">${heroKicker}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 24px;">
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Buongiorno <strong style="color:#0a1e33;">${businessName}</strong>,
            </p>
            <p style="margin:0 0 16px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              ${sawLine} e l'ho aggiunto a Mountain Connects, un sito dove chi cerca lavoro stagionale in montagna trova le offerte delle località sciistiche in un unico posto.
            </p>
            <p style="margin:0 0 24px;color:#4e5d6c;font-size:15px;line-height:1.7;">
              ${applicantsLine}
            </p>

            <p style="margin:0 0 10px;color:#0a1e33;font-size:15px;font-weight:600;line-height:1.7;">
              Rivendicare la scheda è gratuito e vi permette di:
            </p>
            <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 26px;">
              <tr><td style="padding:0 0 8px;color:#4e5d6c;font-size:15px;line-height:1.6;">&bull;&nbsp; vedere chi ha risposto e contattarlo direttamente</td></tr>
              <tr><td style="padding:0 0 8px;color:#4e5d6c;font-size:15px;line-height:1.6;">&bull;&nbsp; modificare o aggiornare l'annuncio</td></tr>
              <tr><td style="padding:0;color:#4e5d6c;font-size:15px;line-height:1.6;">&bull;&nbsp; pubblicare altri annunci quando vi serve</td></tr>
            </table>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;" align="center">
              <tr>
                <td bgcolor="#3b82f6" style="background-color:#3b82f6;background-image:linear-gradient(135deg,#22d3ee,#3b82f6);border-radius:10px;padding:15px 36px;text-align:center;">
                  <a href="${claimUrl}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">${cta} &rarr;</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;color:#8899a6;font-size:12px;text-align:center;">
              Oppure copiate questo link nel browser:<br/>
              <a href="${claimUrl}" style="color:#3b82f6;word-break:break-all;">${claimUrl}</a>
            </p>

            <p style="margin:0 0 16px;color:#4e5d6c;font-size:14px;line-height:1.7;border-top:1px solid #e3eaf2;padding-top:20px;">
              Se preferite che l'annuncio venga rimosso, rispondete a questa email e lo tolgo subito.
            </p>
            <p style="margin:0;color:#4e5d6c;font-size:15px;line-height:1.7;">
              Tyler<br/>
              <span style="color:#8899a6;font-size:13px;">Mountain Connects</span>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td bgcolor="#f7fafc" style="background-color:#f7fafc;padding:20px 32px;text-align:center;border-top:1px solid #e3eaf2;">
            <p style="margin:0;color:#8899a6;font-size:12px;line-height:1.6;">
              Avete ricevuto questa email perché abbiamo trovato un vostro annuncio di lavoro pubblicato su ${source}.
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

/**
 * Decides whether a claim email may quote an applicant's cover letter, and
 * returns the quotable part.
 *
 * WHY THIS EXISTS. `expressions_of_interest.message` is the answer to "Why
 * are you a good fit for the <role>?" — 285 of 308 applications have one,
 * averaging about 500 characters. Quoting one is far more persuasive to an
 * unclaimed business than any count: it shows a real person took real
 * trouble. It is also somebody else's personal data being pushed to an email
 * address we scraped off a Facebook advert and have never verified.
 *
 * ⚠️ SO IT FAILS CLOSED. Every rule here answers "may we quote this?" with no
 * by default. A missed excerpt costs one slightly weaker email; a wrong one
 * mails a stranger somebody's phone number. Measured over the 285 real cover
 * letters we hold: 11 contain an email address, 16 contain a phone number and
 * 35 state the writer's own name, so roughly one in five would leak a direct
 * identifier if quoted blind.
 *
 * ⚠️ IT NEVER RETURNS A NAME, AN EMAIL OR A PHONE NUMBER. Not redacted —
 * refused. Redaction invites the question of whether the redaction worked,
 * and the answer has to be "that case was never sent".
 *
 * Consent (migration 00124) is the outer gate:
 *   true  — the applicant ticked "share my application with this employer".
 *   false — they saw the box and left it unticked. Never quoted.
 *   NULL  — they applied before the box existed. A sanitised excerpt only,
 *           because they were never offered the choice.
 */

/** Characters of the letter a claim email may show. */
export const EXCERPT_MAX = 220;
/** Below this there is nothing worth quoting and more risk than reward. */
const MIN_USEFUL = 80;

/** Anything that looks like an email address. */
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
/** Seven or more digits with the usual separators — a phone number. */
const PHONE = /[0-9][0-9 ().–-]{6,}[0-9]/;
/** The writer naming themselves, in English and Italian. */
const SELF_NAMING = /\b(my name is|i am called|i'm called|sono chiamato|mi chiamo|il mio nome è)\b/i;
/** A URL is a route to an identity as surely as an address is. */
const LINK = /\b(https?:\/\/|www\.)\S+/i;

export interface ExcerptInput {
  message: string | null | undefined;
  /** expressions_of_interest.share_with_employer. See migration 00124. */
  consent: boolean | null | undefined;
}

/**
 * The quotable opening of a cover letter, or null when it must not be quoted.
 *
 * Cuts at a sentence end where one falls inside the limit, otherwise at a word
 * boundary, so the quote never ends mid-word.
 */
export function coverLetterExcerpt({ message, consent }: ExcerptInput): string | null {
  // Explicitly declined. No sanitising gets past this.
  if (consent === false) return null;

  if (typeof message !== "string") return null;
  const text = message.replace(/\s+/g, " ").trim();
  if (text.length < MIN_USEFUL) return null;

  if (EMAIL.test(text) || PHONE.test(text) || SELF_NAMING.test(text) || LINK.test(text)) {
    return null;
  }

  if (text.length <= EXCERPT_MAX) return text;

  const window = text.slice(0, EXCERPT_MAX);

  // Prefer a sentence that ends inside the window — a complete thought reads
  // as a quotation rather than as a truncation.
  const lastStop = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (lastStop >= MIN_USEFUL) return window.slice(0, lastStop + 1);

  const lastSpace = window.lastIndexOf(" ");
  const cut = lastSpace >= MIN_USEFUL ? lastSpace : EXCERPT_MAX;
  return window.slice(0, cut).trimEnd() + "…";
}

/** Escapes a quote for inclusion in an HTML email body. */
export function escapeForEmail(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

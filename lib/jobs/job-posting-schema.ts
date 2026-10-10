/**
 * The bits of JobPosting structured data that are easy to get subtly wrong,
 * kept here so they are testable. The page assembles the object; these decide
 * the values that have a right and a wrong answer.
 */

/**
 * ISO 3166-1 alpha-2 for every country the resort data uses. Google accepts a
 * country name, but the code is unambiguous — "Georgia" is a country here and
 * a US state elsewhere, which is exactly the kind of thing a name gets wrong.
 *
 * ⚠️ Keyed on `resorts.country` EXACTLY as that column spells it, including
 * "USA" rather than "United States". An unknown country returns null and the
 * caller falls back to the name rather than inventing a code.
 */
const ISO_COUNTRY: Record<string, string> = {
  Andorra: "AD",
  Argentina: "AR",
  Australia: "AU",
  Austria: "AT",
  Canada: "CA",
  Chile: "CL",
  France: "FR",
  Georgia: "GE",
  Italy: "IT",
  Japan: "JP",
  "New Zealand": "NZ",
  Sweden: "SE",
  Switzerland: "CH",
  USA: "US",
  "United States": "US",
};

export function isoCountry(country: string | null | undefined): string | null {
  if (!country) return null;
  return ISO_COUNTRY[country.trim()] ?? null;
}

/**
 * schema.org employmentType.
 *
 * ⚠️ TEMPORARY IS ADDED TO EVERY ROLE, and that is a claim about the platform
 * rather than about the row: this is a seasonal ski-work board, every listing
 * is a winter or summer season position, and the whole import pipeline reads
 * from seasonal hiring groups. If general year-round vacancies are ever
 * accepted, this needs a real field rather than an assumption.
 *
 * Casual maps to PART_TIME: schema.org has no "casual", and PART_TIME is the
 * closest honest fit — TEMPORARY alone would lose the hours signal, which it
 * keeps anyway from the pairing.
 */
export function employmentTypes(positionType: string | null | undefined): string[] {
  const base =
    positionType === "full_time" ? "FULL_TIME" :
    positionType === "part_time" ? "PART_TIME" :
    positionType === "casual" ? "PART_TIME" :
    null;
  return base ? [base, "TEMPORARY"] : ["TEMPORARY"];
}

/**
 * Whether the application can be completed on Mountain Connects without the
 * applicant being sent elsewhere.
 *
 * ⚠️ THIS USED TO BE INVERTED. It read
 * `Boolean(application_email || application_url)` — true exactly when the
 * listing pushes people OFF the site — and since all 341 active listings carry
 * an application_email, `directApply: true` was emitted on every one of them.
 *
 * The honest picture is genuinely mixed: JobApplyButton renders
 * unconditionally and posts to /api/jobs/[id]/express-interest, so every
 * listing DOES host a working application. But a listing that also prints a
 * mailto link is visibly telling people to email instead, and Google treats
 * directApply as a promise that the user will not be redirected. So the
 * presence of an external route means the flag is omitted rather than
 * asserted — a missing directApply costs nothing, a wrong one is a penalty.
 */
export function directApply(job: {
  application_email?: string | null;
  application_url?: string | null;
}): true | undefined {
  const hasExternalRoute = Boolean(job.application_email?.trim() || job.application_url?.trim());
  return hasExternalRoute ? undefined : true;
}

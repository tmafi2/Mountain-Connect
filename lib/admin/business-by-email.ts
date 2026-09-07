import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Find the business an imported listing belongs to, by email.
 *
 * WHY THIS EXISTS. Both import routes used to do this:
 *
 *     .eq("email", businessEmail).maybeSingle()
 *
 * and destructure only `{ data }`. PostgREST answers `maybeSingle()` with
 * error PGRST116 when MORE THAN ONE row matches — data comes back null and
 * the error, being discarded, took the caller down its "no such business"
 * branch and inserted a fresh duplicate.
 *
 * That turned one duplicate into a runaway. Migration 00095 merged three Odin
 * Living records and fixed a misspelled `recuritment@` address; correcting the
 * typo gave the renamed leftover row the SAME email as the real record. From
 * that moment the lookup could never match again, and every nightly scrape
 * inserted another Odin row: 2 rows on 31 Aug, 6 by 4 Sep, 11 by 7 Sep. Each
 * new row makes the match fail harder, so it cannot recover on its own.
 *
 * TWO RULES, AND THE SECOND MATTERS MORE THAN THE FIRST.
 *
 *   1. Several rows may share an email. That is a fact about the data, not an
 *      error — a hotel group can run two businesses off one domain — so the
 *      query asks for a list and picks from it deterministically.
 *
 *   2. A FAILED LOOKUP MUST NOT LOOK LIKE "no business found". The old code's
 *      real defect was not the cardinality, it was treating an error as an
 *      absence. Callers get `error` set and must abort: refusing to import a
 *      listing is recoverable on the next run, while inserting a duplicate
 *      business is the mess this module exists to stop.
 */

export interface BusinessMatch {
  id: string;
  business_name: string | null;
  is_claimed: boolean;
  claim_token: string | null;
  nearby_town_id: string | null;
  created_at: string;
}

/** Columns every caller needs; a superset is cheaper than two near-identical queries. */
const COLUMNS = "id, business_name, is_claimed, claim_token, nearby_town_id, created_at";

/**
 * Case, punctuation and spacing carry no meaning in a scraped business name —
 * "Mūsu Bar & Bistro" and "Musu Bar and Bistro" are the same pub. Deliberately
 * looser than an equality check and deliberately tighter than fuzzy matching:
 * a near-miss here silently merges two real businesses.
 */
function normaliseName(name: string | null | undefined): string {
  return (name ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\band\b/g, "&")
    .replace(/[^a-z0-9&]+/g, "")
    .trim();
}

/**
 * Which of several rows sharing an email is THE business.
 *
 * ONE EMAIL CAN COVER SEVERAL REAL BUSINESSES. Odin Living's recruitment
 * address advertises Odin Living, Mūsu Bar & Bistro and The Barn by Odin —
 * three establishments a job seeker would rightly see as separate. So when the
 * incoming post names a business that exactly matches one of the rows, that
 * row wins: a Mūsu advert belongs to Mūsu, not to whichever record happens to
 * be oldest.
 *
 * When no name matches — a new venue, or a variant like "Odin Living / Odin
 * Hills" — fall back to the canonical row rather than inserting. Attaching a
 * listing to a slightly-wrong sibling is a cosmetic error somebody can fix;
 * inserting is what produced eleven Odin records.
 *
 * The canonical row is the claimed one if any row is claimed — a real account
 * with a real owner, where a listing will actually be seen — otherwise the
 * oldest shell, which is the row holding the listings, EOIs, claim token and
 * outreach history the business will be invited to claim.
 *
 * Pure, so every one of these rules is testable without a database.
 */
export function pickCanonicalBusiness(
  matches: readonly BusinessMatch[],
  incomingName?: string | null,
): BusinessMatch | null {
  if (matches.length === 0) return null;
  const oldestFirst = [...matches].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const wanted = normaliseName(incomingName);
  if (wanted) {
    const byName = oldestFirst.filter((m) => normaliseName(m.business_name) === wanted);
    if (byName.length > 0) return byName.find((m) => m.is_claimed) ?? byName[0];
  }

  return oldestFirst.find((m) => m.is_claimed) ?? oldestFirst[0];
}

export interface BusinessLookup {
  /** The business to attach to, or null when this email is genuinely new. */
  match: BusinessMatch | null;
  /** How many rows share this email. >1 means the data needs merging. */
  count: number;
  /**
   * Set when the lookup could not be completed. `match` is meaningless when
   * this is set — callers must abort rather than treat it as "not found".
   */
  error: string | null;
}

/**
 * `incomingName` is the business name on the listing being imported. Pass it
 * whenever it is known: without it a Mūsu advert lands on Odin Living, since
 * the fallback can only choose by age.
 */
export async function findBusinessByEmail(
  admin: SupabaseClient,
  email: string,
  incomingName?: string | null,
): Promise<BusinessLookup> {
  const { data, error } = await admin
    .from("business_profiles")
    .select(COLUMNS)
    .eq("email", email);

  if (error) {
    return { match: null, count: 0, error: error.message };
  }

  const matches = (data ?? []) as unknown as BusinessMatch[];
  return {
    match: pickCanonicalBusiness(matches, incomingName),
    count: matches.length,
    error: null,
  };
}

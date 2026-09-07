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
  is_claimed: boolean;
  claim_token: string | null;
  nearby_town_id: string | null;
  created_at: string;
}

/** Columns every caller needs; a superset is cheaper than two near-identical queries. */
const COLUMNS = "id, is_claimed, claim_token, nearby_town_id, created_at";

/**
 * Which of several rows sharing an email is THE business.
 *
 * A claimed row wins outright: it is a real account with a real owner behind
 * it, and attaching a scraped listing to the shell next to it would hide that
 * listing from the person who can actually answer it. Otherwise the oldest
 * shell wins — it is the one that has been accumulating listings, EOIs, a
 * claim token and outreach history, so it is the row the business will be
 * invited to claim.
 *
 * Pure, so the tie-breaking is testable without a database.
 */
export function pickCanonicalBusiness(matches: readonly BusinessMatch[]): BusinessMatch | null {
  if (matches.length === 0) return null;
  const oldestFirst = [...matches].sort((a, b) => a.created_at.localeCompare(b.created_at));
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

export async function findBusinessByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<BusinessLookup> {
  const { data, error } = await admin
    .from("business_profiles")
    .select(COLUMNS)
    .eq("email", email);

  if (error) {
    return { match: null, count: 0, error: error.message };
  }

  const matches = (data ?? []) as unknown as BusinessMatch[];
  return { match: pickCanonicalBusiness(matches), count: matches.length, error: null };
}

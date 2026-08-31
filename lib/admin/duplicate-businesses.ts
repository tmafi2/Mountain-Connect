/**
 * Spot businesses that are probably the same company.
 *
 * The importer finds-or-creates a business by EXACT email match, which is
 * the right default and cannot see past a different address. Odin Living
 * arrived as three records — recruitment@, hrmanager@ and a misspelled
 * recuritment@ — and each was emailed separately before anyone noticed. Four
 * near-identical emails in three days from a company they had never dealt
 * with is the fastest way to lose them.
 *
 * This does not merge anything. Deciding that two records are one company is
 * a judgement call — a hotel group really can run two businesses off one
 * domain — so the job here is to put the question in front of somebody at
 * the moment they are about to approve a listing and start the emails.
 *
 * Three signals, each of which alone caught the Odin case or would have:
 *
 *   domain   same non-free email domain
 *   name     same name once punctuation and case are stripped
 *   typo     email within one or two edits of another
 *
 * Free providers are excluded from the domain signal or every gmail address
 * on the board becomes one enormous cluster — which is exactly what a first
 * naive version did, flagging seven unrelated businesses as duplicates.
 */

export const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.co.uk", "outlook.com",
  "live.com", "yahoo.com", "yahoo.co.jp", "yahoo.co.uk", "icloud.com", "me.com",
  "aol.com", "protonmail.com", "proton.me", "gmx.com", "mail.com", "yandex.com",
  "bigpond.com", "optusnet.com.au", "docomo.ne.jp",
]);

export interface BizRecord {
  id: string;
  business_name: string | null;
  email: string | null;
}

export type DuplicateReason = "domain" | "name" | "typo";

export interface DuplicateLink {
  /** The other record we think this one might be. */
  id: string;
  business_name: string | null;
  email: string | null;
  reason: DuplicateReason;
}

/** Punctuation- and case-insensitive name key. "Odin Living / Odin Hills" → "odinlivingodinhills" */
export function nameKey(name: string | null | undefined): string {
  return (name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function emailDomain(email: string | null | undefined): string | null {
  const at = (email ?? "").lastIndexOf("@");
  if (at < 0) return null;
  const d = email!.slice(at + 1).toLowerCase().trim();
  return d || null;
}

/**
 * Levenshtein, capped. Bails out as soon as the distance exceeds `max`,
 * which keeps this cheap across a few hundred addresses — the full matrix
 * on every pair would not be.
 */
export function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (curr[j] < best) best = curr[j];
    }
    if (best > max) return max + 1;
    prev = curr;
  }
  return prev[b.length];
}

/**
 * For each record, the other records that might be the same company.
 *
 * Returns a map keyed by business id. A record with no suspected twin is
 * absent from the map rather than present with an empty list, so the caller
 * can treat presence as "worth a look".
 */
export function findDuplicateBusinesses(records: BizRecord[]): Map<string, DuplicateLink[]> {
  const out = new Map<string, DuplicateLink[]>();

  const link = (a: BizRecord, b: BizRecord, reason: DuplicateReason) => {
    const list = out.get(a.id) ?? [];
    // First reason wins: domain and name are stronger evidence than a typo,
    // and they are tested in that order.
    if (list.some((l) => l.id === b.id)) return;
    list.push({ id: b.id, business_name: b.business_name, email: b.email, reason });
    out.set(a.id, list);
  };

  // ── domain ──
  const byDomain = new Map<string, BizRecord[]>();
  for (const r of records) {
    const d = emailDomain(r.email);
    if (!d || FREE_EMAIL_DOMAINS.has(d)) continue;
    byDomain.set(d, [...(byDomain.get(d) ?? []), r]);
  }
  for (const group of byDomain.values()) {
    if (group.length < 2) continue;
    for (const a of group) for (const b of group) if (a.id !== b.id) link(a, b, "domain");
  }

  // ── name ──
  const byName = new Map<string, BizRecord[]>();
  for (const r of records) {
    const k = nameKey(r.business_name);
    if (k.length < 4) continue; // too short to mean anything
    byName.set(k, [...(byName.get(k) ?? []), r]);
  }
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    for (const a of group) for (const b of group) if (a.id !== b.id) link(a, b, "name");
  }

  // ── typo ──
  // Catches recuritment@ vs recruitment@, which shares a domain and so is
  // already caught above — but also catches the same slip across two
  // different domains, where nothing else would.
  const withEmail = records.filter((r) => !!r.email);
  for (let i = 0; i < withEmail.length; i++) {
    for (let j = i + 1; j < withEmail.length; j++) {
      const a = withEmail[i], b = withEmail[j];
      if (a.email === b.email) continue;
      if (editDistance(a.email!.toLowerCase(), b.email!.toLowerCase(), 2) <= 2) {
        link(a, b, "typo");
        link(b, a, "typo");
      }
    }
  }

  return out;
}

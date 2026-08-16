/**
 * Work eligibility — the single source of truth for how a worker's right to
 * work in a country is modelled, labelled, and matched against a job.
 *
 * Design principle: we capture STATUS ("eligible in Canada on an IEC Working
 * Holiday until Apr 2027"), never DOCUMENTS (visa numbers, passport numbers,
 * scans). Verifying right-to-work is the employer's legal obligation at hire
 * time in every market we operate in; a job board only needs enough to
 * shortlist honestly, and holding identity documents is pure risk.
 *
 * Storage: worker_profiles.work_authorizations JSONB, one entry per country:
 *   { country, visa_status, visa_expiry, program? }
 * `country` is a display name ("Canada", "United States"); resorts use "USA",
 * so always match through normalizeCountry().
 */

export type VisaStatus =
  | "citizen"
  | "permanent_resident"
  | "working_holiday"
  | "work_visa"
  | "student_visa"
  | "no_visa"
  | "other";

export interface WorkAuthorization {
  country: string;
  visa_status: VisaStatus | "";
  /** ISO date, "n/a" (no expiry — citizens/PR), or "" (unset). */
  visa_expiry: string;
  /** Specific programme within the status, e.g. "iec_working_holiday", "j1".
   *  Optional; only meaningful for visa-based statuses. */
  program?: string;
}

export const VISA_STATUS_LABELS: Record<VisaStatus, string> = {
  citizen: "Citizen",
  permanent_resident: "Permanent Resident",
  working_holiday: "Working Holiday Visa",
  work_visa: "Work Visa",
  student_visa: "Student Visa",
  no_visa: "No visa yet",
  other: "Other",
};

export const VISA_OPTIONS: { value: VisaStatus; label: string }[] = (
  Object.keys(VISA_STATUS_LABELS) as VisaStatus[]
).map((value) => ({ value, label: VISA_STATUS_LABELS[value] }));

/** Statuses that mean "can work now" (vs needs sponsorship / not eligible). */
export const ELIGIBLE_STATUSES: ReadonlySet<VisaStatus> = new Set([
  "citizen",
  "permanent_resident",
  "working_holiday",
  "work_visa",
  "student_visa",
]);

/* ─── Country normalisation ─────────────────────────────────────
 * Worker profiles store display names from a 62-country picker; resort data
 * uses "USA". Canonicalise both sides before comparing.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "United States",
  us: "United States",
  "united states of america": "United States",
  america: "United States",
  uk: "United Kingdom",
  "great britain": "United Kingdom",
  britain: "United Kingdom",
  nz: "New Zealand",
  aus: "Australia",
};

export function normalizeCountry(name: string | null | undefined): string {
  if (!name) return "";
  const t = name.trim();
  const alias = COUNTRY_ALIASES[t.toLowerCase()];
  return alias ?? t;
}

export function sameCountry(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeCountry(a).toLowerCase();
  const nb = normalizeCountry(b).toLowerCase();
  return !!na && na === nb;
}

/* ─── Visa programmes per country ───────────────────────────────
 * The specific route a worker is on. Shown as an optional refinement once
 * they pick a status; lets a Canadian employer see "IEC" and a US one "J-1"
 * instead of a flat "Working Holiday". Keyed by canonical country name.
 * Each programme lists which statuses it applies to so the picker only
 * offers relevant ones.
 */
export interface VisaProgram {
  value: string;
  label: string;
  /** Which visa_status values this programme is a refinement of. */
  statuses: VisaStatus[];
}

export const VISA_PROGRAMS: Record<string, VisaProgram[]> = {
  Australia: [
    { value: "whv_417", label: "Working Holiday visa (subclass 417)", statuses: ["working_holiday"] },
    { value: "whv_462", label: "Work and Holiday visa (subclass 462)", statuses: ["working_holiday"] },
    { value: "student_500", label: "Student visa (subclass 500)", statuses: ["student_visa"] },
    { value: "tss_482", label: "Skills in Demand / TSS (subclass 482)", statuses: ["work_visa"] },
    { value: "graduate_485", label: "Temporary Graduate (subclass 485)", statuses: ["work_visa"] },
    { value: "nz_444", label: "NZ citizen — Special Category (subclass 444)", statuses: ["work_visa", "other"] },
  ],
  Canada: [
    { value: "iec_working_holiday", label: "IEC — Working Holiday", statuses: ["working_holiday"] },
    { value: "iec_young_professionals", label: "IEC — Young Professionals", statuses: ["work_visa", "working_holiday"] },
    { value: "iec_coop", label: "IEC — International Co-op", statuses: ["work_visa", "student_visa"] },
    { value: "study_permit", label: "Study permit (with work hours)", statuses: ["student_visa"] },
    { value: "pgwp", label: "Post-Graduation Work Permit", statuses: ["work_visa"] },
    { value: "lmia_work_permit", label: "Employer-specific work permit (LMIA)", statuses: ["work_visa"] },
    { value: "open_work_permit", label: "Open work permit (other)", statuses: ["work_visa"] },
  ],
  "United States": [
    { value: "j1_swt", label: "J-1 — Summer Work Travel", statuses: ["working_holiday", "work_visa"] },
    { value: "j1_intern_trainee", label: "J-1 — Intern / Trainee", statuses: ["work_visa", "working_holiday"] },
    { value: "h2b", label: "H-2B — Seasonal worker", statuses: ["work_visa"] },
    { value: "f1_opt_cpt", label: "F-1 student (OPT / CPT)", statuses: ["student_visa"] },
    { value: "other_work_auth", label: "Other work authorisation (EAD, TN, etc.)", statuses: ["work_visa", "other"] },
  ],
  Japan: [
    { value: "jp_working_holiday", label: "Working Holiday visa", statuses: ["working_holiday"] },
    { value: "designated_activities", label: "Designated Activities visa", statuses: ["work_visa", "other"] },
    { value: "student_permission", label: "Student visa with work permission (28h/wk)", statuses: ["student_visa"] },
    { value: "ssw", label: "Specified Skilled Worker", statuses: ["work_visa"] },
    { value: "instructor_engineer_humanities", label: "Engineer / Specialist in Humanities / Instructor", statuses: ["work_visa"] },
  ],
  "New Zealand": [
    { value: "nz_whv", label: "Working Holiday visa", statuses: ["working_holiday"] },
    { value: "nz_aewv", label: "Accredited Employer Work Visa", statuses: ["work_visa"] },
    { value: "nz_student", label: "Student visa (with work rights)", statuses: ["student_visa"] },
  ],
};

/** Programmes offered for a given country + status. Empty if none apply. */
export function programsFor(country: string, status: VisaStatus | ""): VisaProgram[] {
  if (!status || status === "citizen" || status === "permanent_resident" || status === "no_visa") return [];
  const list = VISA_PROGRAMS[normalizeCountry(country)] ?? [];
  return list.filter((p) => p.statuses.includes(status));
}

export function programLabel(country: string, program: string | undefined | null): string | null {
  if (!program) return null;
  const list = VISA_PROGRAMS[normalizeCountry(country)] ?? [];
  return list.find((p) => p.value === program)?.label ?? null;
}

/* ─── Resolution: what does this worker have for THIS country? ──── */

export type EligibilityKind =
  | "eligible"          // citizen/PR/valid visa
  | "expired"           // had a visa but expiry is in the past
  | "needs_sponsorship" // explicitly no_visa
  | "unknown";          // nothing listed for this country

export interface ResolvedEligibility {
  kind: EligibilityKind;
  country: string;
  auth: WorkAuthorization | null;
  /** Human line, e.g. "Working Holiday Visa (IEC — Working Holiday) · until Apr 2027" */
  summary: string;
  /** Shorter badge text, e.g. "Eligible", "Expired", "Needs sponsorship", "Not listed" */
  badge: string;
}

function fmtMonthYear(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/**
 * Resolve a worker's eligibility for a specific country from their profile.
 * Reads work_authorizations first; falls back to the legacy single-value
 * columns for profiles that pre-date the per-country model.
 */
export function resolveEligibilityFor(
  profile: {
    work_authorizations?: WorkAuthorization[] | null;
    // legacy fallbacks
    visa_status?: VisaStatus | string | null;
    visa_expiry_date?: string | null;
    work_eligible_countries?: string[] | null;
  },
  country: string,
  now: Date = new Date()
): ResolvedEligibility {
  const target = normalizeCountry(country);
  const auths = Array.isArray(profile.work_authorizations) ? profile.work_authorizations : [];

  let auth = auths.find((a) => sameCountry(a.country, target)) ?? null;

  // Legacy fallback: old profiles only had one global visa_status + a list of countries.
  if (!auth && profile.work_eligible_countries?.some((c) => sameCountry(c, target)) && profile.visa_status) {
    auth = {
      country: target,
      visa_status: profile.visa_status as VisaStatus,
      visa_expiry: profile.visa_expiry_date ?? "",
    };
  }

  if (!auth || !auth.visa_status) {
    return { kind: "unknown", country: target, auth: null, summary: `No work eligibility listed for ${target}`, badge: "Not listed" };
  }

  const status = auth.visa_status as VisaStatus;
  const statusLabel = VISA_STATUS_LABELS[status] ?? status;
  const prog = programLabel(auth.country, auth.program);
  const base = prog ? `${statusLabel} (${prog})` : statusLabel;

  if (status === "no_visa") {
    return { kind: "needs_sponsorship", country: target, auth, summary: `${base} — would need sponsorship`, badge: "Needs sponsorship" };
  }

  const hasExpiry = auth.visa_expiry && auth.visa_expiry !== "n/a";
  if (hasExpiry) {
    const exp = new Date(auth.visa_expiry);
    if (!isNaN(exp.getTime()) && exp < now) {
      return { kind: "expired", country: target, auth, summary: `${base} · expired ${fmtMonthYear(auth.visa_expiry)}`, badge: "Expired" };
    }
    return { kind: "eligible", country: target, auth, summary: `${base} · until ${fmtMonthYear(auth.visa_expiry)}`, badge: "Eligible" };
  }

  return { kind: "eligible", country: target, auth, summary: base, badge: "Eligible" };
}

/** Compact one-liner of every country a worker can work in (for cards). */
export function summarizeAllEligibility(auths: WorkAuthorization[] | null | undefined): string {
  if (!Array.isArray(auths) || auths.length === 0) return "";
  return auths
    .filter((a) => a.country && a.visa_status)
    .map((a) => `${normalizeCountry(a.country)} (${VISA_STATUS_LABELS[a.visa_status as VisaStatus] ?? a.visa_status})`)
    .join(" · ");
}

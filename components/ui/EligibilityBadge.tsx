import { resolveEligibilityFor, summarizeAllEligibility, type WorkAuthorization } from "@/lib/work-eligibility";

/**
 * Shows a worker's right-to-work FOR A SPECIFIC COUNTRY (the job's), resolved
 * from their per-country work_authorizations — not the legacy single-value
 * column, which only ever reflected the first country they happened to add.
 *
 * Used on every business-side applicant surface so a Whistler hotel sees
 * "Eligible in Canada — IEC Working Holiday until Apr 2027" rather than a
 * status that might belong to Australia.
 */
export default function EligibilityBadge({
  workAuthorizations,
  legacy,
  country,
  variant = "inline",
  showOthers = true,
}: {
  workAuthorizations: WorkAuthorization[] | null | undefined;
  /** Legacy fallback for profiles that pre-date per-country data. */
  legacy?: { visa_status?: string | null; visa_expiry_date?: string | null; work_eligible_countries?: string[] | null };
  /** The job's country. If unknown, we fall back to listing everything they have. */
  country: string | null | undefined;
  variant?: "inline" | "block";
  showOthers?: boolean;
}) {
  const auths = Array.isArray(workAuthorizations) ? workAuthorizations : [];

  // No job country (e.g. a listing with no resort) → just list what they have.
  if (!country) {
    const all = summarizeAllEligibility(auths);
    return <span className="text-sm font-medium text-primary">{all || "Not specified"}</span>;
  }

  const r = resolveEligibilityFor({ work_authorizations: auths, ...legacy }, country);
  const tone = {
    eligible: "bg-green-50 text-green-800 border-green-200",
    expired: "bg-amber-50 text-amber-800 border-amber-200",
    needs_sponsorship: "bg-orange-50 text-orange-800 border-orange-200",
    unknown: "bg-gray-50 text-gray-600 border-gray-200",
  }[r.kind];
  const dot = { eligible: "bg-green-500", expired: "bg-amber-500", needs_sponsorship: "bg-orange-500", unknown: "bg-gray-400" }[r.kind];

  // Other countries they can work in (context, e.g. they're an AU citizen applying in Canada).
  const others = showOthers
    ? auths.filter((a) => a.country && a.visa_status && !r.auth?.country?.toLowerCase().includes(a.country.toLowerCase()) && a.country.toLowerCase() !== r.country.toLowerCase())
    : [];
  const othersText = summarizeAllEligibility(others);

  if (variant === "inline") {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
          {r.badge} · {r.country}
        </span>
        <span className="text-xs text-foreground/60">{r.kind === "unknown" ? "" : r.summary}</span>
      </span>
    );
  }

  return (
    <div>
      <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {r.badge} in {r.country}
      </div>
      <p className="mt-1.5 text-sm font-medium text-primary">{r.summary}</p>
      {othersText && <p className="mt-1 text-xs text-foreground/50">Also: {othersText}</p>}
    </div>
  );
}

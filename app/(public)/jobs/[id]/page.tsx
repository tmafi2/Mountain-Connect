import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPay } from "@/lib/utils/format-pay";
import JobApplyButton from "./JobApplyButton";

interface JobPageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: JobPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch job with business and resort info
  const { data: job } = await supabase
    .from("job_posts")
    .select(`
      *,
      business_profiles!inner(id, business_name, logo_url, verification_status, location, description),
      resorts(id, name, country, legacy_id)
    `)
    .eq("id", id)
    .single();

  if (!job) {
    notFound();
  }

  const biz = job.business_profiles as any;
  const resort = job.resorts as any;
  const isVerified = biz?.verification_status === "verified";

  // Get application count
  const { count: applicantCount } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("job_post_id", id);

  const positionLabel =
    job.position_type === "full_time"
      ? "Full Time"
      : job.position_type === "part_time"
        ? "Part Time"
        : "Casual";

  const seasonLabel =
    job.start_date && job.end_date
      ? `${new Date(job.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} – ${new Date(job.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
      : job.start_date
        ? `From ${new Date(job.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
        : "Flexible";

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Back link */}
      <Link
        href="/jobs"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-primary transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Jobs
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ── Main Content ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-primary sm:text-3xl">{job.title}</h1>
              {job.urgently_hiring && (
                <span className="rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-semibold text-red-600">
                  Urgently Hiring
                </span>
              )}
            </div>

            {/* Business info */}
            <Link
              href={`/business/${biz?.id}`}
              className="mt-3 flex items-center gap-3 group"
            >
              {biz?.logo_url ? (
                <img
                  src={biz.logo_url}
                  alt={biz.business_name}
                  className="h-10 w-10 rounded-xl border border-accent object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                  {biz?.business_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-primary group-hover:text-secondary transition-colors">
                  {biz?.business_name}
                  {isVerified && (
                    <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-green-600">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verified
                    </span>
                  )}
                </p>
                <p className="text-xs text-foreground/50">
                  {resort?.name && `${resort.name}, ${resort.country}`}
                </p>
              </div>
            </Link>
          </div>

          {/* Quick Info Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoCard label="Pay" value={formatPay(job.pay_amount, job.pay_currency, job.salary_range)} />
            <InfoCard label="Position" value={positionLabel} />
            <InfoCard label="Category" value={job.category || "Other"} />
            <InfoCard label="Season" value={seasonLabel} />
            <InfoCard label="Language" value={job.language_required || "Not specified"} />
            <InfoCard label="Positions" value={`${job.positions_available || 1} available`} />
          </div>

          {/* Perks & Benefits */}
          <section>
            <h2 className="text-lg font-semibold text-primary">Perks & Benefits</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <PerkBadge label="Accommodation" included={job.accommodation_included} />
              <PerkBadge label="Ski / Lift Pass" included={job.ski_pass_included} />
              <PerkBadge label="Meal Perks" included={job.meal_perks} />
              <PerkBadge label="Visa Sponsorship" included={job.visa_sponsorship} />
            </div>
            {job.accommodation_included && job.housing_details && (
              <p className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                {job.housing_details}
              </p>
            )}
            {job.accommodation_type && (
              <p className="mt-2 text-sm text-foreground/60">
                <span className="font-medium">Accommodation type:</span> {job.accommodation_type}
                {job.accommodation_cost && ` · ${job.accommodation_cost}`}
              </p>
            )}
            {/* Custom perks */}
            {Array.isArray(job.custom_perks) && job.custom_perks.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {job.custom_perks.map((perk: string, i: number) => (
                  <span key={i} className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                    {perk}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Description */}
          <section>
            <h2 className="text-lg font-semibold text-primary">About the Role</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {job.description}
            </p>
          </section>

          {/* Requirements */}
          {job.requirements && (
            <section>
              <h2 className="text-lg font-semibold text-primary">Requirements</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                {job.requirements}
              </p>
            </section>
          )}

          {/* Meta info */}
          <div className="rounded-xl border border-accent bg-accent/5 p-5">
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider">Posted</p>
                <p className="mt-1 text-foreground">{timeAgo(job.created_at)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider">Applicants</p>
                <p className="mt-1 text-foreground">{applicantCount ?? 0}</p>
              </div>
              {job.start_date && (
                <div>
                  <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider">Start Date</p>
                  <p className="mt-1 text-foreground">
                    {new Date(job.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              )}
              {job.end_date && (
                <div>
                  <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider">End Date</p>
                  <p className="mt-1 text-foreground">
                    {new Date(job.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────── */}
        <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
          {/* Apply Card */}
          <div className="rounded-2xl border border-accent bg-white p-6 shadow-sm">
            <p className="text-lg font-bold text-primary">{formatPay(job.pay_amount, job.pay_currency, job.salary_range)}</p>
            <p className="text-sm text-foreground/50">{positionLabel}</p>

            <div className="mt-5">
              <JobApplyButton jobId={job.id} />
            </div>

            <p className="mt-3 text-center text-xs text-foreground/40">
              {applicantCount ?? 0} {(applicantCount ?? 0) === 1 ? "person has" : "people have"} applied
            </p>
          </div>

          {/* Resort Card */}
          {resort && (
            <Link
              href={`/resorts/${resort.legacy_id || resort.id}`}
              className="block rounded-2xl border border-accent bg-white p-5 shadow-sm transition-all hover:border-secondary hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-lg">
                  &#9968;
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary">{resort.name}</p>
                  <p className="text-xs text-foreground/50">{resort.country}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-foreground/50">
                View resort details, living info, and more jobs →
              </p>
            </Link>
          )}

          {/* Business Card */}
          {biz && (
            <Link
              href={`/business/${biz.id}`}
              className="block rounded-2xl border border-accent bg-white p-5 shadow-sm transition-all hover:border-secondary hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                {biz.logo_url ? (
                  <img src={biz.logo_url} alt={biz.business_name} className="h-10 w-10 rounded-xl border border-accent object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {biz.business_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {biz.business_name}
                    {isVerified && (
                      <span className="ml-1 text-green-500 text-xs">✓</span>
                    )}
                  </p>
                  <p className="text-xs text-foreground/50">View company profile</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helper Components ─────────────────────────────── */

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-accent bg-accent/5 p-3">
      <p className="text-xs font-medium text-foreground/40 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-sm font-semibold text-primary">{value}</p>
    </div>
  );
}

function PerkBadge({ label, included }: { label: string; included: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
        included
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-accent bg-accent/5 text-foreground/30"
      }`}
    >
      {included ? (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

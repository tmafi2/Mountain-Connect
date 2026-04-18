import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPay } from "@/lib/utils/format-pay";
import JobApplyButton from "./JobApplyButton";
import UnclaimedBanner from "./UnclaimedBanner";
import ShareButtons from "@/components/ui/ShareButtons";
import type { Metadata } from "next";

interface JobPageProps {
  params: Promise<{ id: string }>;
}

const BASE_URL = "https://www.mountainconnects.com";

export async function generateMetadata({ params }: JobPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("job_posts")
    .select(`
      title, description, pay_amount, pay_currency, salary_range, position_type, category,
      start_date, end_date, accommodation_included, created_at,
      business_profiles!inner(business_name, location),
      resorts(name, country)
    `)
    .eq("id", id)
    .single();

  if (!job) return { title: "Job Not Found | Mountain Connects" };

  const biz = job.business_profiles as any;
  const resort = job.resorts as any;
  const title = `${job.title} at ${biz?.business_name || "Mountain Connects"}${resort?.name ? ` — ${resort.name}` : ""}`;
  const description = job.description
    ? job.description.slice(0, 155) + (job.description.length > 155 ? "..." : "")
    : `${job.title} position at ${biz?.business_name}. Apply now on Mountain Connects.`;

  return {
    title: `${title} | Mountain Connects`,
    description,
    alternates: { canonical: `${BASE_URL}/jobs/${id}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/jobs/${id}`,
      siteName: "Mountain Connects",
      type: "website",
      images: [
        {
          url: `${BASE_URL}/images/og-image-v2.jpg`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${BASE_URL}/images/og-image-v2.jpg`],
    },
  };
}

export default async function JobDetailPage({ params }: JobPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("job_posts")
    .select(`
      *,
      business_profiles!inner(id, business_name, logo_url, verification_status, location, description, is_claimed),
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
  const isUnclaimed = biz?.is_claimed === false;
  const source = job.source as string | null;
  const sourceUrl = job.source_url as string | null;

  const positionLabel =
    job.position_type === "full_time"
      ? "Full Time"
      : job.position_type === "part_time"
        ? "Part Time"
        : "Casual";

  const payDisplay = formatPay(job.pay_amount, job.pay_currency, job.salary_range);

  // JobPosting JSON-LD structured data
  const employmentType = job.position_type === "full_time" ? "FULL_TIME" : job.position_type === "part_time" ? "PART_TIME" : "TEMPORARY";

  const parseSalary = (raw: string | null | undefined): { min?: number; max?: number } | null => {
    if (!raw) return null;
    const cleaned = raw.replace(/[^\d.\-–—]/g, "").replace(/[–—]/g, "-");
    const range = cleaned.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
    if (range) return { min: parseFloat(range[1]), max: parseFloat(range[2]) };
    const single = cleaned.match(/^(\d+(?:\.\d+)?)$/);
    if (single) return { min: parseFloat(single[1]), max: parseFloat(single[1]) };
    return null;
  };
  const salary = parseSalary(job.pay_amount);

  const jobBenefits: string[] = [];
  if (job.accommodation_included) jobBenefits.push("Staff accommodation");
  if (job.ski_pass_included) jobBenefits.push("Ski/lift pass");
  if (job.meal_perks) jobBenefits.push("Meals included");
  if (job.visa_sponsorship) jobBenefits.push("Visa sponsorship");
  if (Array.isArray(job.custom_perks)) jobBenefits.push(...job.custom_perks.filter(Boolean));

  const hasDirectApply = Boolean(job.application_email || job.application_url);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    identifier: {
      "@type": "PropertyValue",
      name: "Mountain Connects",
      value: id,
    },
    title: job.title,
    description: job.description || "",
    datePosted: job.created_at,
    employmentType,
    hiringOrganization: {
      "@type": "Organization",
      name: biz?.business_name || "Mountain Connects",
      sameAs: `${BASE_URL}/business/${biz?.id}`,
      ...(biz?.logo_url && { logo: biz.logo_url }),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: biz?.location || resort?.name || "",
        addressCountry: resort?.country || "",
      },
    },
    ...(job.category && { occupationalCategory: job.category }),
    ...(job.end_date && { validThrough: job.end_date }),
    ...(salary && job.pay_currency && {
      baseSalary: {
        "@type": "MonetaryAmount",
        currency: job.pay_currency,
        value: {
          "@type": "QuantitativeValue",
          minValue: salary.min,
          maxValue: salary.max,
          unitText: "HOUR",
        },
      },
    }),
    ...(jobBenefits.length > 0 && { jobBenefits }),
    ...(hasDirectApply && { directApply: true }),
  };

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
    <div className="min-h-screen bg-background">
      {/* ── Hero Header ───────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#1a3a5c]" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/4 h-40 w-80 rounded-full bg-secondary/8 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 bottom-0 h-32 w-32 rounded-full bg-highlight/6 blur-2xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative mx-auto max-w-5xl px-6 pb-10 pt-8">
          {/* Back */}
          <Link
            href="/jobs"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/80 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Jobs
          </Link>

          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex-1">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1 text-xs font-medium text-white/70">
                  {positionLabel}
                </span>
                {job.category && (
                  <span className="rounded-full bg-white/10 backdrop-blur-sm border border-white/10 px-3 py-1 text-xs font-medium text-white/70">
                    {job.category}
                  </span>
                )}
                {job.urgently_hiring && (
                  <span className="rounded-full bg-red-500/20 backdrop-blur-sm border border-red-400/30 px-3 py-1 text-xs font-semibold text-red-300 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                    Urgently Hiring
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-white sm:text-4xl">{job.title}</h1>

              {/* Business */}
              <Link
                href={`/business/${biz?.id}`}
                className="mt-4 inline-flex items-center gap-3 group"
              >
                {biz?.logo_url ? (
                  <img
                    src={biz.logo_url}
                    alt={biz.business_name}
                    className="h-11 w-11 rounded-xl border-2 border-white/20 object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-sm font-bold text-white shadow-lg">
                    {biz?.business_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-secondary transition-colors flex items-center gap-2">
                    {biz?.business_name}
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-400/20 px-2 py-0.5 text-[10px] font-semibold text-green-300">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-white/50 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {resort?.name ? `${resort.name}, ${resort.country}` : biz?.location}
                  </p>
                </div>
              </Link>
            </div>

            {/* Pay highlight (desktop) */}
            <div className="hidden sm:block text-right">
              <p className="text-3xl font-bold text-white">{payDisplay}</p>
              <p className="text-sm text-white/40 mt-1">{positionLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        {isUnclaimed && (
          <UnclaimedBanner
            jobId={job.id}
            businessName={biz?.business_name || "this business"}
            source={source}
          />
        )}
        <div className="grid gap-8 lg:grid-cols-3">

          {/* ── Main Column ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-8">

            {/* Key Details Strip */}
            <div className={`grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-accent bg-accent/30 ${job.show_positions !== false ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              <KeyDetail
                icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                label="Season"
                value={
                  job.start_date && job.end_date
                    ? `${new Date(job.start_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })} – ${new Date(job.end_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
                    : "Flexible"
                }
              />
              {job.show_positions !== false && (
                <KeyDetail
                  icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>}
                  label="Positions"
                  value={`${job.positions_available || 1} available`}
                />
              )}
              <KeyDetail
                icon={<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" /></svg>}
                label="Language"
                value={job.language_required || "English"}
              />
            </div>

            {/* Perks & Benefits */}
            <section className="rounded-2xl border border-accent bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-semibold text-primary">
                <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
                Perks & Benefits
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <PerkCard label="Accommodation" included={job.accommodation_included} icon="🏠" />
                <PerkCard label="Ski / Lift Pass" included={job.ski_pass_included} icon="🎿" />
                <PerkCard label="Meals" included={job.meal_perks} icon="🍽️" />
                <PerkCard label="Visa Sponsorship" included={job.visa_sponsorship} icon="🛂" />
              </div>

              {/* Housing details */}
              {job.accommodation_included && (job.housing_details || job.accommodation_type) && (
                <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">Accommodation Details</p>
                  {job.housing_details && (
                    <p className="text-sm text-emerald-700">{job.housing_details}</p>
                  )}
                  {job.accommodation_type && (
                    <p className="text-xs text-emerald-600 mt-1">
                      {job.accommodation_type}{job.accommodation_cost && ` · ${job.accommodation_cost}`}
                    </p>
                  )}
                </div>
              )}

              {/* Custom perks */}
              {Array.isArray(job.custom_perks) && job.custom_perks.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-foreground/40 uppercase tracking-wider mb-2">Additional Perks</p>
                  <div className="flex flex-wrap gap-2">
                    {job.custom_perks.map((perk: string, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 border border-secondary/20 px-3 py-1.5 text-xs font-medium text-secondary">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                        {perk}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* About the Role */}
            <section className="rounded-2xl border border-accent bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-semibold text-primary">
                <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                About the Role
              </h2>
              <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/75">
                {job.description}
              </div>
            </section>

            {/* Requirements */}
            {job.requirements && (
              <section className="rounded-2xl border border-accent bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 text-base font-semibold text-primary">
                  <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Requirements
                </h2>
                <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/75">
                  {job.requirements}
                </div>
              </section>
            )}

            {/* Timeline / Meta */}
            <div className="rounded-2xl border border-accent bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-semibold text-primary mb-4">
                <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                Timeline
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl bg-accent/10 p-3">
                  <p className="text-[10px] font-semibold text-foreground/35 uppercase tracking-wider">Posted</p>
                  <p className="mt-1 text-sm font-medium text-primary">{timeAgo(job.created_at)}</p>
                </div>
                {job.start_date && (
                  <div className="rounded-xl bg-accent/10 p-3">
                    <p className="text-[10px] font-semibold text-foreground/35 uppercase tracking-wider">Start Date</p>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {new Date(job.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                )}
                {job.end_date && (
                  <div className="rounded-xl bg-accent/10 p-3">
                    <p className="text-[10px] font-semibold text-foreground/35 uppercase tracking-wider">End Date</p>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {new Date(job.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Sidebar ────────────────────────────────────── */}
          <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">

            {/* Apply Card */}
            <div className="rounded-2xl border border-accent bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
                <p className="text-2xl font-bold text-primary">{payDisplay}</p>
                <p className="text-sm text-foreground/50 mt-0.5">{positionLabel} · {job.category || "Other"}</p>
              </div>
              <div className="p-6 pt-5">
                <JobApplyButton
                  jobId={job.id}
                  isUnclaimed={isUnclaimed}
                  jobTitle={job.title}
                  businessName={biz?.business_name || "this business"}
                />
                  </div>
            </div>

            {/* Resort Card */}
            {resort && (
              <Link
                href={`/resorts/${resort.legacy_id || resort.id}`}
                className="group block rounded-2xl border border-accent bg-white p-5 shadow-sm transition-all hover:border-secondary hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/20 to-secondary/10 text-xl shadow-sm">
                    ⛷️
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary group-hover:text-secondary transition-colors">{resort.name}</p>
                    <p className="text-xs text-foreground/50">{resort.country}</p>
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-1 text-xs text-foreground/40 group-hover:text-secondary/70 transition-colors">
                  View resort details, living info & more jobs
                  <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </p>
              </Link>
            )}

            {/* Business Card */}
            {biz && (
              <Link
                href={`/business/${biz.id}`}
                className="group block rounded-2xl border border-accent bg-white p-5 shadow-sm transition-all hover:border-secondary hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  {biz.logo_url ? (
                    <img src={biz.logo_url} alt={biz.business_name} className="h-11 w-11 rounded-xl border border-accent object-cover shadow-sm" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary shadow-sm">
                      {biz.business_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-primary group-hover:text-secondary transition-colors flex items-center gap-1.5">
                      {biz.business_name}
                      {isVerified && (
                        <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </p>
                    <p className="text-xs text-foreground/50">View company profile</p>
                  </div>
                </div>
              </Link>
            )}

            {/* Share this job */}
            <div className="rounded-2xl border border-accent/30 bg-white p-4">
              <p className="text-xs font-medium text-primary/70 mb-3">Know someone who'd be perfect? Share this job:</p>
              <ShareButtons
                url={`https://www.mountainconnects.com/jobs/${id}`}
                title={`${job.title} at ${biz?.business_name || "Mountain Connects"}`}
                description={`Check out this ${positionLabel.toLowerCase()} position at ${biz?.business_name}${resort?.name ? ` — ${resort.name}` : ""}. Apply on Mountain Connects.`}
              />
            </div>
          </div>
        </div>

        {isUnclaimed && source && (
          <p className="mt-8 text-center text-xs text-foreground/40">
            Sourced from {source}
            {sourceUrl && (
              <>
                {" · "}
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="underline hover:text-foreground/60"
                >
                  View original post →
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </div>
    </>
  );
}

/* ── Helper Components ─────────────────────────────── */

function KeyDetail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white p-4 flex items-start gap-3">
      <div className="mt-0.5 text-secondary/60 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-foreground/35 uppercase tracking-wider">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-primary truncate">{value}</p>
      </div>
    </div>
  );
}

function PerkCard({ label, included, icon }: { label: string; included: boolean; icon: string }) {
  return (
    <div
      className={`rounded-xl p-3 text-center transition-all ${
        included
          ? "bg-emerald-50 border border-emerald-200 shadow-sm"
          : "bg-gray-50/50 border border-transparent"
      }`}
    >
      <span className={`text-xl ${included ? "" : "grayscale opacity-30"}`}>{icon}</span>
      <p className={`mt-1.5 text-xs font-medium ${included ? "text-emerald-700" : "text-foreground/25"}`}>
        {label}
      </p>
      {included && (
        <p className="mt-0.5 text-[10px] font-semibold text-emerald-500 uppercase">Included</p>
      )}
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

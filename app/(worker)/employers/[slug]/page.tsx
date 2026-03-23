"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { getBusinessBySlug, getCategoryLabel, seedBusinesses } from "@/lib/data/businesses";
import { seedJobs } from "@/lib/data/jobs";
import { resorts } from "@/lib/data/resorts";
import PhotoGallery from "@/components/ui/PhotoGallery";
import ResortMap from "@/components/ui/ResortMap";

/* ─── Style helpers ──────────────────────────────────────── */

const VERIFICATION_BADGE = {
  verified: { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Verified Employer" },
  pending_review: { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", label: "Pending Verification" },
  unverified: { bg: "bg-gray-50 border-gray-200", text: "text-gray-500", label: "Unverified" },
  rejected: { bg: "bg-red-50 border-red-200", text: "text-red-500", label: "Rejected" },
};

/* ─── Page ───────────────────────────────────────────────── */

export default function EmployerProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const business = getBusinessBySlug(slug);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState<string[]>([]);

  if (!business) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center">
        <p className="text-foreground/50">Employer not found.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const badge = VERIFICATION_BADGE[business.verification_status];

  // Get resorts this business operates at
  const businessResorts = business.resort_ids
    .map((rid) => resorts.find((r) => r.id === rid))
    .filter(Boolean);

  // Get active job listings for this business (match by business_name)
  const businessJobs = seedJobs.filter(
    (j) =>
      j.is_active &&
      j.business_name.toLowerCase().includes(business.business_name.split(" ")[0].toLowerCase())
  );

  const handleFollow = async () => {
    setFollowLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsFollowing(!isFollowing);
    setFollowLoading(false);
  };

  const handleApply = async (jobId: string) => {
    setApplyLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setAppliedJobs((prev) => [...prev, jobId]);
    setApplyingTo(null);
    setCoverLetter("");
    setApplyLoading(false);
  };

  return (
    <div className="mx-auto max-w-4xl">
      {/* Back link */}
      <button
        onClick={() => window.history.back()}
        className="mb-4 inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-accent bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Logo placeholder */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
              {business.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-primary">{business.business_name}</h1>
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                  {badge.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-foreground/60">
                {getCategoryLabel(business.category)} · {business.location}
              </p>
              {business.year_established && (
                <p className="mt-0.5 text-xs text-foreground/40">
                  Established {business.year_established}
                </p>
              )}
            </div>
          </div>

          {/* Follow button */}
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
              isFollowing
                ? "border border-accent bg-white text-foreground hover:bg-accent/20"
                : "bg-primary text-white hover:bg-primary/90"
            }`}
          >
            {followLoading
              ? "..."
              : isFollowing
                ? "Following"
                : "Follow"}
          </button>
        </div>

        {/* Links row */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          {business.website && (
            <a
              href={business.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-primary hover:text-secondary"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
              </svg>
              Website
            </a>
          )}
          {business.email && (
            <a
              href={`mailto:${business.email}`}
              className="flex items-center gap-1.5 text-primary hover:text-secondary"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </a>
          )}
          {business.phone && (
            <span className="flex items-center gap-1.5 text-foreground/60">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {business.phone}
            </span>
          )}
          {business.social_links?.instagram && (
            <span className="flex items-center gap-1.5 text-foreground/60">
              <span className="text-xs">IG</span> {business.social_links.instagram}
            </span>
          )}
        </div>
      </div>

      {/* ── Content grid ───────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* About */}
          {business.description && (
            <div className="rounded-xl border border-accent bg-white p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">About</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">{business.description}</p>
            </div>
          )}

          {/* Active Job Listings */}
          <div className="rounded-xl border border-accent bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
                Open Positions ({businessJobs.length})
              </h2>
            </div>

            {businessJobs.length === 0 ? (
              <div className="mt-4 rounded-lg bg-accent/10 p-6 text-center">
                <p className="text-sm text-foreground/50">No open positions right now. Follow this employer to get notified when new jobs are posted.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {businessJobs.map((job) => {
                  const hasApplied = appliedJobs.includes(job.id);
                  const isExpanded = expandedJob === job.id;
                  const isApplying = applyingTo === job.id;

                  return (
                    <div key={job.id} className="rounded-lg border border-accent overflow-hidden">
                      {/* Job summary row */}
                      <button
                        onClick={() => {
                          setExpandedJob(isExpanded ? null : job.id);
                          if (isExpanded) setApplyingTo(null);
                        }}
                        className="w-full p-4 text-left transition-colors hover:bg-accent/5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-primary">{job.title}</h3>
                              {job.urgently_hiring && (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600">
                                  Urgent
                                </span>
                              )}
                              {hasApplied && (
                                <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                                  Applied
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-foreground/60">
                              {job.resort_name} · {job.position_type === "full_time" ? "Full-time" : job.position_type === "part_time" ? "Part-time" : "Casual"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-primary">{job.pay_amount}</span>
                            <svg
                              className={`h-4 w-4 text-foreground/30 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>

                        {/* Perk tags */}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {job.accommodation_included && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">Housing</span>
                          )}
                          {job.ski_pass_included && (
                            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">Ski Pass</span>
                          )}
                          {job.meal_perks && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Meals</span>
                          )}
                          {job.visa_sponsorship && (
                            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">Visa Sponsorship</span>
                          )}
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t border-accent bg-accent/5 p-4">
                          <p className="text-sm leading-relaxed text-foreground/80">{job.description}</p>

                          {job.requirements && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Requirements</p>
                              <p className="mt-1 text-sm text-foreground/70">{job.requirements}</p>
                            </div>
                          )}

                          {job.housing_details && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Housing</p>
                              <p className="mt-1 text-sm text-foreground/70">{job.housing_details}</p>
                            </div>
                          )}

                          <div className="mt-3 flex items-center gap-4 text-xs text-foreground/50">
                            {job.start_date && (
                              <span>Starts {new Date(job.start_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</span>
                            )}
                            <span>{job.applications_count} applicants</span>
                            <span>{job.language_required} required</span>
                          </div>

                          {/* Action buttons */}
                          <div className="mt-4 flex items-center gap-3">
                            {hasApplied ? (
                              <span className="rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                                Application Submitted
                              </span>
                            ) : isApplying ? null : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setApplyingTo(job.id);
                                }}
                                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                              >
                                Quick Apply
                              </button>
                            )}
                            <Link
                              href={`/jobs?open=${job.id}`}
                              className="rounded-lg border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
                            >
                              View Full Listing
                            </Link>
                          </div>

                          {/* Mini apply form */}
                          {isApplying && !hasApplied && (
                            <div className="mt-4 rounded-lg border border-secondary/30 bg-white p-4">
                              <h4 className="text-sm font-semibold text-primary">Quick Application</h4>
                              <p className="mt-1 text-xs text-foreground/50">
                                Your profile will be sent with this application. Add an optional cover letter or message.
                              </p>

                              <textarea
                                value={coverLetter}
                                onChange={(e) => setCoverLetter(e.target.value)}
                                placeholder="Add a cover letter or quick message for the employer (optional)..."
                                rows={4}
                                className="mt-3 w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm text-primary placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                              />

                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  onClick={() => handleApply(job.id)}
                                  disabled={applyLoading}
                                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                                >
                                  {applyLoading ? "Submitting..." : "Submit Application"}
                                </button>
                                <button
                                  onClick={() => {
                                    setApplyingTo(null);
                                    setCoverLetter("");
                                  }}
                                  className="rounded-lg border border-accent bg-white px-4 py-2 text-sm text-foreground hover:bg-accent/20"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-5">
          {/* Perks card */}
          {business.standard_perks && business.standard_perks.length > 0 && (
            <div className="rounded-xl border border-accent bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
                Standard Perks
              </h3>
              <ul className="mt-3 space-y-2">
                {business.standard_perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2 text-sm text-foreground/80">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {perk}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Resorts card */}
          {businessResorts.length > 0 && (
            <div className="rounded-xl border border-accent bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
                Operates At
              </h3>
              <div className="mt-3 space-y-2">
                {businessResorts.map((resort) =>
                  resort ? (
                    <Link
                      key={resort.id}
                      href={`/resorts/${resort.id}`}
                      className="flex items-center gap-2 rounded-lg p-2 text-sm text-primary transition-colors hover:bg-accent/10 hover:text-secondary"
                    >
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="font-medium">{resort.name}</span>
                      <span className="text-xs text-foreground/40">{resort.country}</span>
                    </Link>
                  ) : null
                )}
              </div>
            </div>
          )}

          {/* Location map */}
          {businessResorts.length > 0 && (
            <div className="rounded-xl border border-accent bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
                Locations
              </h3>
              <div className="mt-3">
                <ResortMap
                  pins={businessResorts
                    .filter((r): r is NonNullable<typeof r> => r !== null && r !== undefined)
                    .map((r) => ({
                      id: r.id,
                      lat: r.latitude,
                      lng: r.longitude,
                      label: r.name,
                      sublabel: r.country,
                      href: `/resorts/${r.id}`,
                    }))}
                  height="200px"
                />
              </div>
            </div>
          )}

          {/* Quick info card */}
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
              Quick Info
            </h3>
            <dl className="mt-3 space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-foreground/60">Category</dt>
                <dd className="font-medium text-primary">{getCategoryLabel(business.category)}</dd>
              </div>
              {business.year_established && (
                <div className="flex justify-between text-sm">
                  <dt className="text-foreground/60">Established</dt>
                  <dd className="font-medium text-primary">{business.year_established}</dd>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <dt className="text-foreground/60">Open Positions</dt>
                <dd className="font-medium text-primary">{business.open_positions}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-foreground/60">Status</dt>
                <dd>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}>
                    {badge.label}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Photos */}
          {business.photos.length > 0 && (
            <div className="rounded-xl border border-accent bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
                Photos
              </h3>
              <div className="mt-3">
                <PhotoGallery photos={business.photos} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

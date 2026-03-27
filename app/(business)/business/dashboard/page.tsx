"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BusinessDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<string>("unverified");
  const [listingCount, setListingCount] = useState("0");
  const [applicantCount, setApplicantCount] = useState("0");
  const [interviewCount, setInterviewCount] = useState("0");

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      setUserName(user?.user_metadata?.full_name?.split(" ")[0] || "there");

      if (user) {
        const { data: profile } = await supabase
          .from("business_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          setCompanyName(profile.business_name || "");
          setVerificationStatus(profile.verification_status || "unverified");
          // Same completion calculation as company-profile page
          const fields = [
            profile.business_name,
            profile.description,
            Array.isArray(profile.industries) && profile.industries.length > 0 ? "has_industries" : "",
            profile.website,
            profile.phone,
            profile.email,
            profile.location,
            profile.country,
            profile.address,
            Array.isArray(profile.standard_perks) && profile.standard_perks.length > 0 ? "has_perks" : "",
            profile.resort_id ? "has_resort" : "",
            profile.logo_url ? "has_logo" : "",
          ];
          const filled = fields.filter((f) => f && String(f).length > 0).length;
          setProfileCompletion(Math.round((filled / fields.length) * 100));

          const [listings, applicants, interviews] = await Promise.all([
            supabase
              .from("job_posts")
              .select("id", { count: "exact", head: true })
              .eq("business_id", profile.id)
              .eq("status", "active"),
            supabase
              .from("applications")
              .select("id, job_posts!inner(business_id)", { count: "exact", head: true })
              .eq("job_posts.business_id", profile.id),
            supabase
              .from("interviews")
              .select("id", { count: "exact", head: true })
              .eq("business_id", profile.id)
              .in("status", ["scheduled", "invited"]),
          ]);

          setListingCount(String(listings.count ?? 0));
          setApplicantCount(String(applicants.count ?? 0));
          setInterviewCount(String(interviews.count ?? 0));
        }
      }

      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      {/* ── Hero header — clean corporate gradient ────────────── */}
      <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-2xl px-8 py-10 sm:px-10 sm:py-12">
        {/* Gradient background — deeper, more corporate */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#132d4a]" />
        {/* Subtle geometric shapes instead of organic blobs */}
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-3xl bg-secondary/8 blur-2xl rotate-12" />
        <div className="absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-secondary/6 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-24 w-24 rounded-2xl bg-highlight/5 blur-xl" />
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-secondary-light/70">
                Employer Dashboard
              </p>
              <h1 className="mt-1 text-3xl font-bold text-white sm:text-4xl">
                Welcome back{userName !== "there" ? `, ${userName}` : ""}
              </h1>
              {companyName && (
                <div className="mt-1 flex items-center gap-2.5">
                  <p className="text-sm text-white/40">{companyName}</p>
                  {verificationStatus === "verified" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-300 backdrop-blur-sm">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Verified
                    </span>
                  ) : verificationStatus === "pending_review" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 backdrop-blur-sm">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Pending Review
                    </span>
                  ) : verificationStatus === "rejected" ? (
                    <Link href="/business/company-profile" className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-300 backdrop-blur-sm transition-colors hover:bg-red-500/30">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                      </svg>
                      Rejected
                    </Link>
                  ) : (
                    <Link href="/business/company-profile" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/50 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white/70">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Not Verified
                    </Link>
                  )}
                </div>
              )}
              <p className="mt-2 max-w-lg text-sm text-white/50">
                Manage your listings, review candidates, and build your seasonal team.
              </p>
            </div>
          </div>

          {/* Search bar — integrated into header */}
          <div className="relative mt-6 max-w-xl">
            <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  router.push(`/business/manage-listings?search=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              placeholder="Search listings, applicants, resorts..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/30 backdrop-blur-sm transition-colors focus:border-secondary/40 focus:bg-white/10 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Stats row — clean glass cards ──────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          href="/business/manage-listings"
          label="Active Listings"
          value={listingCount}
          sub="Currently posted"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
          color="secondary"
        />
        <StatCard
          href="/business/applicants"
          label="Applicants"
          value={applicantCount}
          sub="Across all jobs"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
          color="primary"
        />
        <StatCard
          href="/business/interviews"
          label="Interviews"
          value={interviewCount}
          sub="Scheduled"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          }
          color="highlight"
        />
        <CompletionCard completion={profileCompletion} />
      </div>

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div className="mt-10">
        <h2 className="text-lg font-semibold text-primary">Quick Actions</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ActionCard
            href="/business/post-job"
            title="Post a New Job"
            description="Create a listing and start receiving applications from seasonal workers."
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            }
            accent
          />
          <ActionCard
            href="/business/manage-listings"
            title="Manage Listings"
            description="Edit, pause, or close your existing job listings."
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            }
          />
          <ActionCard
            href="/business/company-profile"
            title="Company Profile"
            description="Update your business details to attract the right candidates."
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            }
          />
        </div>
      </div>

      {/* ── Recent Activity ───────────────────────────────────── */}
      <div className="mt-10 mb-4">
        <h2 className="text-lg font-semibold text-primary">Recent Activity</h2>
        <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
            <svg className="h-6 w-6 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground/60">
            No recent activity
          </p>
          <p className="mt-1 text-xs text-foreground/40">
            Post your first job to start receiving applications.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Stat Card — corporate glass style ─────────────────────── */
function StatCard({
  href,
  label,
  value,
  sub,
  icon,
  color,
}: {
  href: string;
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: "primary" | "secondary" | "highlight" | "warm";
}) {
  const colorMap = {
    primary: "bg-primary/8 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    highlight: "bg-highlight/10 text-highlight",
    warm: "bg-warm/10 text-warm",
  };

  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border border-accent/40 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold text-primary">
            {value}
          </p>
          <p className="mt-0.5 text-xs text-foreground/40">{sub}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[color]} transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
      </div>
      {/* Bottom accent line */}
      <div className={`absolute bottom-0 left-0 h-0.5 w-0 bg-${color} transition-all duration-500 group-hover:w-full`} />
    </Link>
  );
}

/* ── Completion Card ───────────────────────────────────────── */
function CompletionCard({ completion }: { completion: number }) {
  const isGood = completion >= 80;
  const isMid = completion >= 50;

  return (
    <Link
      href="/business/company-profile"
      className="group relative overflow-hidden rounded-2xl border border-accent/40 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-foreground/40">
            Profile
          </p>
          <p className={`mt-2 text-3xl font-bold ${isGood ? "text-green-600" : isMid ? "text-secondary" : "text-warm"}`}>
            {completion}%
          </p>
          <p className="mt-0.5 text-xs text-foreground/40">Completion</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${isGood ? "bg-green-500/10" : isMid ? "bg-secondary/10" : "bg-warm/10"}`}>
          <svg className="h-5 w-5 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-accent/30" />
            <circle
              cx="18" cy="18" r="14" fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${completion * 0.88} 88`}
              className={isGood ? "stroke-green-500" : isMid ? "stroke-secondary" : "stroke-warm"}
            />
          </svg>
        </div>
      </div>
      {/* Progress bar at bottom */}
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-accent/20">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isGood ? "bg-green-500" : isMid ? "bg-secondary" : "bg-warm"}`}
          style={{ width: `${completion}%` }}
        />
      </div>
    </Link>
  );
}

/* ── Action Card — clean corporate ─────────────────────────── */
function ActionCard({
  href,
  title,
  description,
  icon,
  accent,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        accent
          ? "border-secondary/30 bg-gradient-to-br from-secondary/5 to-transparent hover:border-secondary/50 hover:shadow-secondary/5"
          : "border-accent/40 bg-white hover:border-primary/20 hover:shadow-primary/5"
      }`}
    >
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
        accent
          ? "bg-secondary/15 text-secondary group-hover:bg-secondary group-hover:text-white"
          : "bg-accent/20 text-foreground/50 group-hover:bg-primary/10 group-hover:text-primary"
      }`}>
        {icon}
      </div>
      <h3 className={`font-semibold transition-colors ${accent ? "text-primary group-hover:text-secondary" : "text-primary"}`}>
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/50">{description}</p>
      <div className="mt-3 flex items-center gap-1 text-xs font-medium text-secondary opacity-0 transition-all duration-300 group-hover:opacity-100">
        {accent ? "Create now" : "View"}
        <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </Link>
  );
}

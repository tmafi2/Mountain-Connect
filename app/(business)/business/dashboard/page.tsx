"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BusinessDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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
      setUserName(user?.user_metadata?.full_name || "there");

      if (user) {
        const { data: profile } = await supabase
          .from("business_profiles")
          .select("id, business_name, description, category, year_established, website, phone, email, location, standard_perks")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          const fields = [
            profile.business_name,
            profile.description,
            profile.category,
            profile.year_established,
            profile.website,
            profile.phone,
            profile.email,
            profile.location,
            profile.standard_perks?.length > 0 ? "has_perks" : "",
          ];
          const filled = fields.filter((f) => f && String(f).length > 0).length;
          setProfileCompletion(Math.round((filled / fields.length) * 100));

          // Fetch real counts
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
        <p className="text-foreground/50">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-primary">
        Welcome back, {userName}
      </h1>
      <p className="mt-1 text-sm text-foreground/60">
        Manage your job listings and review applicants.
      </p>

      {/* Search bar */}
      <div className="relative mt-6">
        <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          className="w-full rounded-xl border border-accent bg-white py-3 pl-10 pr-4 text-sm text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard href="/business/manage-listings" label="Active Listings" value={listingCount} sub="Currently posted" />
        <StatCard href="/business/applicants" label="Total Applicants" value={applicantCount} sub="Across all jobs" />
        <StatCard href="/business/interviews" label="Interviews" value={interviewCount} sub="Upcoming scheduled" />
        <StatCard href="/business/company-profile" label="Company Profile" value={`${profileCompletion}%`} sub="Completion" accent />
      </div>

      {/* Quick actions */}
      <h2 className="mt-10 text-lg font-semibold text-primary">Quick Actions</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ActionCard
          href="/business/post-job"
          title="Post a New Job"
          description="Create a job listing and start receiving applications from seasonal workers."
        />
        <ActionCard
          href="/business/manage-listings"
          title="Manage Listings"
          description="Edit, pause, or close your existing job listings."
        />
        <ActionCard
          href="/business/company-profile"
          title="Company Profile"
          description="Update your business details to attract the right candidates."
        />
      </div>

      {/* Recent activity */}
      <h2 className="mt-10 text-lg font-semibold text-primary">
        Recent Activity
      </h2>
      <div className="mt-4 rounded-xl border border-accent bg-white p-8 text-center">
        <p className="text-sm text-foreground/50">
          No recent activity yet. Post your first job to start receiving
          applications.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  sub,
  accent,
}: {
  href: string;
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-accent bg-white p-5 transition-all hover:border-secondary hover:shadow-md"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-bold ${accent ? "text-secondary" : "text-primary"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-foreground/50">{sub}</p>
    </Link>
  );
}

function ActionCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-accent bg-white p-5 transition-all hover:border-secondary hover:shadow-md"
    >
      <h3 className="font-semibold text-primary group-hover:text-secondary">
        {title}
      </h3>
      <p className="mt-2 text-sm text-foreground/60">{description}</p>
    </Link>
  );
}

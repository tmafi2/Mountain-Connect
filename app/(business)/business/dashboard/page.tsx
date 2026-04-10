"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import confetti from "canvas-confetti";
import { isInLaunchLocation, LAUNCH_LOCATION_NAMES } from "@/lib/config/launch-locations";
import { isGracePeriod } from "@/lib/tier";
import type { BusinessTier } from "@/lib/tier";

/* ─── search result types ─────────────────────────────────── */
interface SearchResult {
  id: string;
  type: "listing" | "applicant" | "resort";
  title: string;
  subtitle: string;
  href: string;
}

interface BizActivity {
  id: string;
  type: "new_application" | "interview_scheduled" | "interview_completed" | "offer_accepted" | "offer_declined" | "listing_published" | "verified";
  title: string;
  subtitle: string;
  date: string;
  href: string;
}

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
  const [showCelebration, setShowCelebration] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [activities, setActivities] = useState<BizActivity[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [inLaunchLocation, setInLaunchLocation] = useState(true);
  const [businessTier, setBusinessTier] = useState<BusinessTier>("free");
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
          setProfileId(profile.id);
          setCompanyName(profile.business_name || "");
          setVerificationStatus(profile.verification_status || "unverified");
          setBusinessTier((profile.tier || "free") as BusinessTier);

          // Check if we need to show the verification celebration
          if (profile.show_verified_celebration && profile.verification_status === "verified") {
            setShowCelebration(true);
          }
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

          // Check if business is in a launch location
          let resortLegacyId: string | null = null;
          let townSlug: string | null = null;
          if (profile.resort_id) {
            const { data: resort } = await supabase
              .from("resorts")
              .select("legacy_id")
              .eq("id", profile.resort_id)
              .single();
            resortLegacyId = resort?.legacy_id ?? null;
          }
          if (profile.nearby_town_id) {
            const { data: town } = await supabase
              .from("nearby_towns")
              .select("slug")
              .eq("id", profile.nearby_town_id)
              .single();
            townSlug = town?.slug ?? null;
          }
          setInLaunchLocation(isInLaunchLocation(resortLegacyId, townSlug));

          // Fetch active listings
          const { count: activeListingCount } = await supabase
            .from("job_posts")
            .select("id", { count: "exact", head: true })
            .eq("business_id", profile.id)
            .eq("status", "active");

          setListingCount(String(activeListingCount ?? 0));

          // Fetch ALL job IDs for this business (not just active) to count applicants across all listings
          const { data: allJobIds } = await supabase
            .from("job_posts")
            .select("id")
            .eq("business_id", profile.id);

          if (allJobIds && allJobIds.length > 0) {
            const jobIds = allJobIds.map((j) => j.id);

            const [applicants, interviews] = await Promise.all([
              supabase
                .from("applications")
                .select("id", { count: "exact", head: true })
                .in("job_post_id", jobIds),
              supabase
                .from("interviews")
                .select("id", { count: "exact", head: true })
                .eq("business_id", profile.id)
                .in("status", ["scheduled", "invited"]),
            ]);

            setApplicantCount(String(applicants.count ?? 0));
            setInterviewCount(String(interviews.count ?? 0));
          } else {
            setApplicantCount("0");
            setInterviewCount("0");
          }

          // ── Build activity feed ──────────────────────────────
          const feed: BizActivity[] = [];

          // Recent applications
          if (allJobIds && allJobIds.length > 0) {
            const jobIds = allJobIds.map((j) => j.id);
            const { data: recentApps } = await supabase
              .from("applications")
              .select("id, status, applied_at, updated_at, worker_id, job_post_id, worker_profiles(first_name, last_name), job_posts(title)")
              .in("job_post_id", jobIds)
              .order("applied_at", { ascending: false })
              .limit(10);

            if (recentApps) {
              for (const app of recentApps) {
                const wp = app.worker_profiles as unknown as { first_name: string | null; last_name: string | null } | null;
                const jp = app.job_posts as unknown as { title: string } | null;
                const name = [wp?.first_name, wp?.last_name].filter(Boolean).join(" ") || "A worker";
                const jobTitle = jp?.title || "a position";

                feed.push({
                  id: `app-${app.id}`,
                  type: "new_application",
                  title: `${name} applied`,
                  subtitle: jobTitle,
                  date: app.applied_at,
                  href: "/business/applicants",
                });

                if (app.status === "accepted") {
                  feed.push({
                    id: `accepted-${app.id}`,
                    type: "offer_accepted",
                    title: `${name} accepted your offer`,
                    subtitle: jobTitle,
                    date: app.updated_at || app.applied_at,
                    href: "/business/applicants",
                  });
                }
                if (app.status === "rejected") {
                  feed.push({
                    id: `declined-${app.id}`,
                    type: "offer_declined",
                    title: `${name} declined your offer`,
                    subtitle: jobTitle,
                    date: app.updated_at || app.applied_at,
                    href: "/business/applicants",
                  });
                }
              }
            }
          }

          // Recent interviews
          const { data: recentInterviews } = await supabase
            .from("interviews")
            .select("id, status, scheduled_date, scheduled_start_time, scheduled_at, completed_at, invited_at, applications(job_post_id, job_posts(title), worker_id, worker_profiles(first_name, last_name))")
            .eq("business_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(10);

          if (recentInterviews) {
            for (const iv of recentInterviews) {
              const appData = iv.applications as unknown as { job_posts: { title: string }; worker_profiles: { first_name: string | null; last_name: string | null } } | null;
              const name = [appData?.worker_profiles?.first_name, appData?.worker_profiles?.last_name].filter(Boolean).join(" ") || "A worker";
              const jobTitle = appData?.job_posts?.title || "a position";

              if (iv.status === "scheduled") {
                feed.push({
                  id: `iv-sched-${iv.id}`,
                  type: "interview_scheduled",
                  title: `Interview booked with ${name}`,
                  subtitle: jobTitle,
                  date: iv.scheduled_at || iv.invited_at,
                  href: "/business/interviews",
                });
              }
              if (iv.status === "completed") {
                feed.push({
                  id: `iv-done-${iv.id}`,
                  type: "interview_completed",
                  title: `Interview completed with ${name}`,
                  subtitle: jobTitle,
                  date: iv.completed_at || iv.invited_at,
                  href: "/business/interviews",
                });
              }
            }
          }

          // Recent job postings
          const { data: recentJobs } = await supabase
            .from("job_posts")
            .select("id, title, status, created_at")
            .eq("business_id", profile.id)
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(5);

          if (recentJobs) {
            for (const job of recentJobs) {
              feed.push({
                id: `job-${job.id}`,
                type: "listing_published",
                title: `Published "${job.title}"`,
                subtitle: "Job listing",
                date: job.created_at,
                href: `/business/manage-listings/${job.id}`,
              });
            }
          }

          // Verification event
          if (profile.verification_status === "verified") {
            feed.push({
              id: "verified",
              type: "verified",
              title: "Business verified",
              subtitle: "Your account is now verified",
              date: profile.updated_at || profile.created_at,
              href: "/business/admin",
            });
          }

          feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setActivities(feed);
        }
      }

      setLoading(false);
    });
  }, []);

  // Fire confetti when celebration modal appears
  const fireConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    // Big initial burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
    });

    frame();
  }, []);

  useEffect(() => {
    if (showCelebration) {
      // Small delay so modal renders first
      const timer = setTimeout(fireConfetti, 300);
      return () => clearTimeout(timer);
    }
  }, [showCelebration, fireConfetti]);

  const dismissCelebration = async () => {
    setShowCelebration(false);
    // Clear the flag so it doesn't show again
    if (profileId) {
      const supabase = createClient();
      await supabase
        .from("business_profiles")
        .update({ show_verified_celebration: false })
        .eq("id", profileId);
    }
  };

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Debounced search
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!query.trim()) {
        setSearchResults([]);
        setSearchOpen(false);
        return;
      }

      debounceRef.current = setTimeout(async () => {
        if (!profileId) return;
        setSearching(true);
        const results: SearchResult[] = [];
        const q = query.toLowerCase().trim();

        try {
          const supabase = createClient();

          // Search job listings
          const { data: listings } = await supabase
            .from("job_posts")
            .select("id, title, status")
            .eq("business_id", profileId)
            .ilike("title", `%${q}%`)
            .limit(5);

          listings?.forEach((l) => {
            results.push({
              id: l.id,
              type: "listing",
              title: l.title,
              subtitle: l.status === "active" ? "Active" : l.status === "draft" ? "Draft" : l.status === "paused" ? "Paused" : "Closed",
              href: `/business/manage-listings/${l.id}`,
            });
          });

          // Search applicants — find workers by name, then match to applications
          const { data: jobIds } = await supabase
            .from("job_posts")
            .select("id")
            .eq("business_id", profileId);

          if (jobIds && jobIds.length > 0) {
            const jids = jobIds.map((j) => j.id);

            // Search by first_name or last_name using ilike
            const { data: matchingWorkers } = await supabase
              .from("worker_profiles")
              .select("id, user_id, first_name, last_name")
              .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
              .limit(20);

            if (matchingWorkers && matchingWorkers.length > 0) {
              const workerIds = matchingWorkers.map((w) => w.id);

              // Find applications from these workers for this business's jobs
              const { data: matchedApps } = await supabase
                .from("applications")
                .select("id, worker_id, job_post_id, job_posts(title)")
                .in("worker_id", workerIds)
                .in("job_post_id", jids)
                .limit(5);

              matchedApps?.forEach((a) => {
                const worker = matchingWorkers.find((w) => w.id === a.worker_id);
                const jp = a.job_posts as unknown as { title: string } | null;
                const name = [worker?.first_name, worker?.last_name].filter(Boolean).join(" ") || "Unknown";
                results.push({
                  id: a.id,
                  type: "applicant",
                  title: name,
                  subtitle: jp?.title || "Job Application",
                  href: `/business/applicants`,
                });
              });
            }
          }

          // Search resorts (from static data import or Supabase)
          const { data: resortResults } = await supabase
            .from("resorts")
            .select("id, name, country")
            .ilike("name", `%${q}%`)
            .limit(5);

          resortResults?.forEach((r) => {
            results.push({
              id: r.id,
              type: "resort",
              title: r.name,
              subtitle: r.country || "",
              href: `/resorts/${r.id}`,
            });
          });
        } catch (err) {
          console.error("Search failed:", err);
        }

        setSearchResults(results);
        setSearchOpen(true);
        setSearching(false);
      }, 300);
    },
    [profileId]
  );

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
      <div className="relative -mx-6 -mt-6 mb-8 rounded-2xl px-8 py-10 sm:px-10 sm:py-12">
        {/* Gradient background — deeper, more corporate (overflow-hidden only on bg layer) */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#132d4a]" />
          {/* Subtle geometric shapes instead of organic blobs */}
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-3xl bg-secondary/8 blur-2xl rotate-12" />
          <div className="absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-secondary/6 blur-3xl" />
          <div className="absolute right-0 bottom-0 h-24 w-24 rounded-2xl bg-highlight/5 blur-xl" />
          {/* Subtle grid pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        </div>

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
                  ) : verificationStatus === "accepted" ? (
                    <Link href="/business/company-profile" className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-300 backdrop-blur-sm transition-colors hover:bg-blue-500/30">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Accepted
                    </Link>
                  ) : verificationStatus === "pending_verification" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-semibold text-purple-300 backdrop-blur-sm">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                      Pending Verification
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
          <div ref={searchRef} className="relative mt-6 max-w-xl">
            <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
              placeholder="Search listings, applicants, resorts..."
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-10 text-sm text-white placeholder:text-white/30 backdrop-blur-sm transition-colors focus:border-secondary/40 focus:bg-white/10 focus:outline-none"
            />
            {/* Clear button */}
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/30 hover:text-white/60 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {/* Loading spinner */}
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
              </div>
            )}

            {/* Search dropdown */}
            {searchOpen && (
              <div className="absolute left-0 right-0 top-full z-[70] mt-2 max-h-80 overflow-y-auto rounded-xl border border-accent/30 bg-white shadow-2xl">
                {searchResults.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <svg className="mx-auto h-8 w-8 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="mt-2 text-sm text-foreground/50">No results found</p>
                    <p className="mt-0.5 text-xs text-foreground/30">Try a different search term</p>
                  </div>
                ) : (
                  <>
                    {/* Listings */}
                    {searchResults.filter((r) => r.type === "listing").length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Listings</p>
                        {searchResults.filter((r) => r.type === "listing").map((r) => (
                          <Link
                            key={r.id}
                            href={r.href}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/10"
                          >
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-primary">{r.title}</p>
                              <p className="text-xs text-foreground/40">{r.subtitle}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    {/* Applicants */}
                    {searchResults.filter((r) => r.type === "applicant").length > 0 && (
                      <div className={searchResults.some((r) => r.type === "listing") ? "border-t border-accent/20" : ""}>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Applicants</p>
                        {searchResults.filter((r) => r.type === "applicant").map((r) => (
                          <Link
                            key={r.id}
                            href={r.href}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/10"
                          >
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-highlight/10 text-highlight">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-primary">{r.title}</p>
                              <p className="text-xs text-foreground/40">{r.subtitle}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                    {/* Resorts */}
                    {searchResults.filter((r) => r.type === "resort").length > 0 && (
                      <div className={searchResults.some((r) => r.type !== "resort") ? "border-t border-accent/20" : ""}>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Resorts</p>
                        {searchResults.filter((r) => r.type === "resort").map((r) => (
                          <Link
                            key={r.id}
                            href={r.href}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/10"
                          >
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-warm/10 text-warm">
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-primary">{r.title}</p>
                              <p className="text-xs text-foreground/40">{r.subtitle}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Pending Registration Banner ─────────────────────────── */}
      {(verificationStatus === "pending_review" || verificationStatus === "unverified") && inLaunchLocation && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
              <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-amber-900">Registration Under Review</h3>
              <p className="mt-1 text-sm text-amber-800/70">
                Your business registration has been submitted and is being reviewed by our team. This usually takes 1–2 business days.
              </p>
              <p className="mt-2 text-sm text-amber-800/70">
                While you wait, you can <strong>set up your company profile</strong> and <strong>create draft job listings</strong>. Your profile and listings will go live once your registration is confirmed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Launching Soon Banner (non-launch locations) ─────────── */}
      {(verificationStatus === "pending_review" || verificationStatus === "unverified") && !inLaunchLocation && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-900">Launching Soon in Your Area</h3>
              <p className="mt-1 text-sm text-blue-800/70">
                Mountain Connects is currently live in {LAUNCH_LOCATION_NAMES}. We&apos;re expanding to more locations soon!
              </p>
              <p className="mt-2 text-sm text-blue-800/70">
                While you wait, you can <strong>set up your company profile</strong> and <strong>create draft job listings</strong>. You&apos;ll be ready to go live as soon as we launch in your area.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Accepted Banner ─────────────────────────────────── */}
      {verificationStatus === "accepted" && inLaunchLocation && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-900">Registration Accepted!</h3>
              <p className="mt-1 text-sm text-blue-800/70">
                Your business registration has been accepted. Apply for verification to make your business publicly visible with a verified badge.
              </p>
              <Link href="/business/company-profile" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
                Apply for Verification →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Pending Verification Banner ────────────────────── */}
      {verificationStatus === "pending_verification" && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100">
              <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-purple-900">Verification Under Review</h3>
              <p className="mt-1 text-sm text-purple-800/70">
                Your verification application is being reviewed by our team. This usually takes 1–2 business days. Once verified, your business and job listings will be publicly visible.
              </p>
            </div>
          </div>
        </div>
      )}

      {verificationStatus === "rejected" && (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-5 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-900">Registration Not Approved</h3>
              <p className="mt-1 text-sm text-red-800/70">
                Your registration was not approved. Please update your company profile and it will be re-reviewed automatically.
              </p>
              <Link href="/business/company-profile" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-red-700 hover:underline">
                Update Profile →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Tier banner ──────────────────────────────────────── */}
      {businessTier === "free" && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-secondary/20 bg-secondary/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
              <svg className="h-5 w-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">
                {isGracePeriod()
                  ? "🎉 You're enjoying Premium features for free during our launch!"
                  : "You're on the Free plan"
                }
              </p>
              <p className="text-xs text-foreground/50">
                {isGracePeriod()
                  ? "All Premium features are unlocked during the launch period."
                  : "Upgrade to Premium for unlimited jobs, analytics, and more."
                }
              </p>
            </div>
          </div>
          <Link
            href="/business/upgrade"
            className="shrink-0 rounded-lg bg-secondary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-secondary/90"
          >
            {isGracePeriod() ? "View Plans" : "Upgrade"}
          </Link>
        </div>
      )}

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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Recent Activity</h2>
          {activities.length > 8 && (
            <Link href="/business/applicants" className="text-xs font-medium text-secondary hover:text-secondary/80 transition-colors">
              View all &rarr;
            </Link>
          )}
        </div>

        {activities.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-accent/40 bg-white p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
              <svg className="h-6 w-6 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground/60">No recent activity</p>
            <p className="mt-1 text-xs text-foreground/40">Post your first job to start receiving applications.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-accent/30 rounded-2xl border border-accent/40 bg-white overflow-hidden">
            {activities.slice(0, 8).map((item) => (
              <BizActivityRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* ═══ VERIFICATION CELEBRATION MODAL ═══════════════════ */}
      {showCelebration && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md animate-in zoom-in-95 duration-300">
            {/* Card */}
            <div className="overflow-hidden rounded-3xl bg-white shadow-2xl">
              {/* Green gradient header */}
              <div className="relative bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 px-8 pt-10 pb-14 text-center">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute -left-6 -top-6 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
                  <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
                </div>
                <div className="relative">
                  {/* Big verified badge */}
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm ring-4 ring-white/30">
                    <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="mt-5 text-3xl font-extrabold text-white">
                    Congratulations!
                  </h2>
                </div>
              </div>

              {/* Content */}
              <div className="relative -mt-6 rounded-t-3xl bg-white px-8 pb-8 pt-8 text-center">
                <p className="text-lg font-bold text-primary">
                  {companyName}, you have been verified
                </p>
                <p className="mt-2 text-sm text-foreground/50">
                  Your business is now officially verified on Mountain Connects. Here&apos;s what that means:
                </p>

                {/* Benefits list */}
                <div className="mt-5 space-y-3 text-left">
                  <div className="flex items-center gap-3 rounded-xl bg-green-50 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-green-800">Verified badge on your profile and listings</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-blue-50 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                      <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-blue-800">Priority placement in employer directory</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl bg-purple-50 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                      <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-purple-800">Increased trust from seasonal workers</p>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={dismissCelebration}
                  className="mt-6 w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-green-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-green-500/30"
                >
                  Let&apos;s Go!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

/* ── Business Activity Row ────────────────────────────────── */
const BIZ_ACTIVITY_CONFIG: Record<BizActivity["type"], { icon: React.ReactNode; iconBg: string }> = {
  new_application: {
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>,
    iconBg: "bg-secondary/15 text-secondary",
  },
  interview_scheduled: {
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
    iconBg: "bg-purple-100 text-purple-600",
  },
  interview_completed: {
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    iconBg: "bg-green-100 text-green-600",
  },
  offer_accepted: {
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>,
    iconBg: "bg-amber-100 text-amber-600",
  },
  offer_declined: {
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>,
    iconBg: "bg-red-100 text-red-500",
  },
  listing_published: {
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25H5.625a2.25 2.25 0 01-2.25-2.25V8.625c0-.621.504-1.125 1.125-1.125H8.25m8.25 0v-3.375c0-.621-.504-1.125-1.125-1.125H8.625c-.621 0-1.125.504-1.125 1.125V6" /></svg>,
    iconBg: "bg-blue-100 text-blue-600",
  },
  verified: {
    icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    iconBg: "bg-green-100 text-green-600",
  },
};

function bizFormatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

function BizActivityRow({ item }: { item: BizActivity }) {
  const config = BIZ_ACTIVITY_CONFIG[item.type];
  return (
    <Link
      href={item.href}
      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/10"
    >
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${config.iconBg}`}>
        {config.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-primary">{item.title}</p>
        <p className="truncate text-xs text-foreground/50">{item.subtitle}</p>
      </div>
      <span className="flex-shrink-0 text-xs text-foreground/40">{bizFormatTimeAgo(item.date)}</span>
    </Link>
  );
}

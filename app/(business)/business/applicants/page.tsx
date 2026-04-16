"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { seedApplicants, type SeedApplicant } from "@/lib/data/applications";
import ApplicantCard from "@/components/ui/ApplicantCard";
import type { ApplicationStatus } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

type FilterStatus = "all" | ApplicationStatus;

export default function ApplicantsPage() {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [listingFilter, setListingFilter] = useState<string>("all");
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [instantInterviewId, setInstantInterviewId] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<SeedApplicant[]>([]);
  const router = useRouter();
  const [allListings, setAllListings] = useState<{ id: string; title: string }[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setPageLoading(false); return; }

        const { data: business } = await supabase
          .from("business_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (!business) { setPageLoading(false); return; }

        // Fetch all job listings for this business (for the dropdown)
        const { data: jobs } = await supabase
          .from("job_posts")
          .select("id, title")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false });

        if (jobs) {
          setAllListings(jobs.map((j) => ({ id: j.id, title: j.title })));
        }

        // Fetch applications
        const { data } = await supabase
          .from("applications")
          .select("*, job_posts(id, title, resort_id, resorts(name)), worker_profiles(id, user_id, first_name, last_name, phone, profile_photo_url, avatar_url, location_current, skills, years_seasonal_experience, bio, certifications, work_history, visa_status, work_eligible_countries, date_of_birth, nationality, languages, references, cv_url)")
          .eq("job_posts.business_id", business.id);

        if (data && data.length > 0) {
          const mapped: SeedApplicant[] = data
            .filter((a: Record<string, unknown>) => a.job_posts !== null)
            .map((a: Record<string, unknown>) => {
              const jp = a.job_posts as Record<string, unknown>;
              const resort = jp.resorts as { name: string } | null;
              const wp = a.worker_profiles as Record<string, unknown> | null;
              const firstName = (wp?.first_name as string) || "";
              const lastName = (wp?.last_name as string) || "";

              return {
                id: (wp?.id as string) || (a.worker_id as string),
                application_id: a.id as string,
                job_id: jp.id as string,
                job_title: jp.title as string,
                resort_name: resort?.name || "",
                worker_name: [firstName, lastName].filter(Boolean).join(" ") || "Unknown",
                worker_email: "",
                worker_phone: (wp?.phone as string) || null,
                worker_avatar: (wp?.avatar_url as string) || (wp?.profile_photo_url as string) || null,
                worker_location: (wp?.location_current as string) || null,
                worker_skills: (wp?.skills as string[]) || [],
                years_experience: (wp?.years_seasonal_experience as number) || 0,
                status: a.status as ApplicationStatus,
                applied_at: a.applied_at as string,
                cover_letter: (a.cover_letter as string) || "",
                languages: (wp?.languages as { language: string; proficiency: string }[]) || [],
                availability: null,
                bio: (wp?.bio as string) || null,
                certifications: (wp?.certifications as { name: string; issuing_body: string | null }[]) || [],
                work_history: (wp?.work_history as { title: string; company: string; location: string; start_date: string; end_date: string | null; description: string }[]) || [],
                education: null,
                visa_status: (wp?.visa_status as string) || null,
                work_eligible_countries: (wp?.work_eligible_countries as string[]) || null,
                date_of_birth: (wp?.date_of_birth as string) || null,
                nationality: (wp?.nationality as string) || null,
                worker_resume_url: (a.resume_url as string) || (wp?.cv_url as string) || null,
                worker_user_id: (wp?.user_id as string) || null,
              };
            });
          setApplicants(mapped);
        }
      } catch (err) {
        console.error("Failed to load applicants:", err);
      }
      setPageLoading(false);
    })();
  }, []);

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    setApplicants((prev) =>
      prev.map((a) =>
        a.application_id === applicationId
          ? { ...a, status: newStatus as ApplicationStatus }
          : a
      )
    );
    try {
      const supabase = createClient();
      await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", applicationId);

      // Send status change email to worker (non-blocking)
      fetch("/api/emails/application-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, newStatus }),
      }).catch((err) => console.error("Failed to trigger status email:", err));
    } catch {
      // Optimistic update already applied
    }
  };

  const handleMessage = async (workerUserId: string | null) => {
    if (!workerUserId) return;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: workerUserId }),
      });
      const data = await res.json();
      if (res.ok && data.conversationId) {
        router.push(`/business/messages?conv=${data.conversationId}`);
      }
    } catch (err) {
      console.error("Error starting conversation:", err);
    }
  };

  const filtered = useMemo(() => {
    let results: SeedApplicant[] = applicants;

    // Filter by listing
    if (listingFilter !== "all") {
      results = results.filter((a) => a.job_id === listingFilter);
    }

    // Filter by status
    if (filter !== "all") {
      results = results.filter((a) => a.status === filter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (a) =>
          a.worker_name.toLowerCase().includes(q) ||
          a.job_title.toLowerCase().includes(q) ||
          a.resort_name.toLowerCase().includes(q) ||
          a.worker_skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    return results;
  }, [filter, searchQuery, listingFilter, applicants]);

  const handleInvite = async (applicationId: string) => {
    setInvitingId(applicationId);
    try {
      const res = await fetch("/api/interviews/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId }),
      });
      if (res.ok) {
        handleStatusChange(applicationId, "interview");
      } else {
        const err = await res.json();
        alert(err.error || "Failed to send invitation");
      }
    } catch {
      alert("Failed to send invitation");
    }
    setInvitingId(null);
  };

  const handleInstantInterview = async (applicationId: string) => {
    setInstantInterviewId(applicationId);
    try {
      const res = await fetch("/api/interviews/instant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId }),
      });
      if (res.ok) {
        const data = await res.json();
        handleStatusChange(applicationId, "interview");
        router.push(`/business/interviews/${data.interview_id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to start instant interview");
      }
    } catch {
      alert("Failed to start instant interview");
    }
    setInstantInterviewId(null);
  };

  // Count applicants per status (respecting listing filter)
  const counts = useMemo(() => {
    const base = listingFilter === "all"
      ? applicants
      : applicants.filter((a) => a.job_id === listingFilter);

    const c = {
      all: base.length,
      new: 0,
      viewed: 0,
      interview_pending: 0,
      interview: 0,
      offered: 0,
      accepted: 0,
      rejected: 0,
    };
    for (const a of base) {
      if (a.status in c) {
        c[a.status as keyof typeof c]++;
      }
    }
    return c;
  }, [listingFilter, applicants]);

  const FILTERS: { value: FilterStatus; label: string; color: string }[] = [
    { value: "all", label: "All", color: "" },
    { value: "new", label: "New", color: "bg-blue-50 text-blue-700" },
    { value: "viewed", label: "Viewed", color: "bg-sky-50 text-sky-700" },
    { value: "interview_pending", label: "Interview Pending", color: "bg-yellow-50 text-yellow-700" },
    { value: "interview", label: "Interview", color: "bg-purple-50 text-purple-700" },
    { value: "offered", label: "Offered / Contract Sent", color: "bg-orange-50 text-orange-700" },
    { value: "accepted", label: "Accepted", color: "bg-green-50 text-green-700" },
    { value: "rejected", label: "Unsuccessful", color: "bg-red-50 text-red-700" },
  ];

  if (pageLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Corporate gradient header */}
      <div
        className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-2xl px-8 py-10 sm:px-10 sm:py-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#132d4a]" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-3xl bg-secondary/8 blur-2xl rotate-12" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-secondary/6 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-24 w-24 rounded-2xl bg-highlight/5 blur-xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <svg className="h-4 w-4 text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs font-medium uppercase tracking-widest text-secondary/70">Talent Pipeline</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Applicants</h1>
          <p className="mt-1 text-sm text-white/50">
            Review and manage applications across all your job listings.
          </p>
        </div>
      </div>

      {/* Search + Listing Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, job, resort, or skill…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-accent/40 bg-white py-2.5 pl-10 pr-4 text-sm text-primary placeholder-foreground/40 shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
        </div>
        <select
          value={listingFilter}
          onChange={(e) => setListingFilter(e.target.value)}
          className="rounded-xl border border-accent/40 bg-white px-4 py-2.5 text-sm text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        >
          <option value="all">All Listings</option>
          {allListings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </div>

      {/* Status filter tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = counts[f.value as keyof typeof counts] ?? 0;
          const isActive = filter === f.value;

          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "border border-accent/50 bg-white text-foreground/70 hover:bg-accent/20 hover:border-accent"
              }`}
            >
              {f.label}
              <span className={`ml-1.5 ${isActive ? "text-white/70" : "text-foreground/40"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results */}
      <div className="mt-6 space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-accent/40 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
              <svg className="h-6 w-6 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground/60">No applicants match your filters.</p>
            <p className="mt-1 text-xs text-foreground/40">Try adjusting your search criteria.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-foreground/40">
              Showing {filtered.length} applicant{filtered.length !== 1 ? "s" : ""}
              {listingFilter !== "all" && (
                <> for <span className="font-medium text-foreground/60">{allListings.find((l) => l.id === listingFilter)?.title}</span></>
              )}
            </p>
            {filtered.map((applicant) => (
              <ApplicantCard
                key={applicant.application_id}
                applicant={applicant}
                onInvite={handleInvite}
                inviting={invitingId === applicant.application_id}
                onStatusChange={handleStatusChange}
                onMessage={handleMessage}
                onInstantInterview={handleInstantInterview}
                instantInterviewLoading={instantInterviewId === applicant.application_id}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

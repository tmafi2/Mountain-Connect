"use client";

import { useState, useRef, useCallback } from "react";
import type { SeedApplicant } from "@/lib/data/applications";
import ResumeViewer from "@/components/ui/ResumeViewer";

// Helpers to normalize union types from seed data vs Supabase
function getLangLabel(lang: string | { language: string; proficiency: string }): string {
  return typeof lang === "string" ? lang : lang.language;
}

function getLangProficiency(lang: string | { language: string; proficiency: string }): string | null {
  return typeof lang === "string" ? null : lang.proficiency;
}

function getCertLabel(cert: string | { name: string; issuing_body: string | null }): string {
  return typeof cert === "string" ? cert : cert.name;
}

function getCertBody(cert: string | { name: string; issuing_body: string | null }): string | null {
  return typeof cert === "string" ? null : cert.issuing_body;
}

function getWorkRole(job: { role?: string; title?: string }): string {
  return job.role || job.title || "";
}

function getWorkPeriod(job: { period?: string; start_date?: string; end_date?: string | null; is_current?: boolean }): string {
  if (job.period) return job.period;
  if (job.start_date) {
    const start = formatShortDate(job.start_date);
    if (job.is_current) return `${start} – Present`;
    return job.end_date ? `${start} – ${formatShortDate(job.end_date)}` : `${start} – Present`;
  }
  return "";
}

function getWorkLocation(job: { location?: string; country?: string | null }): string | null {
  const parts = [job.location, job.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function formatShortDate(dateStr: string): string {
  // If it's already a formatted period like "2023 – 2025", return as-is
  if (dateStr.length <= 7 || !dateStr.includes("-")) return dateStr;
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

const CATEGORY_LABELS: Record<string, string> = {
  hospitality: "Hospitality",
  retail: "Retail",
  outdoor: "Outdoor / Adventure",
  food_beverage: "Food & Beverage",
  admin: "Administration",
  maintenance: "Maintenance",
  instruction: "Instruction",
  cleaning_housekeeping: "Cleaning / Housekeeping",
  other: "Other",
};

interface ApplicantCardProps {
  applicant: SeedApplicant;
  onInvite?: (applicationId: string) => void;
  inviting?: boolean;
  onStatusChange?: (applicationId: string, newStatus: string) => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-blue-50", text: "text-blue-700", label: "New" },
  viewed: { bg: "bg-sky-50", text: "text-sky-700", label: "Viewed" },
  interview_pending: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Interview Pending" },
  interview: { bg: "bg-purple-50", text: "text-purple-700", label: "Interview" },
  offered: { bg: "bg-orange-50", text: "text-orange-700", label: "Offered" },
  accepted: { bg: "bg-green-50", text: "text-green-700", label: "Accepted" },
  rejected: { bg: "bg-red-50", text: "text-red-700", label: "Rejected" },
};

export default function ApplicantCard({
  applicant,
  onInvite,
  inviting,
  onStatusChange,
}: ApplicantCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"application" | "profile" | "resume">("application");
  const [selectedJob, setSelectedJob] = useState<(typeof applicant.work_history)[number] | null>(null);
  const statusStyle = STATUS_STYLES[applicant.status] || STATUS_STYLES.new;
  const hasAutoViewed = useRef(false);

  // Auto-mark as "viewed" the first time a business interacts with this applicant
  const markViewed = useCallback(() => {
    if (applicant.status === "new" && !hasAutoViewed.current && onStatusChange) {
      hasAutoViewed.current = true;
      onStatusChange(applicant.application_id, "viewed");
    }
  }, [applicant.status, applicant.application_id, onStatusChange]);

  const handleExpand = () => {
    const opening = !expanded;
    setExpanded(opening);
    if (opening) markViewed();
  };

  const handleTabClick = (tab: "application" | "profile" | "resume") => {
    setActiveTab(tab);
    markViewed();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const initials = applicant.worker_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const canInvite =
    applicant.status === "new" || applicant.status === "viewed";

  return (
    <div className={`rounded-xl border bg-white transition-all ${expanded ? "border-secondary shadow-md" : "border-accent hover:border-secondary/50 hover:shadow-sm"}`}>
      {/* Collapsed card — clickable header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <button onClick={handleExpand} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-sm font-bold text-primary">
            {initials}
          </button>

          {/* Info */}
          <button onClick={handleExpand} className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-primary">{applicant.worker_name}</h3>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
              >
                {statusStyle.label}
              </span>
            </div>

            <p className="mt-0.5 text-sm text-foreground/60">
              {applicant.worker_location}
            </p>

            <p className="mt-1 text-xs text-foreground/40">
              Applied for <span className="font-medium text-foreground/60">{applicant.job_title}</span>
              {" · "}
              {applicant.resort_name}
            </p>

            {/* Skills */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {applicant.worker_skills.slice(0, 5).map((skill) => (
                <span
                  key={skill}
                  className="inline-flex rounded-full bg-accent/30 px-2.5 py-0.5 text-xs text-foreground/70"
                >
                  {skill}
                </span>
              ))}
              {applicant.worker_skills.length > 5 && (
                <span className="inline-flex rounded-full bg-accent/30 px-2.5 py-0.5 text-xs text-foreground/40">
                  +{applicant.worker_skills.length - 5}
                </span>
              )}
            </div>
          </button>

          {/* Quick action icons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => { setExpanded(true); handleTabClick("profile"); }}
              title="View Profile"
              className="rounded-lg p-2 text-foreground/40 hover:bg-secondary/10 hover:text-primary transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
            {applicant.worker_resume_url ? (
              <button
                onClick={() => { setExpanded(true); handleTabClick("resume"); markViewed(); }}
                title="View Resume"
                className="rounded-lg p-2 text-foreground/40 hover:bg-secondary/10 hover:text-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            ) : (
              <button
                onClick={() => { setExpanded(true); handleTabClick("resume"); }}
                title="View Resume"
                className="rounded-lg p-2 text-foreground/40 hover:bg-secondary/10 hover:text-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}
            <button
              title="Message"
              className="rounded-lg p-2 text-foreground/40 hover:bg-secondary/10 hover:text-primary transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-3 flex items-center justify-between pl-16">
          <div className="flex items-center gap-3 text-xs text-foreground/40">
            <span>{applicant.years_experience} yrs experience</span>
            <span>Applied {formatDate(applicant.applied_at)}</span>
          </div>

          {/* Expand indicator */}
          <button onClick={handleExpand}>
            <svg
              className={`h-4 w-4 text-foreground/30 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-accent">
          {/* Tab bar */}
          <div className="flex border-b border-accent/50 px-5">
            {(["application", "profile", "resume"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-secondary text-secondary"
                    : "text-foreground/50 hover:text-foreground/70"
                }`}
              >
                {tab === "application" ? "Application" : tab === "profile" ? "Profile" : "Work Experience"}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ── APPLICATION TAB ── */}
            {activeTab === "application" && (
              <div className="space-y-5">
                {/* Contact info */}
                <div className="flex flex-wrap gap-4 rounded-lg bg-accent/10 p-4">
                  <div className="flex items-center gap-2 text-sm text-foreground/70">
                    <svg className="h-4 w-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {applicant.worker_email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground/70">
                    <svg className="h-4 w-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {applicant.worker_phone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground/70">
                    <svg className="h-4 w-4 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {applicant.worker_location}
                  </div>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-lg bg-accent/15 p-3 text-center">
                    <p className="text-lg font-bold text-primary">{applicant.years_experience}</p>
                    <p className="text-[10px] uppercase tracking-wider text-foreground/50">Years Exp.</p>
                  </div>
                  <div className="rounded-lg bg-accent/15 p-3 text-center">
                    <p className="text-lg font-bold text-primary">{applicant.languages.length}</p>
                    <p className="text-[10px] uppercase tracking-wider text-foreground/50">Languages</p>
                  </div>
                  <div className="rounded-lg bg-accent/15 p-3 text-center">
                    <p className="text-lg font-bold text-primary">{applicant.certifications.length}</p>
                    <p className="text-[10px] uppercase tracking-wider text-foreground/50">Certs</p>
                  </div>
                  <div className="rounded-lg bg-accent/15 p-3 text-center">
                    <p className="text-lg font-bold text-primary">{applicant.work_history.length}</p>
                    <p className="text-[10px] uppercase tracking-wider text-foreground/50">Roles</p>
                  </div>
                </div>

                {/* Cover letter */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Cover Letter</h4>
                  <div className="mt-2 rounded-lg bg-accent/10 p-4">
                    <p className="text-sm leading-relaxed text-foreground/80">{applicant.cover_letter}</p>
                  </div>
                </div>

                {/* Availability */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Availability</h4>
                    <p className="mt-1.5 text-sm font-medium text-primary">{applicant.availability}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Visa Status</h4>
                    <p className="mt-1.5 text-sm font-medium text-primary">{applicant.visa_status}</p>
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Languages</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {applicant.languages.map((lang) => (
                      <span key={getLangLabel(lang)} className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                        {getLangLabel(lang)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── PROFILE TAB ── */}
            {activeTab === "profile" && (
              <div className="space-y-5">
                {/* Bio */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">About</h4>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/80">{applicant.bio}</p>
                </div>

                {/* Personal details */}
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-accent/10 p-4">
                  <div>
                    <p className="text-xs text-foreground/50">Nationality</p>
                    <p className="mt-0.5 text-sm font-medium text-primary">{applicant.nationality}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/50">Date of Birth</p>
                    <p className="mt-0.5 text-sm font-medium text-primary">{applicant.date_of_birth ? formatDate(applicant.date_of_birth) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/50">Location</p>
                    <p className="mt-0.5 text-sm font-medium text-primary">{applicant.worker_location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-foreground/50">Visa Status</p>
                    <p className="mt-0.5 text-sm font-medium text-primary">{applicant.visa_status}</p>
                  </div>
                </div>

                {/* Skills & Certifications */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Skills</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {applicant.worker_skills.map((skill) => (
                      <span key={skill} className="inline-flex rounded-full bg-accent/30 px-2.5 py-1 text-xs font-medium text-foreground/70">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Certifications</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {applicant.certifications.map((cert) => (
                      <span key={getCertLabel(cert)} className="inline-flex rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                        {getCertLabel(cert)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Languages</h4>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {applicant.languages.map((lang) => (
                      <span key={getLangLabel(lang)} className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {getLangLabel(lang)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── RESUME TAB ── */}
            {activeTab === "resume" && (
              <div className="space-y-5">
                {/* Resume preview & download */}
                {applicant.worker_resume_url ? (
                  <ResumeViewer
                    resumePath={applicant.worker_resume_url}
                    fileName={`${applicant.worker_name.replace(/\s+/g, "-")}-resume`}
                    variant="inline"
                  />
                ) : (
                  <div className="flex items-center gap-3 rounded-xl border border-accent/50 bg-accent/5 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-sm text-foreground/40">No resume uploaded</p>
                  </div>
                )}

                {/* Education */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Education</h4>
                  <div className="mt-2 rounded-lg border border-accent/50 p-4">
                    <p className="text-sm font-medium text-primary">{applicant.education}</p>
                  </div>
                </div>

                {/* Work history */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Work History</h4>
                  <div className="mt-2 space-y-0">
                    {applicant.work_history.map((job, i) => {
                      const location = getWorkLocation(job as { location?: string; country?: string | null });
                      const category = (job as { category?: string }).category;
                      const description = (job as { description?: string }).description;
                      const isCurrent = (job as { is_current?: boolean }).is_current;

                      return (
                        <div key={i} className="relative flex gap-4 pb-4">
                          {/* Timeline line */}
                          {i < applicant.work_history.length - 1 && (
                            <div className="absolute left-[7px] top-3 h-full w-px bg-accent" />
                          )}
                          {/* Dot */}
                          <div className={`relative mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-2 bg-white ${isCurrent ? "border-green-500" : "border-secondary"}`} />
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="flex-1 rounded-lg border border-accent/50 p-3 text-left transition-all hover:border-secondary/50 hover:bg-secondary/5 hover:shadow-sm group cursor-pointer"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-semibold text-primary group-hover:text-secondary transition-colors">{getWorkRole(job)}</p>
                                  {isCurrent && (
                                    <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">Current</span>
                                  )}
                                </div>
                                <p className="text-sm text-foreground/60">{job.company}</p>
                                {location && (
                                  <p className="mt-0.5 flex items-center gap-1 text-xs text-foreground/40">
                                    <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                                    </svg>
                                    {location}
                                  </p>
                                )}
                                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-foreground/40">{getWorkPeriod(job)}</span>
                                  {category && (
                                    <>
                                      <span className="h-3 w-px bg-foreground/15" />
                                      <span className="rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-medium text-foreground/50">
                                        {CATEGORY_LABELS[category] || category}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {description && (
                                  <p className="mt-1.5 text-xs text-foreground/40 line-clamp-1">{description}</p>
                                )}
                              </div>
                              {/* View detail arrow */}
                              <svg className="h-4 w-4 shrink-0 text-foreground/20 group-hover:text-secondary transition-colors mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Certifications */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50">Certifications</h4>
                  <div className="mt-2 space-y-2">
                    {applicant.certifications.map((cert) => (
                      <div key={getCertLabel(cert)} className="flex items-center gap-2.5 rounded-lg border border-accent/50 px-4 py-2.5">
                        <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-primary">{getCertLabel(cert)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ACTION BAR ── */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-accent pt-4">
              <div className="flex flex-wrap gap-2">
                {canInvite && onInvite && (
                  <button
                    onClick={() => onInvite(applicant.application_id)}
                    disabled={inviting}
                    className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {inviting ? "Inviting…" : "Invite to Interview"}
                  </button>
                )}
                {applicant.status === "interview" && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-4 py-2 text-xs font-medium text-purple-700">
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Interview Scheduled
                  </span>
                )}
                {applicant.status === "offered" && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-orange-50 px-4 py-2 text-xs font-medium text-orange-700">
                    Contract Sent
                  </span>
                )}
                {applicant.status !== "rejected" && applicant.status !== "accepted" && onStatusChange && (
                  <button
                    onClick={() => onStatusChange(applicant.application_id, "rejected")}
                    className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                  >
                    Decline
                  </button>
                )}
                {(applicant.status === "interview" || applicant.status === "interview_pending") && onStatusChange && (
                  <button
                    onClick={() => onStatusChange(applicant.application_id, "offered")}
                    className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100"
                  >
                    Send Offer
                  </button>
                )}
                {applicant.status === "offered" && onStatusChange && (
                  <button
                    onClick={() => onStatusChange(applicant.application_id, "accepted")}
                    className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                  >
                    Mark Accepted
                  </button>
                )}
              </div>

              <p className="text-xs text-foreground/40">Applied {formatDate(applicant.applied_at)}</p>
            </div>
          </div>
        </div>
      )}
      {/* ── WORK HISTORY DETAIL POPUP ── */}
      {selectedJob && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedJob(null)} />
          <div className="relative w-full max-w-lg rounded-2xl border border-accent/30 bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-accent/30 px-6 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-primary">{getWorkRole(selectedJob)}</h3>
                  {(selectedJob as { is_current?: boolean }).is_current && (
                    <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">Current Role</span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-foreground/60">{selectedJob.company}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="shrink-0 rounded-lg p-1.5 text-foreground/40 transition-colors hover:bg-accent/30 hover:text-foreground/70"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Period */}
                <div className="rounded-xl bg-accent/10 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Period</p>
                  <p className="mt-1 text-sm font-medium text-primary">{getWorkPeriod(selectedJob)}</p>
                </div>

                {/* Location */}
                {getWorkLocation(selectedJob as { location?: string; country?: string | null }) && (
                  <div className="rounded-xl bg-accent/10 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Location</p>
                    <p className="mt-1 text-sm font-medium text-primary flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 shrink-0 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                      {getWorkLocation(selectedJob as { location?: string; country?: string | null })}
                    </p>
                  </div>
                )}

                {/* Category */}
                {(selectedJob as { category?: string }).category && (
                  <div className="rounded-xl bg-accent/10 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Category</p>
                    <p className="mt-1 text-sm font-medium text-primary">
                      {CATEGORY_LABELS[(selectedJob as { category?: string }).category!] || (selectedJob as { category?: string }).category}
                    </p>
                  </div>
                )}

                {/* Status */}
                <div className="rounded-xl bg-accent/10 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">Status</p>
                  <p className="mt-1 text-sm font-medium text-primary">
                    {(selectedJob as { is_current?: boolean }).is_current ? (
                      <span className="text-green-600">Currently Working</span>
                    ) : (
                      <span>Completed</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Description */}
              {(selectedJob as { description?: string }).description && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/40">Role Description</h4>
                  <div className="mt-2 rounded-xl bg-accent/10 p-4">
                    <p className="text-sm leading-relaxed text-foreground/70 whitespace-pre-line">
                      {(selectedJob as { description?: string }).description}
                    </p>
                  </div>
                </div>
              )}

              {/* Verification */}
              {(selectedJob as { is_verified?: boolean }).is_verified && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3">
                  <svg className="h-4 w-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium text-green-700">This role has been verified by the employer</span>
                </div>
              )}

              {/* No description fallback */}
              {!(selectedJob as { description?: string }).description &&
               !getWorkLocation(selectedJob as { location?: string; country?: string | null }) &&
               !(selectedJob as { category?: string }).category && (
                <div className="rounded-xl border border-dashed border-accent/50 bg-accent/5 p-6 text-center">
                  <p className="text-sm text-foreground/40">No additional details provided for this role.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-accent/30 px-6 py-3 flex justify-end">
              <button
                onClick={() => setSelectedJob(null)}
                className="rounded-lg bg-accent/20 px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:bg-accent/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

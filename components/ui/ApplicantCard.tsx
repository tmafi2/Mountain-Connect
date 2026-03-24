"use client";

import type { SeedApplicant } from "@/lib/data/applications";

interface ApplicantCardProps {
  applicant: SeedApplicant;
  onInvite?: (applicationId: string) => void;
  inviting?: boolean;
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
}: ApplicantCardProps) {
  const statusStyle = STATUS_STYLES[applicant.status] || STATUS_STYLES.pending;

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
    <div className="rounded-xl border border-accent bg-white p-5 transition-all hover:border-secondary/50 hover:shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-sm font-bold text-primary">
          {initials}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
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

          {/* Bottom row */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs text-foreground/40">
              <span>{applicant.years_experience} yrs experience</span>
              <span>Applied {formatDate(applicant.applied_at)}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {canInvite && onInvite && (
                <button
                  onClick={() => onInvite(applicant.application_id)}
                  disabled={inviting}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {inviting ? "Inviting…" : "Invite to Interview"}
                </button>
              )}
              {applicant.status === "interview" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Interview Scheduled
                </span>
              )}
              {applicant.status === "offered" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700">
                  Contract Sent
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

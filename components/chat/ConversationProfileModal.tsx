"use client";

import { useEffect } from "react";
import Link from "next/link";

export interface ConversationProfile {
  otherName: string;
  otherRole: string;
  otherUserId: string;
  otherAvatarUrl: string | null;
  otherLocation: string | null;
  otherWorker: {
    workerProfileId: string;
    nationality: string | null;
    bio: string | null;
    skills: string[];
    languages: { language: string; proficiency: string }[];
    yearsExperience: number;
  } | null;
  otherBusiness: {
    businessProfileId: string;
    slug: string | null;
    description: string | null;
    yearEstablished: number | null;
  } | null;
}

interface ConversationProfileModalProps {
  profile: ConversationProfile;
  /** What kind of portal the viewer is in. Controls the "View full profile"
   *  link target and any role-specific copy. */
  viewerPortal: "business" | "worker";
  onClose: () => void;
}

export default function ConversationProfileModal({
  profile,
  viewerPortal,
  onClose,
}: ConversationProfileModalProps) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const initials =
    profile.otherName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?";

  const isFlagAvatar = !!profile.otherAvatarUrl?.startsWith("flag:");
  const flagChar = isFlagAvatar ? profile.otherAvatarUrl!.replace("flag:", "") : null;

  // Business viewer looking at a worker → show worker details + link to applicants list.
  // Worker viewer looking at a business → show business details + link to public profile.
  const fullProfileHref =
    profile.otherWorker && viewerPortal === "business"
      ? `/business/applicants?worker=${profile.otherWorker.workerProfileId}`
      : profile.otherBusiness && viewerPortal === "worker"
        ? `/business/${profile.otherBusiness.slug || profile.otherBusiness.businessProfileId}`
        : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary via-primary/95 to-secondary px-6 py-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/15 ring-2 ring-white/30">
                {flagChar ? (
                  <span className="text-3xl">{flagChar}</span>
                ) : profile.otherAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.otherAvatarUrl}
                    alt={profile.otherName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-extrabold">{initials}</span>
                )}
              </div>
              <div>
                <p className="text-lg font-bold">{profile.otherName}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                  {profile.otherRole}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/15 p-1.5 text-white/80 transition-colors hover:bg-white/25 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {profile.otherLocation && (
            <p className="mt-3 text-sm text-white/85">📍 {profile.otherLocation}</p>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {/* Worker-specific */}
          {profile.otherWorker && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground/60">
                {profile.otherWorker.nationality && (
                  <span>
                    <strong className="text-primary">From:</strong>{" "}
                    {profile.otherWorker.nationality}
                  </span>
                )}
                {profile.otherWorker.yearsExperience > 0 && (
                  <span>
                    <strong className="text-primary">Seasons:</strong>{" "}
                    {profile.otherWorker.yearsExperience}
                  </span>
                )}
              </div>

              {profile.otherWorker.bio && (
                <p className="line-clamp-3 text-sm leading-snug text-foreground/70">
                  {profile.otherWorker.bio}
                </p>
              )}

              {profile.otherWorker.skills.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                    Skills
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {profile.otherWorker.skills.slice(0, 8).map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-xs font-medium text-secondary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.otherWorker.languages.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">
                    Languages
                  </p>
                  <p className="mt-1 text-sm text-foreground/70">
                    {profile.otherWorker.languages
                      .map((l) => `${l.language}${l.proficiency ? ` (${l.proficiency})` : ""}`)
                      .join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Business-specific */}
          {profile.otherBusiness && (
            <div className="space-y-4">
              {profile.otherBusiness.description && (
                <p className="line-clamp-4 text-sm leading-snug text-foreground/70">
                  {profile.otherBusiness.description}
                </p>
              )}
              {profile.otherBusiness.yearEstablished && (
                <p className="text-xs text-foreground/50">
                  Operating since {profile.otherBusiness.yearEstablished}
                </p>
              )}
            </div>
          )}

          {/* Empty state when no extra detail is available */}
          {!profile.otherWorker && !profile.otherBusiness && (
            <p className="text-sm italic text-foreground/40">
              No additional profile details to show.
            </p>
          )}
        </div>

        {/* Footer / actions */}
        {fullProfileHref && (
          <div className="border-t border-accent/30 px-6 py-3">
            <Link
              href={fullProfileHref}
              className="block w-full rounded-lg bg-secondary px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-secondary/90"
            >
              View full profile →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

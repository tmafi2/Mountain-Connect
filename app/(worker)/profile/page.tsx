"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { WorkerProfile } from "@/types/database";

function calcCompletion(p: WorkerProfile): number {
  let filled = 0;
  let total = 0;
  const check = (v: unknown) => {
    total++;
    if (typeof v === "string" && v) filled++;
    else if (typeof v === "boolean" && v) filled++;
    else if (Array.isArray(v) && v.length > 0) filled++;
    else if (typeof v === "number" && v > 0) filled++;
  };
  check(p.first_name);
  check(p.last_name);
  check(p.date_of_birth);
  check(p.phone);
  check(p.location_current);
  check(p.country_of_residence);
  check(p.nationality);
  check(p.visa_status);
  check(p.languages);
  check(p.availability_start);
  check(p.season_preference);
  check(p.work_history);
  check(p.skills);
  check(p.preferred_job_types);
  check(p.position_type);
  check(p.bio);
  return Math.round((filled / total) * 100);
}

export default function WorkerProfilePage() {
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("worker_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) setProfile(data as WorkerProfile);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
      </div>
    );
  }

  const completion = profile ? calcCompletion(profile) : 0;
  const name = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ")
    : "";

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Profile</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Manage your worker profile, skills, and preferences.
          </p>
        </div>
        <Link
          href="/profile/edit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          Edit Profile
        </Link>
      </div>

      {/* Completion card */}
      <div className="mt-8 rounded-xl border border-accent bg-white p-8">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-2xl font-bold text-primary">
            {name ? name[0].toUpperCase() : "?"}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-primary">
              {name || "Complete your profile"}
            </h2>
            <p className="mt-1 text-sm text-foreground/60">
              {completion < 50
                ? "A complete profile helps employers find you and increases your chances of getting hired."
                : completion < 80
                ? "Looking good! A few more details will complete your profile."
                : "Your profile is looking strong!"}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 rounded-full bg-accent/30">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-secondary to-primary transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <span className="text-sm font-bold text-primary">{completion}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick summary sections */}
      {profile && (
        <div className="mt-6 space-y-4">
          {/* Location & Eligibility */}
          {(profile.location_current || profile.nationality || profile.visa_status) && (
            <div className="rounded-xl border border-accent bg-white p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50">
                Location & Eligibility
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                {profile.location_current && (
                  <div>
                    <span className="text-foreground/50">Location</span>
                    <p className="font-medium text-primary">{profile.location_current}</p>
                  </div>
                )}
                {profile.nationality && (
                  <div>
                    <span className="text-foreground/50">Nationality</span>
                    <p className="font-medium text-primary">{profile.nationality}</p>
                  </div>
                )}
                {profile.visa_status && (
                  <div>
                    <span className="text-foreground/50">Visa Status</span>
                    <p className="font-medium capitalize text-primary">
                      {profile.visa_status.replace("_", " ")}
                    </p>
                  </div>
                )}
                {profile.season_preference && (
                  <div>
                    <span className="text-foreground/50">Season</span>
                    <p className="font-medium capitalize text-primary">
                      {profile.season_preference.replace("_", " ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="rounded-xl border border-accent bg-white p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50">
                Skills
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-secondary/20 px-3 py-1.5 text-sm font-medium text-primary"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Work History */}
          {profile.work_history && profile.work_history.length > 0 && (
            <div className="rounded-xl border border-accent bg-white p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50">
                Experience
              </h3>
              <div className="mt-3 space-y-3">
                {profile.work_history.map((w, i) => (
                  <div key={i} className="border-l-2 border-secondary pl-4">
                    <p className="font-medium text-primary">{w.title}</p>
                    <p className="text-sm text-foreground/70">
                      {w.company} &middot; {w.location}
                    </p>
                    <p className="text-xs text-foreground/50">
                      {w.start_date} &ndash; {w.is_current ? "Present" : w.end_date}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="rounded-xl border border-accent bg-white p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50">
                About Me
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-foreground">
                {profile.bio}
              </p>
            </div>
          )}
        </div>
      )}

      {/* CTA if incomplete */}
      {completion < 80 && (
        <div className="mt-6 rounded-xl border-2 border-dashed border-secondary/30 bg-secondary/5 p-6 text-center">
          <p className="text-sm text-foreground/60">
            Complete your profile to stand out to employers.
          </p>
          <Link
            href="/profile/edit"
            className="mt-3 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Complete Your Profile
          </Link>
        </div>
      )}
    </div>
  );
}

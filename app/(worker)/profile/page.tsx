"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { WorkerProfile } from "@/types/database";

const COUNTRY_FLAGS: Record<string, string> = {
  "Australia": "🇦🇺", "Austria": "🇦🇹", "Argentina": "🇦🇷", "Brazil": "🇧🇷",
  "Canada": "🇨🇦", "Chile": "🇨🇱", "France": "🇫🇷", "Germany": "🇩🇪",
  "Ireland": "🇮🇪", "Italy": "🇮🇹", "Japan": "🇯🇵", "Mexico": "🇲🇽",
  "Netherlands": "🇳🇱", "New Zealand": "🇳🇿", "Norway": "🇳🇴", "Poland": "🇵🇱",
  "Portugal": "🇵🇹", "South Africa": "🇿🇦", "South Korea": "🇰🇷", "Spain": "🇪🇸",
  "Sweden": "🇸🇪", "Switzerland": "🇨🇭", "United Kingdom": "🇬🇧", "USA": "🇺🇸",
  "United States": "🇺🇸",
};

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const flagPickerRef = useRef<HTMLDivElement>(null);

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

      if (data) {
        setProfile(data as WorkerProfile);
        if ((data as WorkerProfile).profile_photo_url) {
          setAvatarUrl((data as WorkerProfile).profile_photo_url ?? null);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  // Close flag picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (flagPickerRef.current && !flagPickerRef.current.contains(e.target as Node)) {
        setShowFlagPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    const supabase = createClient();
    const fileExt = file.name.split(".").pop();
    const filePath = `avatars/${profile.user_id}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const url = urlData.publicUrl;
      await supabase.from("worker_profiles").update({ profile_photo_url: url }).eq("user_id", profile.user_id);
      setAvatarUrl(url);
    }
    setUploading(false);
  };

  const handleFlagSelect = async (flag: string) => {
    if (!profile) return;
    const supabase = createClient();
    await supabase.from("worker_profiles").update({ profile_photo_url: `flag:${flag}` }).eq("user_id", profile.user_id);
    setAvatarUrl(`flag:${flag}`);
    setShowFlagPicker(false);
  };

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
          {/* Profile picture */}
          <div className="relative" ref={flagPickerRef}>
            <div className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary/20">
              {avatarUrl && avatarUrl.startsWith("flag:") ? (
                <span className="text-4xl">{avatarUrl.replace("flag:", "")}</span>
              ) : avatarUrl ? (
                <Image src={avatarUrl} alt="Profile" fill className="object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {name ? name[0].toUpperCase() : "?"}
                </span>
              )}
              {/* Hover overlay */}
              <div
                className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => setShowFlagPicker(!showFlagPicker)}
              >
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </div>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>

            {/* Photo/Flag picker dropdown */}
            {showFlagPicker && (
              <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-accent bg-white p-3 shadow-xl">
                <button
                  onClick={() => { fileInputRef.current?.click(); setShowFlagPicker(false); }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-accent/20"
                >
                  <svg className="h-5 w-5 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Upload photo
                </button>
                <div className="my-2 h-px bg-accent" />
                <p className="px-3 py-1 text-xs font-medium text-foreground/40">Or choose a country flag</p>
                <div className="mt-1 grid max-h-40 grid-cols-6 gap-1 overflow-y-auto">
                  {Object.entries(COUNTRY_FLAGS).map(([country, flag]) => (
                    <button
                      key={country}
                      onClick={() => handleFlagSelect(flag)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-accent/20"
                      title={country}
                    >
                      {flag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
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
          {(profile.location_current || profile.country_of_residence || profile.nationality || profile.visa_status) && (
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
                {profile.country_of_residence && (
                  <div>
                    <span className="text-foreground/50">Country</span>
                    <p className="font-medium text-primary">{profile.country_of_residence}</p>
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

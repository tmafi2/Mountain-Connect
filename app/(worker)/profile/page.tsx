"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { WorkerProfile } from "@/types/database";
import ResumeViewer from "@/components/ui/ResumeViewer";

const COUNTRY_FLAGS: Record<string, string> = {
  "Australia": "🇦🇺", "Austria": "🇦🇹", "Argentina": "🇦🇷", "Brazil": "🇧🇷",
  "Canada": "🇨🇦", "Chile": "🇨🇱", "France": "🇫🇷", "Germany": "🇩🇪",
  "Ireland": "🇮🇪", "Italy": "🇮🇹", "Japan": "🇯🇵", "Mexico": "🇲🇽",
  "Netherlands": "🇳🇱", "New Zealand": "🇳🇿", "Norway": "🇳🇴", "Poland": "🇵🇱",
  "Portugal": "🇵🇹", "South Africa": "🇿🇦", "South Korea": "🇰🇷", "Spain": "🇪🇸",
  "Sweden": "🇸🇪", "Switzerland": "🇨🇭", "United Kingdom": "🇬🇧", "USA": "🇺🇸",
  "United States": "🇺🇸", "Country not listed": "🏔️",
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatLabel(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Section Card ──────────────────────────────────────── */
function Section({ icon, iconBg, title, children }: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-accent/50 bg-white/70 p-6 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-secondary/5">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

/* ─── Detail Row ────────────────────────────────────────── */
function Detail({ label, value, icon }: { label: string; value: React.ReactNode; icon?: string }) {
  return (
    <div>
      <span className="text-xs font-medium uppercase tracking-wider text-foreground/40">{label}</span>
      <p className="mt-0.5 text-sm font-medium text-primary">
        {icon && <span className="mr-1">{icon}</span>}
        {value || <span className="text-foreground/30">Not set</span>}
      </p>
    </div>
  );
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("worker_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfile(data as WorkerProfile);
        const p = data as any;
        if (p.avatar_url) setAvatarUrl(p.avatar_url);
        else if (p.profile_photo_url) setAvatarUrl(p.profile_photo_url);
      }
      setLoading(false);
    }
    load();
  }, []);

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
    const filePath = `${profile.user_id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const url = urlData.publicUrl + "?t=" + Date.now();
      await supabase.from("worker_profiles").update({ avatar_url: url, profile_photo_url: url }).eq("user_id", profile.user_id);
      setAvatarUrl(url);
    }
    setUploading(false);
  };

  const handleFlagSelect = async (flag: string) => {
    if (!profile) return;
    const supabase = createClient();
    await supabase.from("worker_profiles").update({ avatar_url: `flag:${flag}`, profile_photo_url: `flag:${flag}` }).eq("user_id", profile.user_id);
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
  const name = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") : "";

  return (
    <div className="mx-auto max-w-3xl">
      {/* Gradient header banner */}
      <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary via-primary-light to-primary px-6 pb-8 pt-8 sm:-mx-8 sm:px-8">
        <div className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-secondary/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-highlight/15 blur-3xl" />

        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
            <p className="mt-1 text-sm text-white/60">
              This is how employers will see your profile.
            </p>
          </div>
          <Link
            href="/profile/edit"
            className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-white/25 hover:shadow-lg"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Profile header card */}
      <div className="rounded-2xl border border-accent/50 bg-white/70 p-8 shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-5">
          {/* Profile picture */}
          <div className="relative" ref={flagPickerRef}>
            <div className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary/20 ring-4 ring-secondary/20">
              {avatarUrl && avatarUrl.startsWith("flag:") ? (
                <span className="text-5xl">{avatarUrl.replace("flag:", "")}</span>
              ) : avatarUrl ? (
                <Image src={avatarUrl} alt="Profile" fill className="object-cover" />
              ) : profile?.nationality && COUNTRY_FLAGS[profile.nationality] ? (
                <span className="text-5xl">{COUNTRY_FLAGS[profile.nationality]}</span>
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {name ? name[0].toUpperCase() : "?"}
                </span>
              )}
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

            {showFlagPicker && (
              <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-accent/50 bg-white/90 p-3 shadow-xl backdrop-blur-sm">
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

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-bold text-primary">
              {name || "Complete your profile"}
            </h2>
            {profile?.bio && (
              <p className="mt-1 text-sm text-foreground/60 line-clamp-2">{profile.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {profile?.location_current && (
                <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-foreground/60">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  {profile.location_current}
                </span>
              )}
              {profile?.nationality && (
                <span className="flex items-center gap-1 rounded-full bg-accent/20 px-2.5 py-1 text-foreground/60">
                  {COUNTRY_FLAGS[profile.nationality] || "🌍"} {profile.nationality}
                </span>
              )}
              {profile?.position_type && (
                <span className="rounded-full bg-secondary/10 px-2.5 py-1 font-medium text-secondary">
                  {formatLabel(profile.position_type)}
                </span>
              )}
              {profile?.season_preference && (
                <span className="rounded-full bg-highlight/10 px-2.5 py-1 font-medium text-highlight">
                  {formatLabel(profile.season_preference)} Season
                </span>
              )}
            </div>
            {/* Completion bar */}
            <div className="mt-3 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent/30">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-secondary via-highlight to-secondary transition-all duration-700"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <span className="text-xs font-bold text-primary">{completion}%</span>
            </div>
          </div>
        </div>
      </div>

      {profile && (
        <div className="mt-6 space-y-4">
          {/* ── About Me ───────────────────────────────────── */}
          {profile.bio && (
            <Section
              icon={<svg className="h-5 w-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
              iconBg="bg-secondary/15"
              title="About Me"
            >
              <p className="text-sm leading-relaxed text-foreground/80">{profile.bio}</p>
            </Section>
          )}

          {/* ── Personal Details ────────────────────────────── */}
          <Section
            icon={<svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>}
            iconBg="bg-primary/10"
            title="Personal Details"
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Detail label="First Name" value={profile.first_name} />
              <Detail label="Last Name" value={profile.last_name} />
              <Detail label="Date of Birth" value={profile.date_of_birth ? formatDate(profile.date_of_birth) : null} />
              <Detail label="Phone" value={profile.phone} />
              <Detail label="Current Location" value={profile.location_current} />
              <Detail label="Country of Residence" value={profile.country_of_residence} />
            </div>
          </Section>

          {/* ── Eligibility & Legal ────────────────────────── */}
          <Section
            icon={<svg className="h-5 w-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>}
            iconBg="bg-secondary/15"
            title="Eligibility & Legal"
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Detail label="Nationality" value={profile.nationality} icon={profile.nationality ? COUNTRY_FLAGS[profile.nationality] : undefined} />
              {profile.second_nationality && (
                <Detail label="Second Nationality" value={profile.second_nationality} icon={COUNTRY_FLAGS[profile.second_nationality]} />
              )}
              <Detail label="Visa Status" value={profile.visa_status ? formatLabel(profile.visa_status) : null} />
              {profile.visa_expiry_date && (
                <Detail label="Visa Expiry" value={formatDate(profile.visa_expiry_date)} />
              )}
              <Detail label="Driver's License" value={profile.drivers_license ? `Yes${profile.drivers_license_country ? ` (${profile.drivers_license_country})` : ""}` : profile.drivers_license === false ? "No" : null} />
              <Detail label="Has Car" value={profile.has_car === true ? "Yes" : profile.has_car === false ? "No" : null} />
            </div>
            {profile.work_eligible_countries && profile.work_eligible_countries.length > 0 && (
              <div className="mt-4">
                <span className="text-xs font-medium uppercase tracking-wider text-foreground/40">Eligible to Work In</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {profile.work_eligible_countries.map((c) => (
                    <span key={c} className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                      {COUNTRY_FLAGS[c] || ""} {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* ── Languages ──────────────────────────────────── */}
          {profile.languages && profile.languages.length > 0 && (
            <Section
              icon={<svg className="h-5 w-5 text-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" /></svg>}
              iconBg="bg-highlight/15"
              title="Languages"
            >
              <div className="flex flex-wrap gap-2">
                {profile.languages.map((lang, i) => (
                  <span key={i} className="rounded-full bg-accent/20 px-3 py-1.5 text-sm font-medium text-primary">
                    {lang.language} — <span className="text-foreground/50">{formatLabel(lang.proficiency)}</span>
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* ── Availability & Preferences ─────────────────── */}
          <Section
            icon={<svg className="h-5 w-5 text-warm" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
            iconBg="bg-warm/15"
            title="Availability & Preferences"
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Detail label="Available From" value={profile.availability_start ? formatDate(profile.availability_start) : null} />
              <Detail label="Available Until" value={profile.availability_end ? formatDate(profile.availability_end) : null} />
              <Detail label="Season Preference" value={profile.season_preference ? formatLabel(profile.season_preference) : null} />
              <Detail label="Position Type" value={profile.position_type ? formatLabel(profile.position_type) : null} />
              <Detail label="Housing Preference" value={profile.housing_preference ? formatLabel(profile.housing_preference) : null} />
              <Detail label="Willing to Relocate" value={profile.willing_to_relocate === true ? "Yes" : profile.willing_to_relocate === false ? "No" : null} />
              <Detail label="Available Immediately" value={profile.available_immediately === true ? "Yes" : profile.available_immediately === false ? "No" : null} />
              <Detail label="Available Nights" value={profile.available_nights === true ? "Yes" : profile.available_nights === false ? "No" : null} />
              <Detail label="Available Weekends" value={profile.available_weekends === true ? "Yes" : profile.available_weekends === false ? "No" : null} />
              <Detail label="Open to Second Job" value={profile.open_to_second_job === true ? "Yes" : profile.open_to_second_job === false ? "No" : null} />
            </div>
            {profile.preferred_countries && profile.preferred_countries.length > 0 && (
              <div className="mt-4">
                <span className="text-xs font-medium uppercase tracking-wider text-foreground/40">Preferred Countries</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {profile.preferred_countries.map((c) => (
                    <span key={c} className="rounded-full bg-warm/10 px-2.5 py-1 text-xs font-medium text-warm">
                      {COUNTRY_FLAGS[c] || "🌍"} {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {profile.preferred_days && profile.preferred_days.length > 0 && (
              <div className="mt-4">
                <span className="text-xs font-medium uppercase tracking-wider text-foreground/40">Preferred Days</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {profile.preferred_days.map((d) => (
                    <span key={d} className="rounded-full bg-accent/20 px-2.5 py-1 text-xs font-medium text-primary">{d}</span>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* ── Skills ─────────────────────────────────────── */}
          {profile.skills && profile.skills.length > 0 && (
            <Section
              icon={<svg className="h-5 w-5 text-highlight" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
              iconBg="bg-highlight/15"
              title="Skills"
            >
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span key={s} className="rounded-full bg-secondary/15 px-3 py-1.5 text-sm font-medium text-primary">
                    {s}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* ── Job Types ──────────────────────────────────── */}
          {profile.preferred_job_types && profile.preferred_job_types.length > 0 && (
            <Section
              icon={<svg className="h-5 w-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>}
              iconBg="bg-secondary/15"
              title="Preferred Job Types"
            >
              <div className="flex flex-wrap gap-2">
                {profile.preferred_job_types.map((j) => (
                  <span key={j} className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                    {formatLabel(j)}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* ── Work History ───────────────────────────────── */}
          {profile.work_history && profile.work_history.length > 0 && (
            <Section
              icon={<svg className="h-5 w-5 text-warm" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
              iconBg="bg-warm/15"
              title="Work Experience"
            >
              {profile.years_seasonal_experience && (
                <p className="mb-4 text-sm text-foreground/60">
                  <span className="font-semibold text-primary">{profile.years_seasonal_experience}</span> years of seasonal experience
                </p>
              )}
              <div className="space-y-4">
                {profile.work_history.map((w, i) => (
                  <div key={i} className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-primary">{w.title}</p>
                        <p className="text-sm text-foreground/70">{w.company}</p>
                      </div>
                      {w.is_current && (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">Current</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground/50">
                      {w.location && (
                        <span className="flex items-center gap-1">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                          {w.location}
                        </span>
                      )}
                      <span>{w.start_date} — {w.is_current ? "Present" : w.end_date}</span>
                    </div>
                    {w.description && (
                      <p className="mt-2 text-sm leading-relaxed text-foreground/60">{w.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Certifications ─────────────────────────────── */}
          {profile.certifications && profile.certifications.length > 0 && (
            <Section
              icon={<svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg>}
              iconBg="bg-green-500/10"
              title="Certifications"
            >
              <div className="space-y-3">
                {profile.certifications.map((cert, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50">
                      <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-primary">{cert.name}</p>
                      <p className="text-xs text-foreground/50">
                        {cert.issuing_body}{cert.date_obtained ? ` — ${cert.date_obtained}` : ""}
                        {cert.expiry_date ? ` (Expires: ${cert.expiry_date})` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── References ──────────────────────────────────── */}
          {profile.references && profile.references.length > 0 && (
            <Section
              icon={<svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
              iconBg="bg-blue-500/10"
              title="References"
            >
              <div className="space-y-3">
                {profile.references.map((ref: { id: string; name: string; relationship: string; type: string; company: string | null; job_title: string | null; email: string; phone: string | null; notes: string | null }, i: number) => (
                  <div key={ref.id || i} className="rounded-xl border border-accent/30 bg-accent/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ref.type === "professional" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                        {ref.type === "professional" ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-primary">{ref.name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ref.type === "professional" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}`}>
                            {ref.type === "professional" ? "Professional" : "Personal"}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/70">{ref.relationship}{ref.company ? ` at ${ref.company}` : ""}</p>
                        {ref.job_title && <p className="text-xs text-foreground/50">{ref.job_title}</p>}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground/50">
                          <span className="flex items-center gap-1">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                            {ref.email}
                          </span>
                          {ref.phone && (
                            <span className="flex items-center gap-1">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                              {ref.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Documents ──────────────────────────────────── */}
          {(profile.cv_url || profile.cover_letter_url) && (
            <Section
              icon={<svg className="h-5 w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>}
              iconBg="bg-primary/10"
              title="Documents"
            >
              <div className="flex flex-wrap gap-3">
                {profile.cv_url && (
                  <ResumeViewer
                    resumePath={profile.cv_url}
                    fileName="Resume / CV"
                    variant="button"
                  />
                )}
                {profile.cover_letter_url && (
                  <ResumeViewer
                    resumePath={profile.cover_letter_url}
                    fileName="Cover Letter"
                    variant="button"
                  />
                )}
              </div>
            </Section>
          )}

          {/* ── Additional Info ─────────────────────────────── */}
          {(profile.housing_needs_description || profile.traveling_with_partner || profile.traveling_with_pets) && (
            <Section
              icon={<svg className="h-5 w-5 text-warm" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" /></svg>}
              iconBg="bg-warm/15"
              title="Additional Info"
            >
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                {profile.traveling_with_partner !== null && (
                  <Detail label="Traveling with Partner" value={profile.traveling_with_partner ? "Yes" : "No"} />
                )}
                {profile.traveling_with_pets !== null && (
                  <Detail label="Traveling with Pets" value={profile.traveling_with_pets ? "Yes" : "No"} />
                )}
              </div>
              {profile.housing_needs_description && (
                <div className="mt-4">
                  <span className="text-xs font-medium uppercase tracking-wider text-foreground/40">Housing Notes</span>
                  <p className="mt-1 text-sm text-foreground/70">{profile.housing_needs_description}</p>
                </div>
              )}
            </Section>
          )}
        </div>
      )}

      {/* CTA if incomplete */}
      {completion < 80 && (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-secondary/30 bg-gradient-to-br from-secondary/5 to-highlight/5 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/15">
            <svg className="h-6 w-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-primary">
            Complete your profile to stand out to employers.
          </p>
          <p className="mt-1 text-xs text-foreground/50">
            Profiles with 80%+ completion get 3x more employer views.
          </p>
          <Link
            href="/profile/edit"
            className="mt-4 inline-block rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
          >
            Complete Your Profile
          </Link>
        </div>
      )}
    </div>
  );
}

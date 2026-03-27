"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  VisaStatus,
  SeasonPreference,
  HousingPreference,
  PositionType,
  LanguageProficiency,
  WorkHistoryEntry,
  Certification,
} from "@/types/database";

/* ─── step definitions ────────────────────────────────────── */
const STEPS = [
  "Core Info",
  "Eligibility",
  "Availability",
  "Experience",
  "Preferences",
  "Community",
  "Review",
] as const;

type Step = (typeof STEPS)[number];

/* ─── form state ──────────────────────────────────────────── */
interface FormState {
  // Core
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string;
  location_current: string;
  country_of_residence: string;

  // Eligibility
  nationality: string;
  second_nationality: string;
  visa_status: VisaStatus | "";
  visa_expiry_date: string;
  work_eligible_countries: string[];
  languages: LanguageProficiency[];
  drivers_license: boolean;
  drivers_license_country: string;
  has_car: boolean;

  // Availability
  availability_start: string;
  availability_end: string;
  season_preference: SeasonPreference | "";
  preferred_countries: string[];
  housing_preference: HousingPreference | "";
  willing_to_relocate: boolean;
  available_immediately: boolean;

  // Experience
  work_history: WorkHistoryEntry[];
  certifications: Certification[];
  skills: string[];
  years_seasonal_experience: string;

  // Preferences
  preferred_job_types: string[];
  pay_currency: string;
  available_nights: boolean;
  available_weekends: boolean;
  position_type: PositionType | "";
  open_to_second_job: boolean;

  // Community
  bio: string;
  housing_needs_description: string;
  traveling_with_partner: boolean;
  traveling_with_pets: boolean;

  // Avatar
  avatar_url: string;
}

const INITIAL: FormState = {
  first_name: "",
  last_name: "",
  date_of_birth: "",
  phone: "",
  location_current: "",
  country_of_residence: "",

  nationality: "",
  second_nationality: "",
  visa_status: "",
  visa_expiry_date: "",
  work_eligible_countries: [],
  languages: [],
  drivers_license: false,
  drivers_license_country: "",
  has_car: false,

  availability_start: "",
  availability_end: "",
  season_preference: "",
  preferred_countries: [],
  housing_preference: "",
  willing_to_relocate: false,
  available_immediately: false,

  work_history: [],
  certifications: [],
  skills: [],
  years_seasonal_experience: "",

  preferred_job_types: [],
  pay_currency: "USD",
  available_nights: false,
  available_weekends: false,
  position_type: "",
  open_to_second_job: false,

  bio: "",
  housing_needs_description: "",
  traveling_with_partner: false,
  traveling_with_pets: false,

  avatar_url: "",
};

/* ─── option lists ────────────────────────────────────────── */
const VISA_OPTIONS: { value: VisaStatus; label: string }[] = [
  { value: "citizen", label: "Citizen" },
  { value: "permanent_resident", label: "Permanent Resident" },
  { value: "working_holiday", label: "Working Holiday Visa" },
  { value: "work_visa", label: "Work Visa" },
  { value: "student_visa", label: "Student Visa" },
  { value: "no_visa", label: "No Visa" },
  { value: "other", label: "Other" },
];

const SEASON_OPTIONS: { value: SeasonPreference; label: string }[] = [
  { value: "northern_winter", label: "Northern Winter (Nov–Apr)" },
  { value: "southern_winter", label: "Southern Winter (Jun–Oct)" },
  { value: "both", label: "Both Hemispheres" },
  { value: "year_round", label: "Year Round" },
];

const HOUSING_OPTIONS: { value: HousingPreference; label: string }[] = [
  { value: "staff_housing", label: "Staff Housing" },
  { value: "private_rental", label: "Private Rental" },
  { value: "shared_rental", label: "Shared Rental" },
  { value: "van_vehicle", label: "Van / Vehicle" },
  { value: "no_preference", label: "No Preference" },
];

const POSITION_OPTIONS: { value: PositionType; label: string }[] = [
  { value: "full_time", label: "Full Time" },
  { value: "part_time", label: "Part Time" },
  { value: "casual", label: "Casual" },
];

const JOB_TYPE_OPTIONS = [
  "Ski Instructor",
  "Snowboard Instructor",
  "Lift Operator",
  "Ski Patrol",
  "Rental Tech",
  "Hospitality",
  "Food & Beverage",
  "Bartender",
  "Chef / Cook",
  "Hotel / Front Desk",
  "Housekeeping",
  "Retail",
  "Childcare",
  "Maintenance",
  "Snow Grooming",
  "Admin / Office",
  "Marketing",
  "Events",
  "Other",
];

const WORK_CATEGORIES = [
  { value: "hospitality", label: "Hospitality" },
  { value: "retail", label: "Retail" },
  { value: "outdoor", label: "Outdoor / On-Mountain" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "cleaning_housekeeping", label: "Cleaning / Housekeeping" },
  { value: "admin", label: "Admin / Office" },
  { value: "maintenance", label: "Maintenance" },
  { value: "instruction", label: "Instruction / Teaching" },
  { value: "other", label: "Other" },
] as const;

const PROFICIENCY_OPTIONS = [
  { value: "native", label: "Native" },
  { value: "fluent", label: "Fluent" },
  { value: "conversational", label: "Conversational" },
  { value: "basic", label: "Basic" },
] as const;

const CURRENCY_OPTIONS = ["USD", "EUR", "GBP", "AUD", "NZD", "CAD", "JPY", "CHF"];

/* ─── countries with flags ─────────────────────────────────── */
const COUNTRIES: { name: string; flag: string; code: string }[] = [
  { name: "Argentina", flag: "🇦🇷", code: "ar" },
  { name: "Australia", flag: "🇦🇺", code: "au" },
  { name: "Austria", flag: "🇦🇹", code: "at" },
  { name: "Belgium", flag: "🇧🇪", code: "be" },
  { name: "Brazil", flag: "🇧🇷", code: "br" },
  { name: "Bulgaria", flag: "🇧🇬", code: "bg" },
  { name: "Canada", flag: "🇨🇦", code: "ca" },
  { name: "Chile", flag: "🇨🇱", code: "cl" },
  { name: "China", flag: "🇨🇳", code: "cn" },
  { name: "Colombia", flag: "🇨🇴", code: "co" },
  { name: "Croatia", flag: "🇭🇷", code: "hr" },
  { name: "Czech Republic", flag: "🇨🇿", code: "cz" },
  { name: "Denmark", flag: "🇩🇰", code: "dk" },
  { name: "Ecuador", flag: "🇪🇨", code: "ec" },
  { name: "Finland", flag: "🇫🇮", code: "fi" },
  { name: "France", flag: "🇫🇷", code: "fr" },
  { name: "Germany", flag: "🇩🇪", code: "de" },
  { name: "Greece", flag: "🇬🇷", code: "gr" },
  { name: "Hungary", flag: "🇭🇺", code: "hu" },
  { name: "India", flag: "🇮🇳", code: "in" },
  { name: "Indonesia", flag: "🇮🇩", code: "id" },
  { name: "Ireland", flag: "🇮🇪", code: "ie" },
  { name: "Israel", flag: "🇮🇱", code: "il" },
  { name: "Italy", flag: "🇮🇹", code: "it" },
  { name: "Japan", flag: "🇯🇵", code: "jp" },
  { name: "Malaysia", flag: "🇲🇾", code: "my" },
  { name: "Mexico", flag: "🇲🇽", code: "mx" },
  { name: "Netherlands", flag: "🇳🇱", code: "nl" },
  { name: "New Zealand", flag: "🇳🇿", code: "nz" },
  { name: "Norway", flag: "🇳🇴", code: "no" },
  { name: "Peru", flag: "🇵🇪", code: "pe" },
  { name: "Philippines", flag: "🇵🇭", code: "ph" },
  { name: "Poland", flag: "🇵🇱", code: "pl" },
  { name: "Portugal", flag: "🇵🇹", code: "pt" },
  { name: "Romania", flag: "🇷🇴", code: "ro" },
  { name: "Singapore", flag: "🇸🇬", code: "sg" },
  { name: "Slovakia", flag: "🇸🇰", code: "sk" },
  { name: "Slovenia", flag: "🇸🇮", code: "si" },
  { name: "South Africa", flag: "🇿🇦", code: "za" },
  { name: "South Korea", flag: "🇰🇷", code: "kr" },
  { name: "Spain", flag: "🇪🇸", code: "es" },
  { name: "Sweden", flag: "🇸🇪", code: "se" },
  { name: "Switzerland", flag: "🇨🇭", code: "ch" },
  { name: "Thailand", flag: "🇹🇭", code: "th" },
  { name: "Turkey", flag: "🇹🇷", code: "tr" },
  { name: "United Kingdom", flag: "🇬🇧", code: "gb" },
  { name: "United States", flag: "🇺🇸", code: "us" },
  { name: "Uruguay", flag: "🇺🇾", code: "uy" },
  { name: "Venezuela", flag: "🇻🇪", code: "ve" },
  { name: "Country not listed", flag: "🏔️", code: "xx" },
];

function getCountryFlag(countryName: string): string | null {
  if (!countryName) return null;
  const c = COUNTRIES.find((c) => c.name.toLowerCase() === countryName.trim().toLowerCase());
  return c?.flag || null;
}

function getFlagUrl(countryName: string): string | null {
  if (!countryName) return null;
  const c = COUNTRIES.find((c) => c.name.toLowerCase() === countryName.trim().toLowerCase());
  return c ? `https://flagcdn.com/w160/${c.code}.png` : null;
}

/* ─── helpers ─────────────────────────────────────────────── */
function toggleInArray(arr: string[], item: string) {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

function calcCompletion(f: FormState): number {
  let filled = 0;
  let total = 0;
  const check = (v: unknown) => {
    total++;
    if (typeof v === "string" && v) filled++;
    else if (typeof v === "boolean" && v) filled++;
    else if (Array.isArray(v) && v.length > 0) filled++;
    else if (typeof v === "number" && v > 0) filled++;
  };
  check(f.first_name);
  check(f.last_name);
  check(f.date_of_birth);
  check(f.phone);
  check(f.location_current);
  check(f.country_of_residence);
  check(f.nationality);
  check(f.visa_status);
  check(f.languages);
  check(f.availability_start);
  check(f.season_preference);
  check(f.work_history);
  check(f.skills);
  check(f.preferred_job_types);
  check(f.position_type);
  check(f.bio);
  return Math.round((filled / total) * 100);
}

/* ─── shared UI components ────────────────────────────────── */
function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-primary">
      {children}
    </label>
  );
}

function Input({
  id,
  type = "text",
  placeholder,
  value,
  onChange,
}: {
  id: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
    />
  );
}

function Select({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
    >
      {children}
    </select>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-accent"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-accent bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-foreground/60">{description}</p>
      )}
      <div className="mt-5 space-y-5">{children}</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  PAGE COMPONENT                                            */
/* ═══════════════════════════════════════════════════════════ */
export default function ProfileEditPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // Language temp state
  const [newLang, setNewLang] = useState("");
  const [newLangProf, setNewLangProf] = useState<LanguageProficiency["proficiency"]>("conversational");

  // Skill temp state
  const [newSkill, setNewSkill] = useState("");

  // Country temp state
  const [newCountry, setNewCountry] = useState("");

  // Work eligible country temp state
  const [newEligibleCountry, setNewEligibleCountry] = useState("");

  // Certification temp state
  const [newCert, setNewCert] = useState<Certification>({
    name: "",
    issuing_body: null,
    date_obtained: null,
    expiry_date: null,
    credential_url: null,
  });

  // Work history temp state
  const [newWork, setNewWork] = useState<Partial<WorkHistoryEntry>>({
    title: "",
    company: "",
    location: "",
    country: "",
    start_date: "",
    end_date: "",
    is_current: false,
    description: "",
    category: "hospitality",
  });

  // Verified business search state
  const [businessQuery, setBusinessQuery] = useState("");
  const [businessResults, setBusinessResults] = useState<{ id: string; name: string; location: string; verified: boolean }[]>([]);
  const [businessSearchOpen, setBusinessSearchOpen] = useState(false);
  const [isVerifiedBusiness, setIsVerifiedBusiness] = useState(false);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  // Ski resort search state
  const [resortQuery, setResortQuery] = useState("");
  const [resortResults, setResortResults] = useState<{ id: string; name: string; country: string }[]>([]);
  const [resortSearchOpen, setResortSearchOpen] = useState(false);
  const [selectedResortName, setSelectedResortName] = useState("");
  const [selectedResortId, setSelectedResortId] = useState<string | null>(null);

  // Work history editing state
  const [editingWorkIndex, setEditingWorkIndex] = useState<number | null>(null);
  const [expandedWorkIndex, setExpandedWorkIndex] = useState<number | null>(null);

  // Document upload state
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [coverLetterUrl, setCoverLetterUrl] = useState<string | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [coverLetterUploading, setCoverLetterUploading] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string | null>(null);
  const [coverLetterFileName, setCoverLetterFileName] = useState<string | null>(null);

  // Avatar upload state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isOAuthUser, setIsOAuthUser] = useState(false);

  const supabaseClientRef = useRef(createClient());
  const supabaseClient = supabaseClientRef.current;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

  async function uploadDocument(file: File, type: "resume" | "cover_letter") {
    if (!userId) return;
    if (file.size > MAX_FILE_SIZE) { alert("File must be under 5MB"); return; }
    if (!ALLOWED_TYPES.includes(file.type)) { alert("Please upload a PDF, DOC, or DOCX file"); return; }

    const isResume = type === "resume";
    isResume ? setResumeUploading(true) : setCoverLetterUploading(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const path = `${userId}/${type}.${ext}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("documents")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Save path to profile
      const columnName = isResume ? "resume_url" : "cover_letter_url";
      await supabaseClient.from("worker_profiles").update({ [columnName]: path }).eq("user_id", userId);

      if (isResume) { setResumeUrl(path); setResumeFileName(file.name); }
      else { setCoverLetterUrl(path); setCoverLetterFileName(file.name); }
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(`Upload failed: ${err?.message || err?.error || JSON.stringify(err)}`);
    } finally {
      isResume ? setResumeUploading(false) : setCoverLetterUploading(false);
    }
  }

  async function removeDocument(type: "resume" | "cover_letter") {
    if (!userId) return;
    const isResume = type === "resume";
    const currentPath = isResume ? resumeUrl : coverLetterUrl;

    if (currentPath) {
      await supabaseClient.storage.from("documents").remove([currentPath]);
    }

    const columnName = isResume ? "resume_url" : "cover_letter_url";
    await supabaseClient.from("worker_profiles").update({ [columnName]: null }).eq("user_id", userId);

    if (isResume) { setResumeUrl(null); setResumeFileName(null); }
    else { setCoverLetterUrl(null); setCoverLetterFileName(null); }
  }

  async function downloadDocument(type: "resume" | "cover_letter") {
    const path = type === "resume" ? resumeUrl : coverLetterUrl;
    if (!path) return;

    const { data, error } = await supabaseClient.storage.from("documents").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { alert("Could not generate download link"); return; }
    window.open(data.signedUrl, "_blank");
  }

  const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB
  const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

  async function uploadAvatar(file: File) {
    if (!userId) return;
    if (file.size > AVATAR_MAX_SIZE) { alert("Photo must be under 2MB"); return; }
    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) { alert("Please upload a JPEG, PNG, or WebP image"); return; }

    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabaseClient.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabaseClient.storage
        .from("avatars")
        .getPublicUrl(path);

      // Add cache-buster to force refresh
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Save to profile
      await supabaseClient.from("worker_profiles").update({ avatar_url: urlWithCacheBust }).eq("user_id", userId);
      setAvatarUrl(urlWithCacheBust);
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      alert(`Upload failed: ${err?.message || err?.error || JSON.stringify(err)}`);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function removeAvatar() {
    if (!userId) return;
    try {
      // Remove all possible avatar files
      const extensions = ["jpg", "jpeg", "png", "webp"];
      const paths = extensions.map((ext) => `${userId}/avatar.${ext}`);
      await supabaseClient.storage.from("avatars").remove(paths);

      await supabaseClient.from("worker_profiles").update({ avatar_url: null }).eq("user_id", userId);
      setAvatarUrl(null);
    } catch (err: any) {
      console.error("Remove avatar error:", err);
      alert("Failed to remove photo. Please try again.");
    }
  }

  async function handleChangePassword() {
    setPasswordMessage(null);

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setPasswordSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordMessage({ type: "success", text: "Password updated successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPasswordMessage({ type: "error", text: err?.message || "Failed to update password." });
    } finally {
      setPasswordSaving(false);
    }
  }

  // Debounced business search
  useEffect(() => {
    if (businessQuery.length < 1) { setBusinessResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-businesses?q=${encodeURIComponent(businessQuery)}`);
        const data = await res.json();
        setBusinessResults(data);
        setBusinessSearchOpen(data.length > 0);
      } catch { setBusinessResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [businessQuery]);

  // Debounced resort search
  useEffect(() => {
    if (resortQuery.length < 1) { setResortResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-resorts?q=${encodeURIComponent(resortQuery)}`);
        const data = await res.json();
        setResortResults(data);
        setResortSearchOpen(data.length > 0);
      } catch { setResortResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [resortQuery]);

  /* ─── load existing profile on mount ─────────────────────── */
  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      // Detect OAuth users (they don't have email provider)
      const isOAuth = user.app_metadata?.provider !== "email" && user.app_metadata?.provider !== undefined;
      setIsOAuthUser(isOAuth);

      const { data: profile } = await supabase
        .from("worker_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profile) {
        setForm({
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          date_of_birth: profile.date_of_birth || "",
          phone: profile.phone || "",
          location_current: profile.location_current || "",
          country_of_residence: profile.country_of_residence || "",
          nationality: profile.nationality || "",
          second_nationality: profile.second_nationality || "",
          visa_status: profile.visa_status || "",
          visa_expiry_date: profile.visa_expiry_date || "",
          work_eligible_countries: profile.work_eligible_countries || [],
          languages: profile.languages || [],
          drivers_license: profile.drivers_license || false,
          drivers_license_country: profile.drivers_license_country || "",
          has_car: profile.has_car || false,
          availability_start: profile.availability_start || "",
          availability_end: profile.availability_end || "",
          season_preference: profile.season_preference || "",
          preferred_countries: profile.preferred_countries || [],
          housing_preference: profile.housing_preference || "",
          willing_to_relocate: profile.willing_to_relocate || false,
          available_immediately: profile.available_immediately || false,
          work_history: profile.work_history || [],
          certifications: profile.certifications || [],
          skills: profile.skills || [],
          years_seasonal_experience: profile.years_seasonal_experience?.toString() || "",
          preferred_job_types: profile.preferred_job_types || [],
          pay_currency: profile.pay_currency || "USD",
          available_nights: profile.available_nights || false,
          available_weekends: profile.available_weekends || false,
          position_type: profile.position_type || "",
          open_to_second_job: profile.open_to_second_job || false,
          bio: profile.bio || "",
          housing_needs_description: profile.housing_needs_description || "",
          traveling_with_partner: profile.traveling_with_partner || false,
          traveling_with_pets: profile.traveling_with_pets || false,
          avatar_url: profile.avatar_url || "",
        });

        // Load avatar URL
        if (profile.avatar_url) {
          setAvatarUrl(profile.avatar_url);
        }

        // Load document URLs
        if (profile.resume_url) {
          setResumeUrl(profile.resume_url);
          setResumeFileName(profile.resume_url.split("/").pop() || "resume");
        }
        if (profile.cover_letter_url) {
          setCoverLetterUrl(profile.cover_letter_url);
          setCoverLetterFileName(profile.cover_letter_url.split("/").pop() || "cover_letter");
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  /* ─── save profile to Supabase ───────────────────────────── */
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const saveToSupabase = async (redirect?: boolean) => {
    if (!userId) return;
    setSaving(true);

    const supabase = createClient();
    const completion = calcCompletion(form);

    const { error } = await supabase
      .from("worker_profiles")
      .upsert({
        user_id: userId,
        first_name: form.first_name || null,
        last_name: form.last_name || null,
        date_of_birth: form.date_of_birth || null,
        phone: form.phone || null,
        location_current: form.location_current || null,
        country_of_residence: form.country_of_residence || null,
        nationality: form.nationality || null,
        second_nationality: form.second_nationality || null,
        visa_status: form.visa_status || null,
        visa_expiry_date: form.visa_expiry_date && form.visa_expiry_date !== "n/a" ? form.visa_expiry_date : null,
        work_eligible_countries: form.work_eligible_countries,
        languages: form.languages,
        drivers_license: form.drivers_license,
        drivers_license_country: form.drivers_license_country || null,
        has_car: form.has_car,
        availability_start: form.availability_start || null,
        availability_end: form.availability_end || null,
        season_preference: form.season_preference || null,
        preferred_countries: form.preferred_countries,
        housing_preference: form.housing_preference || null,
        willing_to_relocate: form.willing_to_relocate,
        available_immediately: form.available_immediately,
        work_history: form.work_history,
        certifications: form.certifications,
        skills: form.skills,
        years_seasonal_experience: form.years_seasonal_experience ? parseInt(form.years_seasonal_experience) : null,
        preferred_job_types: form.preferred_job_types,
        pay_currency: form.pay_currency || null,
        available_nights: form.available_nights,
        available_weekends: form.available_weekends,
        position_type: form.position_type || null,
        open_to_second_job: form.open_to_second_job,
        bio: form.bio || null,
        housing_needs_description: form.housing_needs_description || null,
        traveling_with_partner: form.traveling_with_partner,
        traveling_with_pets: form.traveling_with_pets,
        avatar_url: avatarUrl || null,
        profile_completion_pct: completion,
      }, { onConflict: "user_id" });

    setSaving(false);

    if (error) {
      console.error("Save error:", error);
      alert("Failed to save profile. Please try again.");
    } else {
      setLastSaved(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      if (redirect) {
        router.push("/profile");
      }
    }
  };

  // Legacy name for the final save button
  const handleSave = () => saveToSupabase(true);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const step = STEPS[currentStep];
  const completion = calcCompletion(form);

  // Auto-save when navigating between steps
  const next = () => {
    saveToSupabase();
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prev = () => {
    saveToSupabase();
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  /* ─── loading state ──────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
          <p className="text-sm text-foreground/50">Loading your profile...</p>
        </div>
      </div>
    );
  }

  /* ─── render step content ───────────────────────────────── */
  function renderStep(step: Step) {
    switch (step) {
      /* ── CORE INFO ─────────────────────────────────────── */
      case "Core Info":
        return <>
          <SectionCard
            title="Core Account Info"
            description="Let's start with the basics. This information helps employers identify you."
          >
            {/* Profile photo upload */}
            <div>
              <Label>Profile Photo</Label>
              <p className="mt-0.5 text-xs text-foreground/50">JPEG, PNG, or WebP. Max 2MB.</p>
              <div className="mt-2 flex items-center gap-4">
                {/* Avatar preview with camera overlay on hover */}
                <label className="group relative h-20 w-20 flex-shrink-0 cursor-pointer">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile photo"
                      className="h-20 w-20 rounded-full object-cover border-2 border-accent"
                    />
                  ) : getCountryFlag(form.nationality) ? (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent bg-accent/20">
                      <span className="text-4xl">{getCountryFlag(form.nationality)}</span>
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/40 text-2xl font-semibold text-foreground/40">
                      {form.first_name && form.last_name
                        ? `${form.first_name[0]}${form.last_name[0]}`.toUpperCase()
                        : form.first_name
                          ? form.first_name[0].toUpperCase()
                          : "?"}
                    </div>
                  )}
                  {/* Camera icon overlay on hover */}
                  {!avatarUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/40">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
                      </svg>
                    </div>
                  )}
                  {avatarUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadAvatar(file);
                      e.target.value = "";
                    }}
                    disabled={avatarUploading}
                  />
                </label>
                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer rounded-lg border border-accent bg-white px-4 py-2 text-center text-sm font-medium text-foreground transition-colors hover:border-secondary hover:text-primary">
                    {avatarUrl ? "Replace Photo" : "Upload Photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadAvatar(file);
                        e.target.value = "";
                      }}
                      disabled={avatarUploading}
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input id="first_name" value={form.first_name} onChange={(v) => set("first_name", v)} placeholder="John" />
              </div>
              <div>
                <Label htmlFor="last_name">Last Name *</Label>
                <Input id="last_name" value={form.last_name} onChange={(v) => set("last_name", v)} placeholder="Smith" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="dob">Date of Birth</Label>
                <Input id="dob" type="date" value={form.date_of_birth} onChange={(v) => set("date_of_birth", v)} />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+1 555 123 4567" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="location">Current Location</Label>
                <Input id="location" value={form.location_current} onChange={(v) => set("location_current", v)} placeholder="Vancouver, BC" />
              </div>
              <div>
                <Label htmlFor="country_res">Country of Residence</Label>
                <Input id="country_res" value={form.country_of_residence} onChange={(v) => set("country_of_residence", v)} placeholder="Canada" />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Account Settings"
            description="Manage your account security"
          >
            <div className="space-y-4">
              {!isOAuthUser && (
                <div>
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={currentPassword}
                    onChange={(v) => setCurrentPassword(v)}
                    placeholder="Enter current password"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(v) => setNewPassword(v)}
                  placeholder="Min 6 characters"
                />
              </div>

              <div>
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(v) => setConfirmPassword(v)}
                  placeholder="Re-enter new password"
                />
              </div>

              {passwordMessage && (
                <p className={`text-sm ${passwordMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                  {passwordMessage.text}
                </p>
              )}

              <button
                type="button"
                onClick={handleChangePassword}
                disabled={passwordSaving || !newPassword || !confirmPassword}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              >
                {passwordSaving ? "Updating..." : "Update Password"}
              </button>
            </div>
          </SectionCard>
        </>;

      /* ── ELIGIBILITY ───────────────────────────────────── */
      case "Eligibility":
        return (
          <SectionCard
            title="Work Eligibility & Legal"
            description="Help employers understand your work rights and language skills."
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="nationality">Nationality *</Label>
                <select
                  id="nationality"
                  value={form.nationality}
                  onChange={(e) => set("nationality", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                >
                  <option value="">Select country...</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="second_nat">Second Nationality</Label>
                <select
                  id="second_nat"
                  value={form.second_nationality}
                  onChange={(e) => set("second_nationality", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                >
                  <option value="">None</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="visa_status">Visa Status</Label>
                <Select id="visa_status" value={form.visa_status} onChange={(v) => set("visa_status", v as VisaStatus)}>
                  <option value="">Select...</option>
                  {VISA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="visa_exp">Visa Expiry Date</Label>
                {form.visa_expiry_date === "n/a" ? (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="flex-1 rounded-lg border border-accent bg-accent/20 px-4 py-2.5 text-sm text-foreground/60">N/A — No expiry</span>
                    <button
                      type="button"
                      onClick={() => set("visa_expiry_date", "")}
                      className="rounded-lg border border-accent px-3 py-2 text-xs font-medium text-foreground/60 hover:border-secondary hover:text-primary"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      id="visa_exp"
                      type="date"
                      value={form.visa_expiry_date}
                      onChange={(e) => set("visa_expiry_date", e.target.value)}
                      className="flex-1 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                    />
                    <button
                      type="button"
                      onClick={() => set("visa_expiry_date", "n/a")}
                      className="whitespace-nowrap rounded-lg border border-accent bg-white px-3 py-2 text-xs font-medium text-foreground/60 hover:border-secondary hover:text-primary"
                    >
                      N/A
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Work-eligible countries */}
            <div>
              <Label>Countries You Can Legally Work In</Label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={newEligibleCountry}
                  onChange={(e) => setNewEligibleCountry(e.target.value)}
                  placeholder="e.g. Canada"
                  className="flex-1 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newEligibleCountry.trim()) {
                      e.preventDefault();
                      set("work_eligible_countries", [...form.work_eligible_countries, newEligibleCountry.trim()]);
                      setNewEligibleCountry("");
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newEligibleCountry.trim()) {
                      set("work_eligible_countries", [...form.work_eligible_countries, newEligibleCountry.trim()]);
                      setNewEligibleCountry("");
                    }
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Add
                </button>
              </div>
              {form.work_eligible_countries.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.work_eligible_countries.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-3 py-1 text-xs font-medium text-primary">
                      {c}
                      <button type="button" onClick={() => set("work_eligible_countries", form.work_eligible_countries.filter((x) => x !== c))} className="ml-1 text-foreground/50 hover:text-red-500">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Languages */}
            <div>
              <Label>Languages</Label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={newLang}
                  onChange={(e) => setNewLang(e.target.value)}
                  placeholder="e.g. English"
                  className="flex-1 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                />
                <select
                  value={newLangProf}
                  onChange={(e) => setNewLangProf(e.target.value as LanguageProficiency["proficiency"])}
                  className="rounded-lg border border-accent bg-white px-3 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none"
                >
                  {PROFICIENCY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    if (newLang.trim()) {
                      set("languages", [...form.languages, { language: newLang.trim(), proficiency: newLangProf }]);
                      setNewLang("");
                    }
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Add
                </button>
              </div>
              {form.languages.length > 0 && (
                <div className="mt-3 space-y-2">
                  {form.languages.map((l, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-accent bg-background px-4 py-2">
                      <div>
                        <span className="text-sm font-medium text-primary">{l.language}</span>
                        <span className="ml-2 text-xs text-foreground/50 capitalize">{l.proficiency}</span>
                      </div>
                      <button type="button" onClick={() => set("languages", form.languages.filter((_, idx) => idx !== i))} className="text-sm text-foreground/50 hover:text-red-500">&times;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-3">
                <Toggle checked={form.drivers_license} onChange={(v) => set("drivers_license", v)} label="I have a driver's license" />
                {form.drivers_license && (
                  <div>
                    <Label htmlFor="dl_country">License Country</Label>
                    <Input id="dl_country" value={form.drivers_license_country} onChange={(v) => set("drivers_license_country", v)} placeholder="Australia" />
                  </div>
                )}
              </div>
              <div>
                <Toggle checked={form.has_car} onChange={(v) => set("has_car", v)} label="I have access to a car" />
              </div>
            </div>
          </SectionCard>
        );

      /* ── AVAILABILITY ──────────────────────────────────── */
      case "Availability":
        return (
          <SectionCard
            title="Availability"
            description="When and where are you looking to work?"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="avail_start">Available From</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    id="avail_start"
                    type="date"
                    value={form.availability_start}
                    onChange={(e) => set("availability_start", e.target.value)}
                    className="flex-1 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                  />
                  <button
                    type="button"
                    onClick={() => set("availability_start", new Date().toISOString().split("T")[0])}
                    className="whitespace-nowrap rounded-lg bg-secondary/20 px-3 py-2 text-xs font-semibold text-primary hover:bg-secondary/30"
                  >
                    From Now
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="avail_end">Available Until</Label>
                <Input id="avail_end" type="date" value={form.availability_end} onChange={(v) => set("availability_end", v)} />
              </div>
            </div>

            <div>
              <Label htmlFor="season_pref">Season Preference</Label>
              <Select id="season_pref" value={form.season_preference} onChange={(v) => set("season_preference", v as SeasonPreference)}>
                <option value="">Select...</option>
                {SEASON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="housing_pref">Housing Preference</Label>
              <Select id="housing_pref" value={form.housing_preference} onChange={(v) => set("housing_preference", v as HousingPreference)}>
                <option value="">Select...</option>
                {HOUSING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>

            {/* Preferred countries */}
            <div>
              <Label>Preferred Countries to Work In</Label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  placeholder="e.g. Japan"
                  className="flex-1 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCountry.trim()) {
                      e.preventDefault();
                      set("preferred_countries", [...form.preferred_countries, newCountry.trim()]);
                      setNewCountry("");
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCountry.trim()) {
                      set("preferred_countries", [...form.preferred_countries, newCountry.trim()]);
                      setNewCountry("");
                    }
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Add
                </button>
              </div>
              {form.preferred_countries.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.preferred_countries.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-3 py-1 text-xs font-medium text-primary">
                      {c}
                      <button type="button" onClick={() => set("preferred_countries", form.preferred_countries.filter((x) => x !== c))} className="ml-1 text-foreground/50 hover:text-red-500">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Toggle checked={form.willing_to_relocate} onChange={(v) => set("willing_to_relocate", v)} label="I'm willing to relocate" />
              <Toggle checked={form.available_immediately} onChange={(v) => set("available_immediately", v)} label="Available immediately" />
            </div>
          </SectionCard>
        );

      /* ── EXPERIENCE ────────────────────────────────────── */
      case "Experience":
        return (
          <div className="space-y-6">
            {/* Work History */}
            <SectionCard
              title="Work Experience"
              description="Add your seasonal or relevant work history. Employers love seeing mountain town experience."
            >
              {/* Existing entries */}
              {form.work_history.length > 0 && (
                <div className="space-y-3">
                  {form.work_history.map((entry, i) => (
                    <div key={i} className={`relative rounded-lg border bg-background transition-all ${expandedWorkIndex === i ? "border-secondary shadow-md" : "border-accent hover:border-secondary/50"}`}>
                      {/* Collapsed header -- always visible */}
                      <button
                        type="button"
                        onClick={() => {
                          if (editingWorkIndex === i) return;
                          setExpandedWorkIndex(expandedWorkIndex === i ? null : i);
                        }}
                        className="flex w-full items-center gap-3 p-4 text-left"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                          <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-primary truncate">{entry.title}</p>
                          <p className="text-sm text-foreground/70 truncate">
                            {entry.company}
                            {entry.is_verified && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                                <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                Verified
                              </span>
                            )}
                            {entry.location && <> &middot; {entry.location}</>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="hidden sm:inline rounded bg-secondary/20 px-2 py-0.5 text-xs font-medium text-primary capitalize">
                            {entry.category?.replace("_", " ")}
                          </span>
                          <svg className={`h-5 w-5 text-foreground/40 transition-transform ${expandedWorkIndex === i ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded read-only details */}
                      {expandedWorkIndex === i && editingWorkIndex !== i && (
                        <div className="border-t border-accent px-4 pb-4 pt-3">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
                            <div>
                              <span className="text-foreground/50">Job Title</span>
                              <p className="font-medium text-primary">{entry.title}</p>
                            </div>
                            <div>
                              <span className="text-foreground/50">Company</span>
                              <p className="font-medium text-primary">{entry.company}</p>
                            </div>
                            <div>
                              <span className="text-foreground/50">Location</span>
                              <p className="text-primary">{entry.location || "—"}</p>
                            </div>
                            <div>
                              <span className="text-foreground/50">Country</span>
                              <p className="text-primary">{entry.country || "—"}</p>
                            </div>
                            <div>
                              <span className="text-foreground/50">Start Date</span>
                              <p className="text-primary">{entry.start_date || "—"}</p>
                            </div>
                            <div>
                              <span className="text-foreground/50">End Date</span>
                              <p className="text-primary">{entry.is_current ? "Present" : entry.end_date || "—"}</p>
                            </div>
                            <div>
                              <span className="text-foreground/50">Category</span>
                              <p className="text-primary capitalize">{entry.category?.replace("_", " ") || "—"}</p>
                            </div>
                            {entry.resort_id && (
                              <div>
                                <span className="text-foreground/50">Ski Resort</span>
                                <p className="text-primary flex items-center gap-1">
                                  <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                                  Linked
                                </p>
                              </div>
                            )}
                          </div>
                          {entry.description && (
                            <div className="mt-3 text-sm">
                              <span className="text-foreground/50">Description</span>
                              <p className="text-primary mt-0.5">{entry.description}</p>
                            </div>
                          )}
                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingWorkIndex(i);
                                setNewWork({
                                  title: entry.title,
                                  company: entry.company,
                                  location: entry.location,
                                  country: entry.country || "",
                                  start_date: entry.start_date,
                                  end_date: entry.end_date || "",
                                  is_current: entry.is_current,
                                  description: entry.description,
                                  category: entry.category || "hospitality",
                                });
                                setBusinessQuery(entry.company);
                                setIsVerifiedBusiness(entry.is_verified || false);
                                setSelectedBusinessId(entry.verified_by_business_id || null);
                                setSelectedResortId(entry.resort_id || null);
                                setSelectedResortName(entry.resort_id ? "Linked Resort" : "");
                                setResortQuery("");
                              }}
                              className="rounded-lg bg-secondary/10 px-4 py-2 text-sm font-medium text-secondary hover:bg-secondary/20 transition-colors"
                            >
                              Edit Role
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                set("work_history", form.work_history.filter((_, idx) => idx !== i));
                                setExpandedWorkIndex(null);
                              }}
                              className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inline edit form */}
                      {editingWorkIndex === i && (
                        <div className="border-t border-secondary/30 bg-secondary/5 px-4 pb-4 pt-3 rounded-b-lg">
                          <p className="mb-3 text-sm font-semibold text-secondary">Editing Role</p>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <Label htmlFor={`edit_title_${i}`}>Job Title *</Label>
                              <Input id={`edit_title_${i}`} value={newWork.title || ""} onChange={(v) => setNewWork((p) => ({ ...p, title: v }))} placeholder="Lift Operator" />
                            </div>
                            <div className="relative">
                              <Label htmlFor={`edit_company_${i}`}>Company *</Label>
                              <div className="relative">
                                <input
                                  id={`edit_company_${i}`}
                                  type="text"
                                  value={businessQuery || newWork.company || ""}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setBusinessQuery(v);
                                    setNewWork((p) => ({ ...p, company: v }));
                                    setIsVerifiedBusiness(false);
                                    setSelectedBusinessId(null);
                                  }}
                                  placeholder="Search verified businesses or type name..."
                                  className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                                  onFocus={() => businessResults.length > 0 && setBusinessSearchOpen(true)}
                                  onBlur={() => setTimeout(() => setBusinessSearchOpen(false), 200)}
                                />
                                {isVerifiedBusiness && (
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                    Verified
                                  </span>
                                )}
                              </div>
                              {businessSearchOpen && businessResults.length > 0 && (
                                <div className="absolute z-20 mt-1 w-full rounded-lg border border-accent bg-white shadow-lg max-h-48 overflow-y-auto">
                                  {businessResults.map((b) => (
                                    <button
                                      key={b.id}
                                      type="button"
                                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/10"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => {
                                        setNewWork((p) => ({ ...p, company: b.name }));
                                        setBusinessQuery(b.name);
                                        setIsVerifiedBusiness(true);
                                        setSelectedBusinessId(b.id);
                                        setBusinessSearchOpen(false);
                                      }}
                                    >
                                      <svg className="h-4 w-4 shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      <div>
                                        <span className="font-medium text-primary">{b.name}</span>
                                        {b.location && <span className="ml-2 text-xs text-foreground/50">{b.location}</span>}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <Label htmlFor={`edit_location_${i}`}>Location</Label>
                              <Input id={`edit_location_${i}`} value={newWork.location || ""} onChange={(v) => setNewWork((p) => ({ ...p, location: v }))} placeholder="Whistler, BC" />
                            </div>
                            <div>
                              <Label htmlFor={`edit_country_${i}`}>Country</Label>
                              <Input id={`edit_country_${i}`} value={newWork.country || ""} onChange={(v) => setNewWork((p) => ({ ...p, country: v }))} placeholder="Canada" />
                            </div>
                          </div>
                          <div className="mt-4 relative">
                            <Label htmlFor={`edit_resort_${i}`}>Ski Resort</Label>
                            <div className="relative">
                              <input
                                id={`edit_resort_${i}`}
                                type="text"
                                value={resortQuery || selectedResortName}
                                onChange={(e) => {
                                  setResortQuery(e.target.value);
                                  setSelectedResortName("");
                                  setSelectedResortId(null);
                                }}
                                placeholder="Search for a ski resort..."
                                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                                onFocus={() => resortResults.length > 0 && setResortSearchOpen(true)}
                                onBlur={() => setTimeout(() => setResortSearchOpen(false), 200)}
                              />
                              {selectedResortId && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                  Linked
                                </span>
                              )}
                            </div>
                            {resortSearchOpen && resortResults.length > 0 && (
                              <div className="absolute z-20 mt-1 w-full rounded-lg border border-accent bg-white shadow-lg max-h-48 overflow-y-auto">
                                {resortResults.map((r) => (
                                  <button
                                    key={r.id}
                                    type="button"
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/10"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                      setSelectedResortName(r.name);
                                      setSelectedResortId(r.id);
                                      setResortQuery("");
                                      setResortSearchOpen(false);
                                    }}
                                  >
                                    <svg className="h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                    <div>
                                      <span className="font-medium text-primary">{r.name}</span>
                                      <span className="ml-2 text-xs text-foreground/50">{r.country}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <Label htmlFor={`edit_start_${i}`}>Start Date</Label>
                              <Input id={`edit_start_${i}`} type="date" value={newWork.start_date || ""} onChange={(v) => setNewWork((p) => ({ ...p, start_date: v }))} />
                            </div>
                            <div>
                              <Label htmlFor={`edit_end_${i}`}>End Date</Label>
                              <Input id={`edit_end_${i}`} type="date" value={newWork.end_date || ""} onChange={(v) => setNewWork((p) => ({ ...p, end_date: v }))} />
                              <div className="mt-2">
                                <Toggle checked={newWork.is_current || false} onChange={(v) => setNewWork((p) => ({ ...p, is_current: v }))} label="Currently working here" />
                              </div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <Label htmlFor={`edit_cat_${i}`}>Category</Label>
                            <select
                              id={`edit_cat_${i}`}
                              value={newWork.category || "hospitality"}
                              onChange={(e) => setNewWork((p) => ({ ...p, category: e.target.value as WorkHistoryEntry["category"] }))}
                              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                            >
                              {WORK_CATEGORIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="mt-4">
                            <Label htmlFor={`edit_desc_${i}`}>Description</Label>
                            <textarea
                              id={`edit_desc_${i}`}
                              rows={2}
                              value={newWork.description || ""}
                              onChange={(e) => setNewWork((p) => ({ ...p, description: e.target.value }))}
                              placeholder="Brief description of your role and responsibilities..."
                              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                            />
                          </div>
                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (newWork.title && newWork.company && editingWorkIndex !== null) {
                                  const updated = [...form.work_history];
                                  updated[editingWorkIndex] = {
                                    ...updated[editingWorkIndex],
                                    title: newWork.title || "",
                                    company: newWork.company || "",
                                    resort_id: selectedResortId || null,
                                    location: newWork.location || "",
                                    country: newWork.country || null,
                                    start_date: newWork.start_date || "",
                                    end_date: newWork.end_date || null,
                                    is_current: newWork.is_current || false,
                                    description: newWork.description || "",
                                    category: (newWork.category as WorkHistoryEntry["category"]) || "other",
                                    is_verified: isVerifiedBusiness,
                                    verified_by_business_id: selectedBusinessId || null,
                                  };
                                  set("work_history", updated);
                                  setEditingWorkIndex(null);
                                  setExpandedWorkIndex(null);
                                  setNewWork({ title: "", company: "", location: "", country: "", start_date: "", end_date: "", is_current: false, description: "", category: "hospitality" });
                                  setBusinessQuery("");
                                  setIsVerifiedBusiness(false);
                                  setSelectedBusinessId(null);
                                  setResortQuery("");
                                  setSelectedResortName("");
                                  setSelectedResortId(null);
                                }
                              }}
                              className="rounded-lg bg-secondary px-5 py-2 text-sm font-medium text-white hover:bg-secondary/90 transition-colors"
                            >
                              Save Changes
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingWorkIndex(null);
                                setNewWork({ title: "", company: "", location: "", country: "", start_date: "", end_date: "", is_current: false, description: "", category: "hospitality" });
                                setBusinessQuery("");
                                setIsVerifiedBusiness(false);
                                setSelectedBusinessId(null);
                                setResortQuery("");
                                setSelectedResortName("");
                                setSelectedResortId(null);
                              }}
                              className="rounded-lg bg-foreground/10 px-5 py-2 text-sm font-medium text-foreground/70 hover:bg-foreground/20 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new entry form -- only show when NOT editing */}
              {editingWorkIndex === null && (
                <div className="rounded-lg border-2 border-dashed border-accent p-4">
                  <p className="mb-3 text-sm font-medium text-foreground/60">Add a role</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="wh_title">Job Title *</Label>
                      <Input id="wh_title" value={newWork.title || ""} onChange={(v) => setNewWork((p) => ({ ...p, title: v }))} placeholder="Lift Operator" />
                    </div>
                    <div className="relative">
                      <Label htmlFor="wh_company">Company *</Label>
                      <div className="relative">
                        <input
                          id="wh_company"
                          type="text"
                          value={businessQuery || newWork.company || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setBusinessQuery(v);
                            setNewWork((p) => ({ ...p, company: v }));
                            setIsVerifiedBusiness(false);
                            setSelectedBusinessId(null);
                          }}
                          placeholder="Search verified businesses or type name..."
                          className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                          onFocus={() => businessResults.length > 0 && setBusinessSearchOpen(true)}
                          onBlur={() => setTimeout(() => setBusinessSearchOpen(false), 200)}
                        />
                        {isVerifiedBusiness && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            Verified
                          </span>
                        )}
                      </div>
                      {businessSearchOpen && businessResults.length > 0 && (
                        <div className="absolute z-20 mt-1 w-full rounded-lg border border-accent bg-white shadow-lg max-h-48 overflow-y-auto">
                          {businessResults.map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/10"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setNewWork((p) => ({ ...p, company: b.name }));
                                setBusinessQuery(b.name);
                                setIsVerifiedBusiness(true);
                                setSelectedBusinessId(b.id);
                                setBusinessSearchOpen(false);
                              }}
                            >
                              <svg className="h-4 w-4 shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              <div>
                                <span className="font-medium text-primary">{b.name}</span>
                                {b.location && <span className="ml-2 text-xs text-foreground/50">{b.location}</span>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="wh_location">Location</Label>
                      <Input id="wh_location" value={newWork.location || ""} onChange={(v) => setNewWork((p) => ({ ...p, location: v }))} placeholder="Whistler, BC" />
                    </div>
                    <div>
                      <Label htmlFor="wh_country">Country</Label>
                      <Input id="wh_country" value={newWork.country || ""} onChange={(v) => setNewWork((p) => ({ ...p, country: v }))} placeholder="Canada" />
                    </div>
                  </div>
                  <div className="mt-4 relative">
                    <Label htmlFor="wh_resort">Ski Resort</Label>
                    <div className="relative">
                      <input
                        id="wh_resort"
                        type="text"
                        value={resortQuery || selectedResortName}
                        onChange={(e) => {
                          setResortQuery(e.target.value);
                          setSelectedResortName("");
                          setSelectedResortId(null);
                        }}
                        placeholder="Search for a ski resort..."
                        className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                        onFocus={() => resortResults.length > 0 && setResortSearchOpen(true)}
                        onBlur={() => setTimeout(() => setResortSearchOpen(false), 200)}
                      />
                      {selectedResortId && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Linked
                        </span>
                      )}
                    </div>
                    {resortSearchOpen && resortResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-accent bg-white shadow-lg max-h-48 overflow-y-auto">
                        {resortResults.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-secondary/10"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedResortName(r.name);
                              setSelectedResortId(r.id);
                              setResortQuery("");
                              setResortSearchOpen(false);
                            }}
                          >
                            <svg className="h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <div>
                              <span className="font-medium text-primary">{r.name}</span>
                              <span className="ml-2 text-xs text-foreground/50">{r.country}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="wh_start">Start Date</Label>
                      <Input id="wh_start" type="date" value={newWork.start_date || ""} onChange={(v) => setNewWork((p) => ({ ...p, start_date: v }))} />
                    </div>
                    <div>
                      <Label htmlFor="wh_end">End Date</Label>
                      <Input id="wh_end" type="date" value={newWork.end_date || ""} onChange={(v) => setNewWork((p) => ({ ...p, end_date: v }))} />
                      <div className="mt-2">
                        <Toggle checked={newWork.is_current || false} onChange={(v) => setNewWork((p) => ({ ...p, is_current: v }))} label="Currently working here" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="wh_cat">Category</Label>
                    <select
                      id="wh_cat"
                      value={newWork.category || "hospitality"}
                      onChange={(e) => setNewWork((p) => ({ ...p, category: e.target.value as WorkHistoryEntry["category"] }))}
                      className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                    >
                      {WORK_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="wh_desc">Description</Label>
                    <textarea
                      id="wh_desc"
                      rows={2}
                      value={newWork.description || ""}
                      onChange={(e) => setNewWork((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Brief description of your role and responsibilities..."
                      className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (newWork.title && newWork.company) {
                        set("work_history", [
                          ...form.work_history,
                          {
                            id: crypto.randomUUID(),
                            title: newWork.title || "",
                            company: newWork.company || "",
                            resort_id: selectedResortId || null,
                            location: newWork.location || "",
                            country: newWork.country || null,
                            start_date: newWork.start_date || "",
                            end_date: newWork.end_date || null,
                            is_current: newWork.is_current || false,
                            description: newWork.description || "",
                            category: (newWork.category as WorkHistoryEntry["category"]) || "other",
                            is_verified: isVerifiedBusiness,
                            verified_by_business_id: selectedBusinessId || null,
                          },
                        ]);
                        setNewWork({ title: "", company: "", location: "", country: "", start_date: "", end_date: "", is_current: false, description: "", category: "hospitality" });
                        setBusinessQuery("");
                        setIsVerifiedBusiness(false);
                        setSelectedBusinessId(null);
                        setResortQuery("");
                        setSelectedResortName("");
                        setSelectedResortId(null);
                      }
                    }}
                    className="mt-4 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90"
                  >
                    + Add Role
                  </button>
                </div>
              )}

              <div>
                <Label htmlFor="years_exp">Years of Seasonal Experience</Label>
                <Input id="years_exp" type="number" value={form.years_seasonal_experience} onChange={(v) => set("years_seasonal_experience", v)} placeholder="2" />
              </div>
            </SectionCard>

            {/* Skills */}
            <SectionCard title="Skills" description="List skills relevant to mountain resort work.">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="e.g. First Aid, Barista, Snowboard Instructor"
                  className="flex-1 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newSkill.trim()) {
                      e.preventDefault();
                      set("skills", [...form.skills, newSkill.trim()]);
                      setNewSkill("");
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSkill.trim()) {
                      set("skills", [...form.skills, newSkill.trim()]);
                      setNewSkill("");
                    }
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Add
                </button>
              </div>
              {form.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.skills.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-3 py-1.5 text-sm font-medium text-primary">
                      {s}
                      <button type="button" onClick={() => set("skills", form.skills.filter((x) => x !== s))} className="ml-1 text-foreground/50 hover:text-red-500">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Certifications */}
            <SectionCard title="Certifications" description="Add any relevant certifications (First Aid, RSA, ski instructor level, etc.)">
              {form.certifications.length > 0 && (
                <div className="space-y-2">
                  {form.certifications.map((cert, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-accent bg-background px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-primary">{cert.name}</p>
                        {cert.issuing_body && <p className="text-xs text-foreground/50">{cert.issuing_body}</p>}
                      </div>
                      <button type="button" onClick={() => set("certifications", form.certifications.filter((_, idx) => idx !== i))} className="text-foreground/40 hover:text-red-500">&times;</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-lg border-2 border-dashed border-accent p-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="cert_name">Certification Name</Label>
                    <Input id="cert_name" value={newCert.name} onChange={(v) => setNewCert((p) => ({ ...p, name: v }))} placeholder="First Aid Level 2" />
                  </div>
                  <div>
                    <Label htmlFor="cert_body">Issuing Body</Label>
                    <Input id="cert_body" value={newCert.issuing_body || ""} onChange={(v) => setNewCert((p) => ({ ...p, issuing_body: v || null }))} placeholder="Red Cross" />
                  </div>
                  <div>
                    <Label htmlFor="cert_date">Date Obtained</Label>
                    <Input id="cert_date" type="date" value={newCert.date_obtained || ""} onChange={(v) => setNewCert((p) => ({ ...p, date_obtained: v || null }))} />
                  </div>
                  <div>
                    <Label htmlFor="cert_exp">Expiry Date</Label>
                    <Input id="cert_exp" type="date" value={newCert.expiry_date || ""} onChange={(v) => setNewCert((p) => ({ ...p, expiry_date: v || null }))} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (newCert.name.trim()) {
                      set("certifications", [...form.certifications, { ...newCert }]);
                      setNewCert({ name: "", issuing_body: null, date_obtained: null, expiry_date: null, credential_url: null });
                    }
                  }}
                  className="mt-4 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  + Add Certification
                </button>
              </div>

              {/* Document uploads */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Resume */}
                <div>
                  <Label>Resume / CV</Label>
                  {resumeUrl ? (
                    <div className="mt-1 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                      <svg className="h-5 w-5 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-800 truncate">{resumeFileName}</p>
                        <p className="text-xs text-green-600">Uploaded</p>
                      </div>
                      <button type="button" onClick={() => downloadDocument("resume")} className="rounded p-1 text-green-600 hover:bg-green-100" title="Download">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                      <button type="button" onClick={() => removeDocument("resume")} className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600" title="Remove">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ) : (
                    <label className={`mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-accent bg-background px-4 py-4 text-sm text-foreground/50 hover:border-secondary hover:text-primary transition-colors ${resumeUploading ? "opacity-50 pointer-events-none" : ""}`}>
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocument(f, "resume"); e.target.value = ""; }} />
                      {resumeUploading ? (
                        <><svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Uploading...</>
                      ) : (
                        <><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>Upload CV (PDF, DOC, DOCX — max 5MB)</>
                      )}
                    </label>
                  )}
                </div>

                {/* Cover Letter */}
                <div>
                  <Label>Cover Letter</Label>
                  {coverLetterUrl ? (
                    <div className="mt-1 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                      <svg className="h-5 w-5 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-green-800 truncate">{coverLetterFileName}</p>
                        <p className="text-xs text-green-600">Uploaded</p>
                      </div>
                      <button type="button" onClick={() => downloadDocument("cover_letter")} className="rounded p-1 text-green-600 hover:bg-green-100" title="Download">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      </button>
                      <button type="button" onClick={() => removeDocument("cover_letter")} className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600" title="Remove">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  ) : (
                    <label className={`mt-1 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-accent bg-background px-4 py-4 text-sm text-foreground/50 hover:border-secondary hover:text-primary transition-colors ${coverLetterUploading ? "opacity-50 pointer-events-none" : ""}`}>
                      <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocument(f, "cover_letter"); e.target.value = ""; }} />
                      {coverLetterUploading ? (
                        <><svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Uploading...</>
                      ) : (
                        <><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>Upload Cover Letter (PDF, DOC, DOCX — max 5MB)</>
                      )}
                    </label>
                  )}
                </div>
              </div>
            </SectionCard>
          </div>
        );

      /* ── PREFERENCES ───────────────────────────────────── */
      case "Preferences":
        return (
          <SectionCard
            title="Job Preferences"
            description="What kind of work are you looking for?"
          >
            {/* Job types - multi-select as tag chips */}
            <div>
              <Label>Preferred Job Types</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {JOB_TYPE_OPTIONS.map((jt) => (
                  <button
                    key={jt}
                    type="button"
                    onClick={() => set("preferred_job_types", toggleInArray(form.preferred_job_types, jt))}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                      form.preferred_job_types.includes(jt)
                        ? "bg-primary text-white"
                        : "bg-accent/40 text-foreground hover:bg-accent"
                    }`}
                  >
                    {jt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="pos_type">Position Type</Label>
              <Select id="pos_type" value={form.position_type} onChange={(v) => set("position_type", v as PositionType)}>
                <option value="">Select...</option>
                {POSITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </div>


            <div className="space-y-3">
              <Toggle checked={form.available_nights} onChange={(v) => set("available_nights", v)} label="Available for night shifts" />
              <Toggle checked={form.available_weekends} onChange={(v) => set("available_weekends", v)} label="Available on weekends" />
              <Toggle checked={form.open_to_second_job} onChange={(v) => set("open_to_second_job", v)} label="Open to a second job" />
            </div>
          </SectionCard>
        );

      /* ── COMMUNITY ─────────────────────────────────────── */
      case "Community":
        return (
          <div className="space-y-6">
            <SectionCard
              title="Community & Bio"
              description="Tell employers a bit about yourself beyond work."
            >
              <div>
                <Label htmlFor="bio">About Me</Label>
                <textarea
                  id="bio"
                  rows={4}
                  value={form.bio}
                  onChange={(e) => set("bio", e.target.value)}
                  placeholder="Share a bit about yourself — what drives you, why you love seasonal work, your hobbies and interests..."
                  className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                />
                <p className="mt-1 text-xs text-foreground/40">{form.bio.length}/500 characters</p>
              </div>

              <div>
                <Label htmlFor="housing_desc">Housing Needs</Label>
                <textarea
                  id="housing_desc"
                  rows={2}
                  value={form.housing_needs_description}
                  onChange={(e) => set("housing_needs_description", e.target.value)}
                  placeholder="e.g. Looking for shared staff accommodation, have my own gear..."
                  className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                />
              </div>

              <div className="space-y-3">
                <Toggle checked={form.traveling_with_partner} onChange={(v) => set("traveling_with_partner", v)} label="Traveling with a partner" />
                <Toggle checked={form.traveling_with_pets} onChange={(v) => set("traveling_with_pets", v)} label="Traveling with pets" />
              </div>
            </SectionCard>
          </div>
        );

      /* ── REVIEW ────────────────────────────────────────── */
      case "Review":
        return (
          <div className="space-y-6">
            {/* Completion */}
            <div className="rounded-xl border border-accent bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-primary">Profile Completion</h2>
                <span className="text-2xl font-bold text-primary">{completion}%</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-accent/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-foreground/60">
                {completion < 50
                  ? "Keep going! Add more details to stand out to employers."
                  : completion < 80
                  ? "Looking good! A few more details will complete your profile."
                  : "Great job! Your profile is looking strong."}
              </p>
            </div>

            {/* Summary cards */}
            <SectionCard title="Core Info">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-xs font-medium uppercase text-foreground/50">Name</dt>
                  <dd className="text-sm text-primary">{form.first_name} {form.last_name || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-foreground/50">Location</dt>
                  <dd className="text-sm text-primary">{form.location_current || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-foreground/50">Phone</dt>
                  <dd className="text-sm text-primary">{form.phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-foreground/50">Country</dt>
                  <dd className="text-sm text-primary">{form.country_of_residence || "—"}</dd>
                </div>
              </dl>
            </SectionCard>

            <SectionCard title="Eligibility">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-xs font-medium uppercase text-foreground/50">Nationality</dt>
                  <dd className="text-sm text-primary">{form.nationality || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-foreground/50">Visa Status</dt>
                  <dd className="text-sm text-primary capitalize">{form.visa_status?.replace("_", " ") || "—"}</dd>
                </div>
              </dl>
              {form.languages.length > 0 && (
                <div>
                  <dt className="text-xs font-medium uppercase text-foreground/50">Languages</dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {form.languages.map((l, i) => (
                      <span key={i} className="rounded-full bg-secondary/20 px-3 py-1 text-xs font-medium text-primary">
                        {l.language} ({l.proficiency})
                      </span>
                    ))}
                  </dd>
                </div>
              )}
              {form.work_eligible_countries.length > 0 && (
                <div>
                  <dt className="text-xs font-medium uppercase text-foreground/50">Can Work In</dt>
                  <dd className="mt-1 text-sm text-primary">{form.work_eligible_countries.join(", ")}</dd>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Availability">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-xs font-medium uppercase text-foreground/50">Dates</dt>
                  <dd className="text-sm text-primary">
                    {form.availability_start && form.availability_end
                      ? `${form.availability_start} – ${form.availability_end}`
                      : form.available_immediately
                      ? "Available immediately"
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-foreground/50">Season</dt>
                  <dd className="text-sm text-primary capitalize">{form.season_preference?.replace("_", " ") || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-foreground/50">Housing</dt>
                  <dd className="text-sm text-primary capitalize">{form.housing_preference?.replace("_", " ") || "—"}</dd>
                </div>
              </dl>
              {form.preferred_countries.length > 0 && (
                <div>
                  <dt className="text-xs font-medium uppercase text-foreground/50">Preferred Countries</dt>
                  <dd className="mt-1 text-sm text-primary">{form.preferred_countries.join(", ")}</dd>
                </div>
              )}
            </SectionCard>

            {form.work_history.length > 0 && (
              <SectionCard title={`Experience (${form.work_history.length} role${form.work_history.length > 1 ? "s" : ""})`}>
                <div className="space-y-3">
                  {form.work_history.map((w, i) => (
                    <div key={i} className="border-l-2 border-secondary pl-4">
                      <p className="font-medium text-primary">{w.title}</p>
                      <p className="text-sm text-foreground">{w.company} &middot; {w.location}</p>
                      <p className="text-xs text-foreground/50">{w.start_date} &ndash; {w.is_current ? "Present" : w.end_date}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {(form.skills.length > 0 || form.certifications.length > 0) && (
              <SectionCard title="Skills & Certifications">
                {form.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.skills.map((s) => (
                      <span key={s} className="rounded-full bg-secondary/20 px-3 py-1.5 text-sm font-medium text-primary">{s}</span>
                    ))}
                  </div>
                )}
                {form.certifications.length > 0 && (
                  <div className="space-y-2">
                    {form.certifications.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-secondary">&#10003;</span>
                        <span className="text-sm text-primary">{c.name}</span>
                        {c.issuing_body && <span className="text-xs text-foreground/50">({c.issuing_body})</span>}
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            )}

            <SectionCard title="Preferences">
              {form.preferred_job_types.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.preferred_job_types.map((jt) => (
                    <span key={jt} className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-white">{jt}</span>
                  ))}
                </div>
              )}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-xs font-medium uppercase text-foreground/50">Position Type</dt>
                  <dd className="text-sm text-primary capitalize">{form.position_type?.replace("_", " ") || "—"}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-3 text-sm text-foreground/70">
                {form.available_nights && <span className="rounded bg-accent/40 px-2 py-0.5">Night shifts</span>}
                {form.available_weekends && <span className="rounded bg-accent/40 px-2 py-0.5">Weekends</span>}
                {form.open_to_second_job && <span className="rounded bg-accent/40 px-2 py-0.5">Open to 2nd job</span>}
              </div>
            </SectionCard>

            {form.bio && (
              <SectionCard title="About Me">
                <p className="text-sm leading-relaxed text-foreground">{form.bio}</p>
              </SectionCard>
            )}

            {/* Save button */}
            <div className="rounded-xl border border-secondary/30 bg-secondary/5 p-6 text-center">
              <p className="text-sm font-medium text-primary">
                Review your profile above, then save your changes.
              </p>
              <button
                type="button"
                disabled={saving}
                className="mt-4 rounded-lg bg-primary px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
                onClick={handleSave}
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </div>
        );
    }
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  MAIN RENDER                                           */
  /* ═══════════════════════════════════════════════════════ */
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push("/profile")} className="text-sm text-foreground/50 hover:text-primary">
            &larr; Back to Profile
          </button>
          <div className="flex items-center gap-3">
            {saving && (
              <span className="flex items-center gap-1.5 text-xs text-foreground/50">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-secondary" />
                Saving...
              </span>
            )}
            {!saving && lastSaved && (
              <span className="text-xs text-green-600">
                Saved at {lastSaved}
              </span>
            )}
            <button
              type="button"
              onClick={() => saveToSupabase()}
              disabled={saving}
              className="rounded-lg border border-accent bg-white px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:border-secondary hover:text-primary disabled:opacity-50"
            >
              Save Progress
            </button>
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-bold text-primary">Edit Your Worker Profile</h1>
        <p className="mt-1 text-foreground/60">
          Complete your profile to connect with ski resort employers worldwide.
        </p>
      </div>

      {/* Progress stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setCurrentStep(i)}
              className="flex flex-col items-center gap-1.5"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  i === currentStep
                    ? "bg-primary text-white"
                    : i < currentStep
                    ? "bg-secondary text-white"
                    : "bg-accent/40 text-foreground/50"
                }`}
              >
                {i < currentStep ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`hidden text-xs font-medium sm:block ${
                  i === currentStep ? "text-primary" : "text-foreground/40"
                }`}
              >
                {s}
              </span>
            </button>
          ))}
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-accent/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all duration-300"
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <form onSubmit={(e) => e.preventDefault()}>
        {renderStep(step)}
      </form>

      {/* Navigation buttons */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={prev}
          disabled={currentStep === 0}
          className={`rounded-lg px-6 py-2.5 text-sm font-medium transition-colors ${
            currentStep === 0
              ? "cursor-not-allowed text-foreground/30"
              : "border border-accent text-foreground hover:border-secondary hover:text-primary"
          }`}
        >
          &larr; Back
        </button>
        {currentStep < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            Continue &rarr;
          </button>
        ) : null}
      </div>
    </div>
  );
}

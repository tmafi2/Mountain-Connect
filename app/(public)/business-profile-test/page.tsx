"use client";

import { useState } from "react";
import Link from "next/link";

/* ─── step definitions ────────────────────────────────────── */
const STEPS = [
  "Account Info",
  "Location",
  "Verification",
  "Hiring",
  "Job Posting",
  "Reviews",
  "Billing",
  "Review",
] as const;

type Step = (typeof STEPS)[number];

/* ─── types ───────────────────────────────────────────────── */
type BusinessType =
  | "hotel"
  | "bar_restaurant"
  | "retail"
  | "resort_operator"
  | "ski_school"
  | "property_management"
  | "transport"
  | "tour_operator"
  | "rental_shop"
  | "childcare"
  | "other";

type PlanType = "free" | "basic" | "pro" | "enterprise";

type ApplicationPreference = "cv_only" | "custom_questions" | "external_link";

interface JobRole {
  title: string;
  department: string;
  pay_range: string;
  is_template: boolean;
}

interface SocialLinks {
  website: string;
  instagram: string;
  facebook: string;
  linkedin: string;
}

/* ─── form state ──────────────────────────────────────────── */
interface FormState {
  // Account Info
  business_name: string;
  business_type: BusinessType | "";
  contact_name: string;
  contact_title: string;
  email: string;
  phone: string;
  bio: string;

  // Location
  headquarters_address: string;
  resort_locations: string[];
  country: string;
  social_links: SocialLinks;

  // Verification
  registration_number: string;
  registration_type: string;
  verified: boolean;
  insurance_certs: string[];

  // Hiring Preferences
  typical_roles: string[];
  seasonal_staff_count: string;
  housing_provided: boolean;
  housing_details: string;
  meal_perks: boolean;
  meal_details: string;
  job_roles: JobRole[];

  // Job Posting
  application_preference: ApplicationPreference | "";
  external_link: string;
  custom_questions: string[];
  saved_templates: string[];

  // Reviews & Ratings (display only — populated post-employment)
  highlights: string[];

  // Billing
  plan_type: PlanType;
  payment_method: string;
}

const INITIAL: FormState = {
  business_name: "",
  business_type: "",
  contact_name: "",
  contact_title: "",
  email: "",
  phone: "",
  bio: "",

  headquarters_address: "",
  resort_locations: [],
  country: "",
  social_links: { website: "", instagram: "", facebook: "", linkedin: "" },

  registration_number: "",
  registration_type: "",
  verified: false,
  insurance_certs: [],

  typical_roles: [],
  seasonal_staff_count: "",
  housing_provided: false,
  housing_details: "",
  meal_perks: false,
  meal_details: "",
  job_roles: [],

  application_preference: "",
  external_link: "",
  custom_questions: [],
  saved_templates: [],

  highlights: [],

  plan_type: "free",
  payment_method: "",
};

/* ─── option data ─────────────────────────────────────────── */
const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: "hotel", label: "Hotel / Lodge" },
  { value: "bar_restaurant", label: "Bar / Restaurant" },
  { value: "retail", label: "Retail Shop" },
  { value: "resort_operator", label: "Resort Operator" },
  { value: "ski_school", label: "Ski / Snowboard School" },
  { value: "property_management", label: "Property Management" },
  { value: "transport", label: "Transport / Shuttle" },
  { value: "tour_operator", label: "Tour Operator" },
  { value: "rental_shop", label: "Equipment Rental" },
  { value: "childcare", label: "Childcare" },
  { value: "other", label: "Other" },
];

const ROLE_OPTIONS = [
  "Housekeeping",
  "Chef / Cook",
  "Bartender",
  "Server / Wait Staff",
  "Front Desk / Reception",
  "Retail Sales",
  "Lift Operator",
  "Ski Instructor",
  "Snowboard Instructor",
  "Ski Patrol",
  "Rental Technician",
  "Maintenance",
  "Childcare",
  "Snow Grooming",
  "Kitchen Hand",
  "Events Coordinator",
  "Admin / Office",
  "Marketing",
  "Driver / Shuttle",
  "Other",
];

const DEPARTMENT_OPTIONS = [
  "Hospitality",
  "Food & Beverage",
  "Retail",
  "On-Mountain",
  "Admin",
  "Maintenance",
  "Events",
  "Other",
];

const HIGHLIGHT_OPTIONS = [
  "Good housing",
  "Great team culture",
  "Flexible schedule",
  "Career growth",
  "Free ski pass",
  "Meal perks",
  "Beautiful location",
  "Well managed",
  "Fair pay",
  "International team",
];

const PLAN_OPTIONS: { value: PlanType; label: string; desc: string }[] = [
  { value: "free", label: "Free", desc: "1 active job listing, basic profile" },
  { value: "basic", label: "Basic", desc: "5 listings, analytics, templates" },
  { value: "pro", label: "Pro", desc: "Unlimited listings, priority placement, API access" },
  { value: "enterprise", label: "Enterprise", desc: "Multi-location, dedicated support, custom branding" },
];

const REG_TYPE_OPTIONS = [
  { value: "abn", label: "ABN (Australia)" },
  { value: "ein", label: "EIN (USA)" },
  { value: "siret", label: "SIRET (France)" },
  { value: "crn", label: "CRN (UK)" },
  { value: "bn", label: "BN (Canada)" },
  { value: "nzbn", label: "NZBN (New Zealand)" },
  { value: "uid", label: "UID (Switzerland)" },
  { value: "other", label: "Other" },
];

const APPLICATION_PREF_OPTIONS: { value: ApplicationPreference; label: string }[] = [
  { value: "cv_only", label: "Accept CV / Resume Only" },
  { value: "custom_questions", label: "Custom Application Questions" },
  { value: "external_link", label: "External Application Link" },
];

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
  check(f.business_name);
  check(f.business_type);
  check(f.contact_name);
  check(f.email);
  check(f.bio);
  check(f.headquarters_address);
  check(f.resort_locations);
  check(f.country);
  check(f.registration_number);
  check(f.typical_roles);
  check(f.seasonal_staff_count);
  check(f.application_preference);
  check(f.plan_type);
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

function Textarea({
  id,
  placeholder,
  value,
  onChange,
  rows = 3,
}: {
  id: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
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
export default function BusinessProfileTestPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);

  // Resort location temp state
  const [newResort, setNewResort] = useState("");

  // Insurance cert temp state
  const [newCert, setNewCert] = useState("");

  // Job role temp state
  const [newRole, setNewRole] = useState<JobRole>({
    title: "",
    department: "Hospitality",
    pay_range: "",
    is_template: false,
  });

  // Custom question temp state
  const [newQuestion, setNewQuestion] = useState("");

  // Template temp state
  const [newTemplate, setNewTemplate] = useState("");

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setSocial = (key: keyof SocialLinks, value: string) =>
    setForm((prev) => ({
      ...prev,
      social_links: { ...prev.social_links, [key]: value },
    }));

  const step = STEPS[currentStep];
  const completion = calcCompletion(form);

  const next = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setCurrentStep((s) => Math.max(s - 1, 0));

  /* ─── render step content ───────────────────────────────── */
  function renderStep(step: Step) {
    switch (step) {
      /* ── ACCOUNT INFO ───────────────────────────────────── */
      case "Account Info":
        return (
          <div className="space-y-6">
            <SectionCard
              title="Business Details"
              description="Tell us about your business."
            >
              <div>
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  id="business_name"
                  placeholder='e.g., "Thredbo Alpine Hotel"'
                  value={form.business_name}
                  onChange={(v) => set("business_name", v)}
                />
              </div>

              <div>
                <Label htmlFor="business_type">Business Type *</Label>
                <Select
                  id="business_type"
                  value={form.business_type}
                  onChange={(v) => set("business_type", v as BusinessType)}
                >
                  <option value="">Select type...</option>
                  {BUSINESS_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="bio">Company Bio / About</Label>
                <Textarea
                  id="bio"
                  placeholder="Who you are, what you do, and why someone should work with you..."
                  value={form.bio}
                  onChange={(v) => set("bio", v)}
                  rows={4}
                />
                <p className="mt-1 text-xs text-foreground/50">
                  {form.bio.length}/500 characters
                </p>
              </div>

              <div className="rounded-lg border-2 border-dashed border-accent p-6 text-center">
                <div className="text-3xl text-foreground/30">&#128247;</div>
                <p className="mt-2 text-sm font-medium text-foreground/60">
                  Upload Logo / Profile Image
                </p>
                <p className="text-xs text-foreground/40">
                  PNG, JPG, or SVG. Max 2MB.
                </p>
              </div>
            </SectionCard>

            <SectionCard
              title="Primary Contact"
              description="Who should workers and our team reach out to?"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="contact_name">Full Name *</Label>
                  <Input
                    id="contact_name"
                    placeholder="Jane Smith"
                    value={form.contact_name}
                    onChange={(v) => set("contact_name", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="contact_title">Job Title</Label>
                  <Input
                    id="contact_title"
                    placeholder="Hiring Manager"
                    value={form.contact_title}
                    onChange={(v) => set("contact_title", v)}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="hire@thredboalpine.com"
                    value={form.email}
                    onChange={(v) => set("email", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+61 4XX XXX XXX"
                    value={form.phone}
                    onChange={(v) => set("phone", v)}
                  />
                </div>
              </div>
            </SectionCard>
          </div>
        );

      /* ── LOCATION ───────────────────────────────────────── */
      case "Location":
        return (
          <div className="space-y-6">
            <SectionCard
              title="Headquarters"
              description="Where is your business based?"
            >
              <div>
                <Label htmlFor="headquarters_address">Address</Label>
                <Textarea
                  id="headquarters_address"
                  placeholder="123 Mountain Road, Thredbo Village, NSW 2625, Australia"
                  value={form.headquarters_address}
                  onChange={(v) => set("headquarters_address", v)}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  placeholder="Australia"
                  value={form.country}
                  onChange={(v) => set("country", v)}
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Resort Locations"
              description="Which resort(s) does your business operate at?"
            >
              {form.resort_locations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.resort_locations.map((r, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary/20 px-3 py-1 text-sm text-primary"
                    >
                      {r}
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            "resort_locations",
                            form.resort_locations.filter((_, idx) => idx !== i)
                          )
                        }
                        className="ml-1 text-foreground/50 hover:text-red-500"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  placeholder="e.g., Whistler Blackcomb"
                  value={newResort}
                  onChange={(e) => setNewResort(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newResort.trim()) {
                      set("resort_locations", [
                        ...form.resort_locations,
                        newResort.trim(),
                      ]);
                      setNewResort("");
                    }
                  }}
                  className="flex-1 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newResort.trim()) {
                      set("resort_locations", [
                        ...form.resort_locations,
                        newResort.trim(),
                      ]);
                      setNewResort("");
                    }
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Add
                </button>
              </div>
              <p className="text-xs text-foreground/50">
                Add each resort location where you hire seasonal staff.
              </p>
            </SectionCard>

            <SectionCard
              title="Online Presence"
              description="Help workers find and learn more about you."
            >
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  placeholder="https://www.thredboalpine.com"
                  value={form.social_links.website}
                  onChange={(v) => setSocial("website", v)}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    placeholder="@thredboalpine"
                    value={form.social_links.instagram}
                    onChange={(v) => setSocial("instagram", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    placeholder="facebook.com/thredboalpine"
                    value={form.social_links.facebook}
                    onChange={(v) => setSocial("facebook", v)}
                  />
                </div>
                <div>
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    placeholder="linkedin.com/company/thredboalpine"
                    value={form.social_links.linkedin}
                    onChange={(v) => setSocial("linkedin", v)}
                  />
                </div>
              </div>
            </SectionCard>
          </div>
        );

      /* ── VERIFICATION ───────────────────────────────────── */
      case "Verification":
        return (
          <div className="space-y-6">
            <SectionCard
              title="Business Registration"
              description="Verify your business to build trust with potential workers."
            >
              <div>
                <Label htmlFor="registration_type">Registration Type</Label>
                <Select
                  id="registration_type"
                  value={form.registration_type}
                  onChange={(v) => set("registration_type", v)}
                >
                  <option value="">Select type...</option>
                  {REG_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="registration_number">Registration Number</Label>
                <Input
                  id="registration_number"
                  placeholder="e.g., 12 345 678 901"
                  value={form.registration_number}
                  onChange={(v) => set("registration_number", v)}
                />
              </div>

              <div className="rounded-lg border-2 border-dashed border-accent p-6 text-center">
                <div className="text-3xl text-foreground/30">&#128196;</div>
                <p className="mt-2 text-sm font-medium text-foreground/60">
                  Upload Verification Documents
                </p>
                <p className="text-xs text-foreground/40">
                  Business license, certificate of incorporation, etc. PDF or image.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-lg bg-secondary/10 p-4">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    form.verified
                      ? "bg-green-100 text-green-600"
                      : "bg-accent text-foreground/40"
                  }`}
                >
                  {form.verified ? "\u2713" : "?"}
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">
                    Verification Status
                  </p>
                  <p className="text-xs text-foreground/60">
                    {form.verified
                      ? "Your business is verified. A badge will appear on your profile."
                      : "Not yet verified. Submit documents above and our team will review."}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Insurance & Safety Certifications"
              description="Optional — show workers your workplace is safe and insured."
            >
              {form.insurance_certs.length > 0 && (
                <div className="space-y-2">
                  {form.insurance_certs.map((cert, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-background px-4 py-2"
                    >
                      <span className="text-sm text-primary">{cert}</span>
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            "insurance_certs",
                            form.insurance_certs.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-xs text-foreground/50 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  placeholder="e.g., Public Liability Insurance"
                  value={newCert}
                  onChange={(e) => setNewCert(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCert.trim()) {
                      set("insurance_certs", [
                        ...form.insurance_certs,
                        newCert.trim(),
                      ]);
                      setNewCert("");
                    }
                  }}
                  className="flex-1 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newCert.trim()) {
                      set("insurance_certs", [
                        ...form.insurance_certs,
                        newCert.trim(),
                      ]);
                      setNewCert("");
                    }
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Add
                </button>
              </div>
            </SectionCard>
          </div>
        );

      /* ── HIRING PREFERENCES ─────────────────────────────── */
      case "Hiring":
        return (
          <div className="space-y-6">
            <SectionCard
              title="Typical Job Roles"
              description="What roles do you usually hire for each season?"
            >
              <div className="flex flex-wrap gap-2">
                {ROLE_OPTIONS.map((role) => {
                  const active = form.typical_roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() =>
                        set(
                          "typical_roles",
                          toggleInArray(form.typical_roles, role)
                        )
                      }
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary text-white"
                          : "bg-accent/40 text-foreground hover:bg-accent"
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard
              title="Staffing & Perks"
              description="Help workers understand what to expect."
            >
              <div>
                <Label htmlFor="seasonal_staff_count">
                  Seasonal Staff per Season
                </Label>
                <Select
                  id="seasonal_staff_count"
                  value={form.seasonal_staff_count}
                  onChange={(v) => set("seasonal_staff_count", v)}
                >
                  <option value="">Select range...</option>
                  <option value="1-5">1–5</option>
                  <option value="5-10">5–10</option>
                  <option value="10-20">10–20</option>
                  <option value="20-50">20–50</option>
                  <option value="50-100">50–100</option>
                  <option value="100+">100+</option>
                </Select>
              </div>

              <div className="space-y-4">
                <Toggle
                  checked={form.housing_provided}
                  onChange={(v) => set("housing_provided", v)}
                  label="Staff housing provided?"
                />
                {form.housing_provided && (
                  <div className="ml-14">
                    <Label htmlFor="housing_details">Housing Details</Label>
                    <Textarea
                      id="housing_details"
                      placeholder="Shared dorms on-site, $120/week deducted from pay, includes WiFi..."
                      value={form.housing_details}
                      onChange={(v) => set("housing_details", v)}
                      rows={2}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <Toggle
                  checked={form.meal_perks}
                  onChange={(v) => set("meal_perks", v)}
                  label="Meal perks provided?"
                />
                {form.meal_perks && (
                  <div className="ml-14">
                    <Label htmlFor="meal_details">Meal Details</Label>
                    <Textarea
                      id="meal_details"
                      placeholder="Free staff meal on shift, 50% discount at hotel restaurant..."
                      value={form.meal_details}
                      onChange={(v) => set("meal_details", v)}
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Role & Pay Details"
              description="Add specific roles with pay ranges. These can be saved as templates."
            >
              {form.job_roles.length > 0 && (
                <div className="space-y-2">
                  {form.job_roles.map((role, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-background px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-primary">
                          {role.title}
                        </p>
                        <p className="text-xs text-foreground/60">
                          {role.department} &middot; {role.pay_range || "Pay TBD"}
                          {role.is_template && " \u00B7 Template"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            "job_roles",
                            form.job_roles.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-xs text-foreground/50 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-3 rounded-lg border border-accent/60 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="role_title">Role Title</Label>
                    <Input
                      id="role_title"
                      placeholder="e.g., Head Chef"
                      value={newRole.title}
                      onChange={(v) =>
                        setNewRole((prev) => ({ ...prev, title: v }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="role_dept">Department</Label>
                    <Select
                      id="role_dept"
                      value={newRole.department}
                      onChange={(v) =>
                        setNewRole((prev) => ({ ...prev, department: v }))
                      }
                    >
                      {DEPARTMENT_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="role_pay">Pay Range (optional)</Label>
                    <Input
                      id="role_pay"
                      placeholder="e.g., $25-30/hr or $55k/season"
                      value={newRole.pay_range}
                      onChange={(v) =>
                        setNewRole((prev) => ({ ...prev, pay_range: v }))
                      }
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <Toggle
                      checked={newRole.is_template}
                      onChange={(v) =>
                        setNewRole((prev) => ({ ...prev, is_template: v }))
                      }
                      label="Save as template"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (newRole.title.trim()) {
                      set("job_roles", [
                        ...form.job_roles,
                        { ...newRole, title: newRole.title.trim() },
                      ]);
                      setNewRole({
                        title: "",
                        department: "Hospitality",
                        pay_range: "",
                        is_template: false,
                      });
                    }
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Add Role
                </button>
              </div>
            </SectionCard>
          </div>
        );

      /* ── JOB POSTING ────────────────────────────────────── */
      case "Job Posting":
        return (
          <div className="space-y-6">
            <SectionCard
              title="Application Preferences"
              description="How do you want workers to apply?"
            >
              <div>
                <Label htmlFor="application_preference">
                  Application Method
                </Label>
                <Select
                  id="application_preference"
                  value={form.application_preference}
                  onChange={(v) =>
                    set("application_preference", v as ApplicationPreference)
                  }
                >
                  <option value="">Select preference...</option>
                  {APPLICATION_PREF_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </div>

              {form.application_preference === "external_link" && (
                <div>
                  <Label htmlFor="external_link">External Application URL</Label>
                  <Input
                    id="external_link"
                    placeholder="https://careers.yourcompany.com/apply"
                    value={form.external_link}
                    onChange={(v) => set("external_link", v)}
                  />
                </div>
              )}

              {form.application_preference === "custom_questions" && (
                <div>
                  <Label>Custom Screening Questions</Label>
                  {form.custom_questions.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {form.custom_questions.map((q, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg bg-background px-4 py-2"
                        >
                          <span className="text-sm text-primary">
                            {i + 1}. {q}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              set(
                                "custom_questions",
                                form.custom_questions.filter(
                                  (_, idx) => idx !== i
                                )
                              )
                            }
                            className="text-xs text-foreground/50 hover:text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <input
                      placeholder='e.g., "Do you have a valid RSA certificate?"'
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newQuestion.trim()) {
                          set("custom_questions", [
                            ...form.custom_questions,
                            newQuestion.trim(),
                          ]);
                          setNewQuestion("");
                        }
                      }}
                      className="flex-1 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newQuestion.trim()) {
                          set("custom_questions", [
                            ...form.custom_questions,
                            newQuestion.trim(),
                          ]);
                          setNewQuestion("");
                        }
                      }}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Saved Job Templates"
              description="Save job description templates to reuse each season."
            >
              {form.saved_templates.length > 0 ? (
                <div className="space-y-2">
                  {form.saved_templates.map((t, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-background px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/20 text-sm font-medium text-primary">
                          {i + 1}
                        </div>
                        <span className="text-sm font-medium text-primary">
                          {t}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            "saved_templates",
                            form.saved_templates.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-xs text-foreground/50 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-background p-6 text-center">
                  <p className="text-sm text-foreground/50">
                    No templates saved yet. Add a template name below.
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  placeholder='e.g., "Winter Season Housekeeping"'
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTemplate.trim()) {
                      set("saved_templates", [
                        ...form.saved_templates,
                        newTemplate.trim(),
                      ]);
                      setNewTemplate("");
                    }
                  }}
                  className="flex-1 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newTemplate.trim()) {
                      set("saved_templates", [
                        ...form.saved_templates,
                        newTemplate.trim(),
                      ]);
                      setNewTemplate("");
                    }
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
                >
                  Add
                </button>
              </div>
            </SectionCard>
          </div>
        );

      /* ── REVIEWS & RATINGS ──────────────────────────────── */
      case "Reviews":
        return (
          <div className="space-y-6">
            <SectionCard
              title="Reviews & Ratings"
              description="This section will display post-employment reviews from workers. Here's a preview of how it will look."
            >
              <div className="rounded-lg bg-background p-6 text-center">
                <div className="text-4xl text-foreground/20">&#9734;&#9734;&#9734;&#9734;&#9734;</div>
                <p className="mt-2 text-sm text-foreground/50">
                  No reviews yet. Reviews will appear here once workers complete a season with your business.
                </p>
              </div>

              <div className="rounded-lg border border-accent/60 p-4">
                <p className="text-sm font-medium text-primary">
                  Example Review (preview)
                </p>
                <div className="mt-2 flex items-center gap-1 text-amber-400">
                  &#9733;&#9733;&#9733;&#9733;&#9734;
                  <span className="ml-2 text-sm text-foreground/60">4.0</span>
                </div>
                <p className="mt-2 text-sm text-foreground/70">
                  &ldquo;Great team, well-organised housing, and the mountain access was amazing. Would definitely recommend for a season.&rdquo;
                </p>
                <p className="mt-1 text-xs text-foreground/40">
                  &mdash; Seasonal Worker, Winter 2025
                </p>
              </div>
            </SectionCard>

            <SectionCard
              title="Highlight Tags"
              description="Select tags that best describe what workers love about your business."
            >
              <div className="flex flex-wrap gap-2">
                {HIGHLIGHT_OPTIONS.map((h) => {
                  const active = form.highlights.includes(h);
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() =>
                        set("highlights", toggleInArray(form.highlights, h))
                      }
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary text-white"
                          : "bg-accent/40 text-foreground hover:bg-accent"
                      }`}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </SectionCard>
          </div>
        );

      /* ── BILLING ────────────────────────────────────────── */
      case "Billing":
        return (
          <div className="space-y-6">
            <SectionCard
              title="Choose Your Plan"
              description="Select a plan that fits your hiring needs."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {PLAN_OPTIONS.map((plan) => {
                  const active = form.plan_type === plan.value;
                  return (
                    <button
                      key={plan.value}
                      type="button"
                      onClick={() => set("plan_type", plan.value)}
                      className={`rounded-xl border-2 p-5 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/5"
                          : "border-accent hover:border-secondary"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-primary">
                          {plan.label}
                        </p>
                        {active && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                            &#10003;
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-foreground/60">
                        {plan.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </SectionCard>

            <SectionCard
              title="Payment Method"
              description="Billing will be handled securely via Stripe."
            >
              <div className="rounded-lg border-2 border-dashed border-accent p-8 text-center">
                <div className="text-3xl text-foreground/30">&#128179;</div>
                <p className="mt-2 text-sm font-medium text-foreground/60">
                  Stripe Payment Integration
                </p>
                <p className="text-xs text-foreground/40">
                  This will connect to Stripe Checkout for secure payment processing.
                </p>
                <button
                  type="button"
                  className="mt-4 rounded-lg bg-primary/10 px-6 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  Connect Payment Method (Coming Soon)
                </button>
              </div>

              <div className="rounded-lg bg-background p-4">
                <p className="text-sm font-medium text-primary">
                  Invoices & Receipts
                </p>
                <p className="mt-1 text-xs text-foreground/50">
                  Your billing history and downloadable invoices will appear here once you subscribe to a paid plan.
                </p>
              </div>
            </SectionCard>
          </div>
        );

      /* ── REVIEW ─────────────────────────────────────────── */
      case "Review":
        return (
          <div className="space-y-6">
            <SectionCard
              title="Profile Summary"
              description="Review your business profile before saving."
            >
              {/* Profile completion */}
              <div className="mb-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-primary">
                    Profile Completion
                  </span>
                  <span className="font-semibold text-primary">
                    {completion}%
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-accent/30">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Account Info summary */}
            <SectionCard title="Account Info">
              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewField label="Business Name" value={form.business_name} />
                <ReviewField
                  label="Business Type"
                  value={
                    BUSINESS_TYPE_OPTIONS.find(
                      (o) => o.value === form.business_type
                    )?.label || ""
                  }
                />
                <ReviewField label="Contact" value={form.contact_name} />
                <ReviewField label="Title" value={form.contact_title} />
                <ReviewField label="Email" value={form.email} />
                <ReviewField label="Phone" value={form.phone} />
              </div>
              {form.bio && (
                <div className="mt-3">
                  <ReviewField label="Bio" value={form.bio} />
                </div>
              )}
            </SectionCard>

            {/* Location summary */}
            <SectionCard title="Location">
              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewField label="Address" value={form.headquarters_address} />
                <ReviewField label="Country" value={form.country} />
              </div>
              {form.resort_locations.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                    Resort Locations
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {form.resort_locations.map((r, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-secondary/20 px-3 py-1 text-sm text-primary"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {form.social_links.website && (
                <ReviewField label="Website" value={form.social_links.website} />
              )}
            </SectionCard>

            {/* Verification summary */}
            <SectionCard title="Verification">
              <div className="grid gap-4 sm:grid-cols-2">
                <ReviewField
                  label="Registration Type"
                  value={
                    REG_TYPE_OPTIONS.find(
                      (o) => o.value === form.registration_type
                    )?.label || ""
                  }
                />
                <ReviewField
                  label="Registration #"
                  value={form.registration_number}
                />
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-3 w-3 rounded-full ${
                    form.verified ? "bg-green-500" : "bg-amber-400"
                  }`}
                />
                <span className="text-sm text-foreground">
                  {form.verified ? "Verified" : "Pending verification"}
                </span>
              </div>
            </SectionCard>

            {/* Hiring summary */}
            <SectionCard title="Hiring Preferences">
              {form.typical_roles.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                    Typical Roles
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {form.typical_roles.map((r) => (
                      <span
                        key={r}
                        className="rounded-full bg-secondary/20 px-3 py-1 text-sm text-primary"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <ReviewField
                  label="Staff/Season"
                  value={form.seasonal_staff_count}
                />
                <ReviewField
                  label="Housing"
                  value={form.housing_provided ? "Yes" : "No"}
                />
                <ReviewField
                  label="Meals"
                  value={form.meal_perks ? "Yes" : "No"}
                />
              </div>
              {form.job_roles.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
                    Defined Roles ({form.job_roles.length})
                  </p>
                  {form.job_roles.map((role, i) => (
                    <p key={i} className="text-sm text-primary">
                      {role.title} &middot; {role.department}
                      {role.pay_range && ` \u00B7 ${role.pay_range}`}
                    </p>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Billing summary */}
            <SectionCard title="Plan">
              <ReviewField
                label="Selected Plan"
                value={
                  PLAN_OPTIONS.find((o) => o.value === form.plan_type)?.label ||
                  "Free"
                }
              />
            </SectionCard>

            {/* Submit */}
            <div className="rounded-xl border border-accent bg-white p-6 text-center shadow-sm">
              <p className="text-sm text-foreground/60">
                This is a preview of the business profile setup flow. In
                production, clicking &ldquo;Save Profile&rdquo; would persist data to
                Supabase.
              </p>
              <button
                type="button"
                onClick={() =>
                  alert(
                    "Profile saved! (Test mode — no backend connected)\n\n" +
                      JSON.stringify(form, null, 2).slice(0, 600)
                  )
                }
                className="mt-4 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Save Business Profile
              </button>
            </div>
          </div>
        );
    }
  }

  /* ─── layout ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b border-accent bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link
            href="/"
            className="text-sm font-medium text-foreground hover:text-primary"
          >
            &larr; Back to Home
          </Link>
          <span className="text-xs font-medium text-foreground/50">
            TEST MODE &mdash; Business Profile Setup
          </span>
          <span className="text-sm font-semibold text-primary">
            {completion}% complete
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary">
            Set Up Your Business Profile
          </h1>
          <p className="mt-1 text-sm text-foreground/60">
            Create your employer profile so seasonal workers can discover your
            business and apply to your roles.
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-10 overflow-x-auto">
          <div className="flex min-w-max items-center gap-1">
            {STEPS.map((s, i) => {
              const isActive = i === currentStep;
              const isDone = i < currentStep;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCurrentStep(i)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : isDone
                        ? "bg-secondary/20 text-primary"
                        : "text-foreground/50 hover:bg-accent/30 hover:text-foreground"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isActive
                        ? "bg-white/20 text-white"
                        : isDone
                          ? "bg-primary/10 text-primary"
                          : "bg-accent text-foreground/40"
                    }`}
                  >
                    {isDone ? "\u2713" : i + 1}
                  </span>
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        {renderStep(step)}

        {/* Navigation buttons */}
        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            onClick={prev}
            disabled={currentStep === 0}
            className="rounded-lg border border-accent px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/30 disabled:opacity-40"
          >
            Back
          </button>
          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                alert(
                  "Profile saved! (Test mode — no backend connected)"
                )
              }
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Save Profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── review helper ───────────────────────────────────────── */
function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-primary">{value || "—"}</p>
    </div>
  );
}

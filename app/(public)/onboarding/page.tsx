"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const initialStep: "role" | "worker" | "business" =
    typeParam === "business" ? "business" : typeParam === "worker" ? "worker" : "role";
  const [step, setStep] = useState<"role" | "worker" | "business">(initialStep);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fallback: if no type param, check user metadata for account_type
  useEffect(() => {
    if (typeParam) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const accountType = data.user?.user_metadata?.account_type;
      if (accountType === "business") {
        setStep("business");
      } else if (accountType === "worker") {
        setStep("worker");
      }
    });
  }, [typeParam]);

  const selectRole = (role: UserRole) => {
    setStep(role === "worker" ? "worker" : "business");
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <div className="w-full max-w-lg">
        {step === "role" && <RoleSelection onSelect={selectRole} />}
        {step === "worker" && (
          <WorkerSetup loading={loading} setLoading={setLoading} router={router} />
        )}
        {step === "business" && (
          <BusinessSetup loading={loading} setLoading={setLoading} router={router} />
        )}
      </div>
    </div>
  );
}

function RoleSelection({
  onSelect,
}: {
  onSelect: (role: UserRole) => void;
}) {
  return (
    <div className="text-center">
      <h1 className="text-3xl font-bold text-primary">Welcome to Mountain Connect</h1>
      <p className="mt-3 text-foreground">How will you be using the platform?</p>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <button
          onClick={() => onSelect("worker")}
          className="group rounded-xl border-2 border-accent bg-white p-6 text-left transition-all hover:border-secondary hover:shadow-lg"
        >
          <div className="text-3xl">🎿</div>
          <h2 className="mt-3 text-xl font-semibold text-primary">
            Seasonal Worker
          </h2>
          <p className="mt-2 text-sm text-foreground">
            I&apos;m looking for seasonal work at ski resorts
          </p>
        </button>

        <button
          onClick={() => onSelect("business_owner")}
          className="group rounded-xl border-2 border-accent bg-white p-6 text-left transition-all hover:border-secondary hover:shadow-lg"
        >
          <div className="text-3xl">🏢</div>
          <h2 className="mt-3 text-xl font-semibold text-primary">
            Business Owner
          </h2>
          <p className="mt-2 text-sm text-foreground">
            I want to post jobs and find seasonal staff
          </p>
        </button>
      </div>
    </div>
  );
}

function WorkerSetup({
  loading,
  setLoading,
  router,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [workerStep, setWorkerStep] = useState(1);
  const [discipline, setDiscipline] = useState<"snowboarder" | "skier" | "not_sure" | null>(null);
  const [experience, setExperience] = useState<"first_season" | "returning" | null>(null);
  const [lookingForJob, setLookingForJob] = useState<boolean | null>(null);
  const [lookingForAccommodation, setLookingForAccommodation] = useState<boolean | null>(null);
  const [slideDirection, setSlideDirection] = useState<"forward" | "back">("forward");

  const totalSteps = 4;

  const goForward = (step: number) => {
    setSlideDirection("forward");
    setWorkerStep(step);
  };
  const goBack = (step: number) => {
    setSlideDirection("back");
    setWorkerStep(step);
  };

  const handleSave = async (destination: "explore" | "profile") => {
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Update user role
    await supabase.from("users").upsert({
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata.full_name ?? "",
      role: "worker",
    });

    // Create worker profile with onboarding answers
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Denver";

    await supabase.from("worker_profiles").insert({
      user_id: user.id,
      bio: discipline === "snowboarder" ? "Snowboarder" : discipline === "skier" ? "Skier" : "",
      years_seasonal_experience: experience === "first_season" ? 0 : 1,
      preferred_job_types: lookingForJob ? ["full_time"] : [],
      housing_preference: lookingForAccommodation ? "staff_housing" : "no_preference",
      work_history: [],
      contact_email: user.email || null,
      timezone: detectedTimezone,
    });

    // Send welcome email (non-blocking)
    fetch("/api/emails/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "worker",
        email: user.email,
        name: user.user_metadata.full_name || "",
        profileUrl: `${window.location.origin}/profile`,
      }),
    }).catch((err) => console.error("Failed to send welcome email:", err));

    setLoading(false);
    router.push(destination === "explore" ? "/explore" : "/profile/edit");
  };

  const slideClass = slideDirection === "forward"
    ? "animate-[slideInRight_0.4s_cubic-bezier(0.16,1,0.3,1)]"
    : "animate-[slideInLeft_0.4s_cubic-bezier(0.16,1,0.3,1)]";

  return (
    <div className="overflow-hidden">
      {/* Progress dots */}
      <div className="mb-10 flex items-center justify-center gap-3">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
                i + 1 < workerStep
                  ? "bg-secondary text-white scale-90"
                  : i + 1 === workerStep
                  ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30"
                  : "bg-accent/30 text-foreground/30"
              }`}
            >
              {i + 1 < workerStep ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < totalSteps - 1 && (
              <div className={`h-0.5 w-8 rounded-full transition-all duration-500 ${
                i + 1 < workerStep ? "bg-secondary" : "bg-accent/20"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Snowboarder or Skier */}
      {workerStep === 1 && (
        <div key="step1" className={slideClass}>
          <div className="text-center">
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 animate-pulse rounded-full bg-secondary/20" />
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary text-3xl shadow-lg">
                🏔️
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary">
              First things first...
            </h1>
            <p className="mt-2 text-lg text-foreground/60">
              Are you a snowboarder or skier?
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Snowboarder */}
            <button
              onClick={() => { setDiscipline("snowboarder"); goForward(2); }}
              className="group relative overflow-hidden rounded-2xl border-2 border-accent bg-white p-6 text-center transition-all duration-300 hover:border-secondary hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-secondary/0 to-secondary/5 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  🏂
                </div>
                <h2 className="mt-4 text-lg font-bold text-primary">Snowboarder</h2>
                <p className="mt-1 text-sm text-foreground/50">Shred the mountain</p>
              </div>
            </button>

            {/* Skier */}
            <button
              onClick={() => { setDiscipline("skier"); goForward(2); }}
              className="group relative overflow-hidden rounded-2xl border-2 border-accent bg-white p-6 text-center transition-all duration-300 hover:border-secondary hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-secondary/0 to-secondary/5 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-sky-50 text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3">
                  ⛷️
                </div>
                <h2 className="mt-4 text-lg font-bold text-primary">Skier</h2>
                <p className="mt-1 text-sm text-foreground/50">Carve the slopes</p>
              </div>
            </button>

            {/* Not sure */}
            <button
              onClick={() => { setDiscipline("not_sure"); goForward(2); }}
              className="group relative overflow-hidden rounded-2xl border-2 border-accent bg-white p-6 text-center transition-all duration-300 hover:border-secondary hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-secondary/0 to-secondary/5 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 text-4xl transition-transform duration-300 group-hover:scale-110">
                  🤷
                </div>
                <h2 className="mt-4 text-lg font-bold text-primary">Not sure yet</h2>
                <p className="mt-1 text-sm text-foreground/50">Open to both!</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Experience */}
      {workerStep === 2 && (
        <div key="step2" className={slideClass}>
          <div className="text-center">
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 animate-pulse rounded-full bg-secondary/20" />
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary text-3xl shadow-lg">
                🎿
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary">
              Have you done a season before?
            </h1>
            <p className="mt-2 text-lg text-foreground/60">
              This helps us tailor your experience.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => { setExperience("first_season"); goForward(3); }}
              className="group relative overflow-hidden rounded-2xl border-2 border-accent bg-white p-6 text-center transition-all duration-300 hover:border-secondary hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-secondary/0 to-secondary/5 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 text-4xl transition-transform duration-300 group-hover:scale-110">
                  🌟
                </div>
                <h2 className="mt-4 text-lg font-bold text-primary">First season</h2>
                <p className="mt-1 text-sm text-foreground/50">
                  This will be my first time
                </p>
              </div>
            </button>

            <button
              onClick={() => { setExperience("returning"); goForward(3); }}
              className="group relative overflow-hidden rounded-2xl border-2 border-accent bg-white p-6 text-center transition-all duration-300 hover:border-secondary hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-secondary/0 to-secondary/5 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-100 to-green-50 text-4xl transition-transform duration-300 group-hover:scale-110">
                  🏔️
                </div>
                <h2 className="mt-4 text-lg font-bold text-primary">Returning seasonnaire</h2>
                <p className="mt-1 text-sm text-foreground/50">
                  I&apos;ve done this before
                </p>
              </div>
            </button>
          </div>

          <button
            onClick={() => goBack(1)}
            className="mt-8 flex items-center gap-2 text-sm font-semibold text-foreground/40 transition-colors hover:text-foreground/70"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      )}

      {/* Step 3: Looking for */}
      {workerStep === 3 && (
        <div key="step3" className={slideClass}>
          <div className="text-center">
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 animate-pulse rounded-full bg-secondary/20" />
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary text-3xl shadow-lg">
                🔍
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary">
              What are you looking for?
            </h1>
            <p className="mt-2 text-lg text-foreground/60">
              Select all that apply to you.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            <button
              onClick={() => setLookingForJob((prev) => prev === null ? true : !prev)}
              className={`flex w-full items-center gap-5 rounded-2xl border-2 p-5 text-left transition-all duration-300 hover:shadow-lg ${
                lookingForJob
                  ? "border-secondary bg-secondary/5 shadow-md shadow-secondary/10"
                  : "border-accent bg-white hover:border-secondary/50"
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                lookingForJob
                  ? "bg-secondary text-white scale-110 shadow-lg shadow-secondary/30"
                  : "bg-accent/20 text-foreground/40"
              }`}>
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-primary">Work</h3>
                <p className="text-sm text-foreground/50">I&apos;m looking for seasonal work at a ski resort</p>
              </div>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                lookingForJob
                  ? "border-secondary bg-secondary text-white scale-110"
                  : "border-accent/50"
              }`}>
                {lookingForJob && (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>

            <button
              onClick={() => setLookingForAccommodation((prev) => prev === null ? true : !prev)}
              className={`flex w-full items-center gap-5 rounded-2xl border-2 p-5 text-left transition-all duration-300 hover:shadow-lg ${
                lookingForAccommodation
                  ? "border-secondary bg-secondary/5 shadow-md shadow-secondary/10"
                  : "border-accent bg-white hover:border-secondary/50"
              }`}
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                lookingForAccommodation
                  ? "bg-secondary text-white scale-110 shadow-lg shadow-secondary/30"
                  : "bg-accent/20 text-foreground/40"
              }`}>
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-primary">Accommodation</h3>
                <p className="text-sm text-foreground/50">I need help finding a place to stay for the season</p>
              </div>
              <div className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                lookingForAccommodation
                  ? "border-secondary bg-secondary text-white scale-110"
                  : "border-accent/50"
              }`}>
                {lookingForAccommodation && (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <button
              onClick={() => goBack(2)}
              className="flex items-center gap-2 text-sm font-semibold text-foreground/40 transition-colors hover:text-foreground/70"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={() => goForward(4)}
              disabled={lookingForJob === null && lookingForAccommodation === null}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Choose next action */}
      {workerStep === 4 && (
        <div key="step4" className={slideClass}>
          <div className="text-center">
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-20" />
              <div className="absolute inset-0 animate-pulse rounded-full bg-green-100/50" />
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-secondary text-3xl shadow-lg">
                🚀
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary">
              You&apos;re all set!
            </h1>
            <p className="mt-2 text-lg text-foreground/60">
              What would you like to do next?
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => handleSave("explore")}
              disabled={loading}
              className="group relative overflow-hidden rounded-2xl border-2 border-accent bg-white p-6 text-center transition-all duration-300 hover:border-secondary hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:translate-y-0"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-secondary/0 to-secondary/5 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-4xl transition-transform duration-300 group-hover:scale-110">
                  🌍
                </div>
                <h2 className="mt-4 text-lg font-bold text-primary">Explore resorts</h2>
                <p className="mt-1 text-sm text-foreground/50">
                  Browse ski resorts and see what&apos;s out there
                </p>
              </div>
            </button>

            <button
              onClick={() => handleSave("profile")}
              disabled={loading}
              className="group relative overflow-hidden rounded-2xl border-2 border-secondary/40 bg-gradient-to-b from-secondary/5 to-secondary/10 p-6 text-center transition-all duration-300 hover:border-secondary hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:translate-y-0"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-secondary/0 to-secondary/10 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 text-4xl transition-transform duration-300 group-hover:scale-110">
                  📝
                </div>
                <h2 className="mt-4 text-lg font-bold text-primary">Finish my profile</h2>
                <p className="mt-1 text-sm text-foreground/50">
                  Stand out to employers
                </p>
                <span className="mt-3 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-bold text-white shadow-sm">
                  Recommended
                </span>
              </div>
            </button>
          </div>

          {loading && (
            <div className="mt-8 flex items-center justify-center gap-3 text-sm text-foreground/50">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-secondary" />
              <span className="animate-pulse">Setting up your profile...</span>
            </div>
          )}

          <button
            onClick={() => goBack(3)}
            disabled={loading}
            className="mt-6 flex items-center gap-2 text-sm font-semibold text-foreground/40 transition-colors hover:text-foreground/70 disabled:opacity-30"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      )}
    </div>
  );
}

const INDUSTRY_OPTIONS = [
  { value: "ski_school", label: "Ski / Snowboard School" },
  { value: "hospitality", label: "Hospitality" },
  { value: "food_beverage", label: "Food & Beverage" },
  { value: "retail", label: "Retail" },
  { value: "resort_operations", label: "Resort Operations" },
  { value: "accommodation", label: "Accommodation" },
  { value: "rental_shop", label: "Rental Shop" },
  { value: "transport", label: "Transport" },
  { value: "entertainment", label: "Entertainment" },
  { value: "cleaning_housekeeping", label: "Cleaning / Housekeeping" },
  { value: "construction_maintenance", label: "Construction / Maintenance" },
  { value: "childcare", label: "Childcare" },
  { value: "health_fitness", label: "Health & Fitness" },
  { value: "tourism", label: "Tourism / Adventure" },
  { value: "other", label: "Other" },
];

const BIZ_COUNTRIES = [
  "Australia", "Austria", "Canada", "Chile", "Finland", "France", "Germany",
  "Italy", "Japan", "New Zealand", "Norway", "South Korea", "Spain",
  "Sweden", "Switzerland", "United Kingdom", "United States", "Other",
];

function BusinessSetup({
  loading,
  setLoading,
  router,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [bizStep, setBizStep] = useState(1);
  const [slideDirection, setSlideDirection] = useState<"forward" | "back">("forward");
  const [businessName, setBusinessName] = useState("");
  const [industries, setIndustries] = useState<string[]>([]);
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("");
  const [resortQuery, setResortQuery] = useState("");
  const [allResorts, setAllResorts] = useState<{ id: string; name: string; country: string }[]>([]);
  const [resortSearchOpen, setResortSearchOpen] = useState(false);
  const [selectedResortId, setSelectedResortId] = useState<string | null>(null);
  const [selectedResortName, setSelectedResortName] = useState("");

  // Check if a string is a valid UUID
  const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const totalSteps = 5;

  const goForward = (step: number) => {
    setSlideDirection("forward");
    setBizStep(step);
  };
  const goBack = (step: number) => {
    setSlideDirection("back");
    setBizStep(step);
  };

  // Pre-fill business name from signup metadata
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata;
      if (meta?.business_name) {
        setBusinessName(meta.business_name);
      } else if (meta?.full_name) {
        setBusinessName(meta.full_name);
      }
    });
  }, []);

  // Load all resorts once on mount
  useEffect(() => {
    fetch("/api/search-resorts?all=1")
      .then((r) => r.json())
      .then((data) => setAllResorts(Array.isArray(data) ? data : []))
      .catch(() => setAllResorts([]));
  }, []);

  // Filter resorts by search query
  const filteredResorts = resortQuery.trim()
    ? allResorts.filter(
        (r) =>
          r.name.toLowerCase().includes(resortQuery.toLowerCase()) ||
          r.country.toLowerCase().includes(resortQuery.toLowerCase())
      )
    : allResorts;

  const toggleIndustry = (value: string) => {
    setIndustries((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Logo must be under 2MB"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSave = async (destination: "dashboard" | "profile") => {
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    // Upload logo if selected (optional — can be added later)
    let logoUrl: string | null = null;
    if (logoFile) {
      setUploading(true);
      try {
        const fileExt = logoFile.name.split(".").pop();
        const filePath = `${user.id}/logo.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, logoFile, { upsert: true });
        if (uploadError) {
          console.error("Logo upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
          logoUrl = urlData.publicUrl + "?t=" + Date.now();
        }
      } catch (err) {
        console.error("Logo upload failed:", err);
      }
      setUploading(false);
    }

    // Update user role
    const { error: userError } = await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata.full_name ?? businessName,
        role: "business_owner",
      },
      { onConflict: "id" }
    );

    if (userError) {
      console.error("User upsert error:", userError);
      alert(`Error saving user: ${userError.message}`);
      setLoading(false);
      return;
    }

    // Check if business profile already exists (e.g. retry)
    const { data: existingProfile } = await supabase
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    // Only include resort_id if it's a valid UUID (DB column may be uuid type)
    const safeResortId = selectedResortId && isUuid(selectedResortId) ? selectedResortId : null;

    if (existingProfile) {
      const { error: updateError } = await supabase
        .from("business_profiles")
        .update({
          business_name: businessName,
          industries: industries,
          website: website || null,
          address: address || null,
          location: location || null,
          country: country || null,
          resort_id: safeResortId,
          logo_url: logoUrl || undefined,
          email: user.email ?? null,
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Business profile update error:", updateError);
        alert(`Error updating profile: ${updateError.message}`);
        setLoading(false);
        return;
      }
    } else {
      const bizTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Denver";

      const { error: profileError } = await supabase.from("business_profiles").insert({
        user_id: user.id,
        business_name: businessName,
        industries: industries,
        website: website || null,
        address: address || null,
        location: location || null,
        country: country || null,
        resort_id: safeResortId,
        logo_url: logoUrl,
        email: user.email ?? null,
        is_verified: false,
        verification_status: "pending_review",
        timezone: bizTimezone,
      });

      if (profileError) {
        console.error("Business profile insert error:", profileError);
        alert(`Error saving profile: ${profileError.message}`);
        setLoading(false);
        return;
      }
    }

    // Send welcome email (non-blocking)
    fetch("/api/emails/welcome", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "business",
        email: user.email,
        name: businessName,
        profileUrl: `${window.location.origin}/business/company-profile`,
      }),
    }).catch((err) => console.error("Failed to send welcome email:", err));

    setLoading(false);
    router.push(destination === "profile" ? "/business/company-profile" : "/business/dashboard");
  };

  const slideClass = slideDirection === "forward"
    ? "animate-[slideInRight_0.4s_cubic-bezier(0.16,1,0.3,1)]"
    : "animate-[slideInLeft_0.4s_cubic-bezier(0.16,1,0.3,1)]";

  return (
    <div className="overflow-hidden">
      {/* Progress dots */}
      <div className="mb-10 flex items-center justify-center gap-3">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-500 ${
                i + 1 < bizStep
                  ? "bg-secondary text-white scale-90"
                  : i + 1 === bizStep
                  ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30"
                  : "bg-accent/30 text-foreground/30"
              }`}
            >
              {i + 1 < bizStep ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            {i < totalSteps - 1 && (
              <div className={`h-0.5 w-8 rounded-full transition-all duration-500 ${
                i + 1 < bizStep ? "bg-secondary" : "bg-accent/20"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Business Name & Logo */}
      {bizStep === 1 && (
        <div key="biz-step1" className={slideClass}>
          <div className="text-center">
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 animate-pulse rounded-full bg-secondary/20" />
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary text-3xl shadow-lg">
                🏢
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary">
              Let&apos;s set up your business
            </h1>
            <p className="mt-2 text-lg text-foreground/60">
              What&apos;s your business called?
            </p>
          </div>

          <div className="mt-10 space-y-6">
            {/* Logo upload */}
            <div className="flex flex-col items-center">
              <div
                onClick={() => logoInputRef.current?.click()}
                className="group relative flex h-24 w-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-accent bg-accent/10 transition-all duration-300 hover:border-secondary hover:bg-secondary/5 hover:scale-105 hover:shadow-lg"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center">
                    <svg className="mx-auto h-8 w-8 text-foreground/30 group-hover:text-secondary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                  </div>
                )}
              </div>
              <button type="button" onClick={() => logoInputRef.current?.click()} className="mt-2 text-xs font-medium text-secondary hover:underline">
                {logoPreview ? "Change logo" : "Upload logo"}
              </button>
              <p className="text-xs text-foreground/40">Optional — can add later</p>
              <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoSelect} className="hidden" />
            </div>

            {/* Business name */}
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-foreground/70 text-center">
                Business Name
              </label>
              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-2 w-full rounded-xl border-2 border-accent bg-white px-4 py-3 text-center text-lg font-medium text-primary placeholder-foreground/30 transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="Your business name"
                autoFocus
              />
            </div>
          </div>

          <div className="mt-10">
            <button
              onClick={() => goForward(2)}
              disabled={!businessName.trim()}
              className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Industry Selection */}
      {bizStep === 2 && (
        <div key="biz-step2" className={slideClass}>
          <div className="text-center">
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 animate-pulse rounded-full bg-secondary/20" />
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary text-3xl shadow-lg">
                🏷️
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary">
              What do you do?
            </h1>
            <p className="mt-2 text-lg text-foreground/60">
              Select all industries that apply to your business.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-2.5">
            {INDUSTRY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleIndustry(opt.value)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
                  industries.includes(opt.value)
                    ? "bg-secondary text-white shadow-md shadow-secondary/20 scale-105 -translate-y-0.5"
                    : "bg-white border-2 border-accent text-foreground/60 hover:border-secondary/50 hover:bg-secondary/5 hover:-translate-y-0.5"
                }`}
              >
                {industries.includes(opt.value) && (
                  <svg className="mr-1.5 -ml-0.5 inline h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {opt.label}
              </button>
            ))}
          </div>

          {industries.length > 0 && (
            <p className="mt-4 text-center text-sm text-secondary font-medium animate-[slideInRight_0.3s_ease-out]">
              {industries.length} {industries.length === 1 ? "industry" : "industries"} selected
            </p>
          )}

          <div className="mt-10 flex items-center gap-4">
            <button
              onClick={() => goBack(1)}
              className="flex items-center gap-2 text-sm font-semibold text-foreground/40 transition-colors hover:text-foreground/70"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={() => goForward(3)}
              disabled={industries.length === 0}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Location */}
      {bizStep === 3 && (
        <div key="biz-step3" className={slideClass}>
          <div className="text-center">
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 animate-pulse rounded-full bg-secondary/20" />
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary text-3xl shadow-lg">
                📍
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary">
              Where are you based?
            </h1>
            <p className="mt-2 text-lg text-foreground/60">
              Tell us where your business is located.
            </p>
          </div>

          <div className="mt-10 space-y-5">
            {/* Country */}
            <div>
              <label htmlFor="bizCountry" className="block text-sm font-medium text-foreground/70">
                Country *
              </label>
              <select
                id="bizCountry"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1.5 w-full rounded-xl border-2 border-accent bg-white px-4 py-3 text-sm text-primary transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              >
                <option value="">Select a country</option>
                {BIZ_COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Town / Village */}
            <div>
              <label htmlFor="bizLocation" className="block text-sm font-medium text-foreground/70">
                Town / Village
              </label>
              <input
                id="bizLocation"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1.5 w-full rounded-xl border-2 border-accent bg-white px-4 py-3 text-sm text-primary placeholder-foreground/30 transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="e.g. Whistler, Chamonix, Queenstown"
              />
            </div>

            {/* Business Address */}
            <div>
              <label htmlFor="bizAddress" className="block text-sm font-medium text-foreground/70">
                Street Address <span className="text-foreground/40">(optional)</span>
              </label>
              <input
                id="bizAddress"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1.5 w-full rounded-xl border-2 border-accent bg-white px-4 py-3 text-sm text-primary placeholder-foreground/30 transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="e.g. 123 Mountain Road"
              />
            </div>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <button
              onClick={() => goBack(2)}
              className="flex items-center gap-2 text-sm font-semibold text-foreground/40 transition-colors hover:text-foreground/70"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={() => goForward(4)}
              disabled={!country}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Resort & Website */}
      {bizStep === 4 && (
        <div key="biz-step4" className={slideClass}>
          <div className="text-center">
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 animate-pulse rounded-full bg-secondary/20" />
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br from-secondary to-primary text-3xl shadow-lg">
                🏔️
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary">
              A few more details
            </h1>
            <p className="mt-2 text-lg text-foreground/60">
              These are optional — you can always add them later.
            </p>
          </div>

          <div className="mt-10 space-y-5">
            {/* Resort dropdown with search */}
            <div className="relative">
              <label htmlFor="bizResort" className="block text-sm font-medium text-foreground/70">
                Associated Resort
              </label>
              <p className="mt-0.5 text-xs text-foreground/40">Link your business to a ski resort on our platform</p>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 mt-0.5 pointer-events-none">
                  <svg className="h-4 w-4 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  id="bizResort"
                  type="text"
                  value={resortSearchOpen ? resortQuery : selectedResortName || resortQuery}
                  onChange={(e) => {
                    setResortQuery(e.target.value);
                    if (!resortSearchOpen) setResortSearchOpen(true);
                  }}
                  placeholder="Search resorts..."
                  className="mt-1.5 w-full rounded-xl border-2 border-accent bg-white pl-10 pr-4 py-3 text-sm text-primary placeholder-foreground/30 transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  onFocus={() => setResortSearchOpen(true)}
                  onBlur={() => setTimeout(() => setResortSearchOpen(false), 200)}
                />
                {selectedResortId && !resortSearchOpen && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Linked
                  </span>
                )}
                {!selectedResortId && !resortSearchOpen && (
                  <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 mt-0.5 h-4 w-4 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
              {resortSearchOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border-2 border-accent bg-white shadow-xl max-h-56 overflow-y-auto">
                  {/* Clear selection option */}
                  {selectedResortId && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 border-b border-accent/50 px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 transition-colors"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedResortName("");
                        setSelectedResortId(null);
                        setResortQuery("");
                        setResortSearchOpen(false);
                      }}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear selection
                    </button>
                  )}
                  {filteredResorts.length > 0 ? (
                    filteredResorts.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                          selectedResortId === r.id
                            ? "bg-secondary/10 text-secondary"
                            : "hover:bg-accent/20 text-foreground"
                        }`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedResortName(r.name);
                          setSelectedResortId(r.id);
                          setResortQuery("");
                          setResortSearchOpen(false);
                        }}
                      >
                        <svg className={`h-4 w-4 shrink-0 ${selectedResortId === r.id ? "text-secondary" : "text-foreground/30"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-primary">{r.name}</span>
                        </div>
                        <span className="shrink-0 text-xs text-foreground/40">{r.country}</span>
                        {selectedResortId === r.id && (
                          <svg className="h-4 w-4 shrink-0 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-center text-sm text-foreground/40">
                      <svg className="mx-auto mb-2 h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      No resorts found for &ldquo;{resortQuery}&rdquo;
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-foreground/70">
                Website
              </label>
              <input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="mt-1.5 w-full rounded-xl border-2 border-accent bg-white px-4 py-3 text-sm text-primary placeholder-foreground/30 transition-all focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="https://yourbusiness.com"
              />
            </div>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <button
              onClick={() => goBack(3)}
              className="flex items-center gap-2 text-sm font-semibold text-foreground/40 transition-colors hover:text-foreground/70"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={() => goForward(5)}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 5: All set! */}
      {bizStep === 5 && (
        <div key="biz-step5" className={slideClass}>
          <div className="text-center">
            <div className="relative mx-auto mb-6 h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-green-100 animate-ping opacity-20" />
              <div className="absolute inset-0 animate-pulse rounded-full bg-green-100/50" />
              <div className="absolute inset-2 flex items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-secondary text-3xl shadow-lg">
                🚀
              </div>
            </div>
            <h1 className="text-3xl font-bold text-primary">
              You&apos;re all set!
            </h1>
            <p className="mt-2 text-lg text-foreground/60">
              Here&apos;s a summary of your business.
            </p>
          </div>

          {/* Summary card */}
          <div className="mt-8 rounded-2xl border-2 border-accent bg-gradient-to-br from-white to-accent/10 p-6">
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-14 w-14 rounded-xl object-cover shadow-sm" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/20 text-2xl">
                  🏢
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-primary">{businessName}</h3>
                <p className="text-sm text-foreground/50">
                  {location && country ? `${location}, ${country}` : country || "Location not set"}
                </p>
              </div>
            </div>

            {industries.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {industries.map((ind) => {
                  const label = INDUSTRY_OPTIONS.find((o) => o.value === ind)?.label || ind;
                  return (
                    <span key={ind} className="rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                      {label}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="mt-4 space-y-1.5">
              {address && (
                <p className="flex items-center gap-2 text-xs text-foreground/50">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                  {address}
                </p>
              )}
              {selectedResortName && (
                <p className="flex items-center gap-2 text-xs text-foreground/50">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                  {selectedResortName}
                </p>
              )}
              {website && (
                <p className="flex items-center gap-2 text-xs text-foreground/50">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  {website}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              onClick={() => handleSave("dashboard")}
              disabled={loading || uploading}
              className="group relative overflow-hidden rounded-2xl border-2 border-accent bg-white p-5 text-center transition-all duration-300 hover:border-secondary hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:translate-y-0"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-secondary/0 to-secondary/5 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 text-3xl transition-transform duration-300 group-hover:scale-110">
                  📊
                </div>
                <h2 className="mt-3 text-base font-bold text-primary">Go to Dashboard</h2>
                <p className="mt-1 text-xs text-foreground/50">
                  Start managing your business
                </p>
              </div>
            </button>

            <button
              onClick={() => handleSave("profile")}
              disabled={loading || uploading}
              className="group relative overflow-hidden rounded-2xl border-2 border-secondary/40 bg-gradient-to-b from-secondary/5 to-secondary/10 p-5 text-center transition-all duration-300 hover:border-secondary hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 disabled:translate-y-0"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-secondary/0 to-secondary/10 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 text-3xl transition-transform duration-300 group-hover:scale-110">
                  ✏️
                </div>
                <h2 className="mt-3 text-base font-bold text-primary">Complete Profile</h2>
                <p className="mt-1 text-xs text-foreground/50">
                  Add more details & submit for verification
                </p>
                <span className="mt-2 inline-block rounded-full bg-secondary px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                  Recommended
                </span>
              </div>
            </button>
          </div>

          {(loading || uploading) && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm text-foreground/50">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-secondary" />
              <span className="animate-pulse">{uploading ? "Uploading logo..." : "Setting up your business..."}</span>
            </div>
          )}

          <button
            onClick={() => goBack(4)}
            disabled={loading || uploading}
            className="mt-6 flex items-center gap-2 text-sm font-semibold text-foreground/40 transition-colors hover:text-foreground/70 disabled:opacity-30"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>
      )}
    </div>
  );
}

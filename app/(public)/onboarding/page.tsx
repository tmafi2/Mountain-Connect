"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const initialStep: "role" | "worker" | "business" =
    typeParam === "business" ? "business" : typeParam === "worker" ? "worker" : "role";
  const [step, setStep] = useState<"role" | "worker" | "business">(initialStep);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    await supabase.from("worker_profiles").insert({
      user_id: user.id,
      bio: discipline === "snowboarder" ? "Snowboarder" : discipline === "skier" ? "Skier" : "",
      years_seasonal_experience: experience === "first_season" ? 0 : 1,
      preferred_job_types: lookingForJob ? ["full_time"] : [],
      housing_preference: lookingForAccommodation ? "staff_housing" : "no_preference",
      work_history: [],
    });

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
                <h3 className="text-lg font-bold text-primary">A job</h3>
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

function BusinessSetup({
  loading,
  setLoading,
  router,
}: {
  loading: boolean;
  setLoading: (v: boolean) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      role: "business_owner",
    });

    // Create business profile
    await supabase.from("business_profiles").insert({
      user_id: user.id,
      business_name: businessName,
      description: description || null,
      website: website || null,
      location: location || null,
      email: user.email ?? null,
      is_verified: false,
      verification_status: "unverified",
    });

    setLoading(false);
    router.push("/business/dashboard"); // business portal
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary">Set up your business</h1>
      <p className="mt-2 text-foreground">
        Register your business to start posting jobs and finding staff.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-foreground">
            Business Name
          </label>
          <input
            id="businessName"
            type="text"
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary placeholder-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            placeholder="Your business name"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary placeholder-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            placeholder="What does your business do?"
          />
        </div>

        <div>
          <label htmlFor="website" className="block text-sm font-medium text-foreground">
            Website
          </label>
          <input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary placeholder-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            placeholder="https://yourbusiness.com"
          />
        </div>

        <div>
          <label htmlFor="bizLocation" className="block text-sm font-medium text-foreground">
            Location
          </label>
          <input
            id="bizLocation"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary placeholder-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            placeholder="City, Country"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Saving…" : "Complete Setup"}
        </button>
      </form>
    </div>
  );
}

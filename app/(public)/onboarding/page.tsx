"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";

export default function OnboardingPage() {
  const [step, setStep] = useState<"role" | "worker" | "business">("role");
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
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
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
      role: "worker",
    });

    // Create worker profile
    await supabase.from("worker_profiles").insert({
      user_id: user.id,
      bio,
      skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
      location,
      work_history: [],
    });

    setLoading(false);
    router.push("/dashboard"); // worker portal
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-primary">Set up your worker profile</h1>
      <p className="mt-2 text-foreground">
        Tell us about yourself so businesses can find you.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-foreground">
            Bio
          </label>
          <textarea
            id="bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary placeholder-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            placeholder="Tell us about your experience and what you're looking for"
          />
        </div>

        <div>
          <label htmlFor="skills" className="block text-sm font-medium text-foreground">
            Skills (comma-separated)
          </label>
          <input
            id="skills"
            type="text"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary placeholder-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            placeholder="Bartending, Ski Instruction, Customer Service"
          />
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-foreground">
            Current Location
          </label>
          <input
            id="location"
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
      description,
      website,
      location,
      is_verified: false,
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

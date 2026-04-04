"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LAUNCH_LOCATION_NAMES } from "@/lib/config/launch-locations";

type AccountType = "worker" | "business";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" /></div>}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");
  const [accountType, setAccountType] = useState<AccountType>("worker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Business resort selection
  const [allResorts, setAllResorts] = useState<{ id: string; name: string; country: string }[]>([]);
  const [selectedResortId, setSelectedResortId] = useState<string>("");
  const [resortSearch, setResortSearch] = useState("");
  const [showResortDropdown, setShowResortDropdown] = useState(false);

  // Load resorts on mount
  useState(() => {
    fetch("/api/search-resorts?all=1")
      .then((r) => r.json())
      .then((data) => setAllResorts(Array.isArray(data) ? data : []))
      .catch(() => {});
  });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const fullName = accountType === "business" ? firstName.trim() : `${firstName.trim()} ${lastName.trim()}`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            business_name: accountType === "business" ? firstName.trim() : undefined,
            account_type: accountType,
            signup_resort_id: accountType === "business" && selectedResortId ? selectedResortId : undefined,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?type=${accountType}`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Create the users table row NOW with the correct role
      // This ensures the role is locked in at signup, not at email confirmation
      if (signUpData.user) {
        const role = accountType === "business" ? "business_owner" : "worker";
        await supabase.from("users").upsert(
          {
            id: signUpData.user.id,
            email: email,
            full_name: fullName,
            role: role,
          },
          { onConflict: "id" }
        );
      }

      // Record referral if applicable
      if (refCode && signUpData.user) {
        fetch("/api/referrals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            referralCode: refCode,
            referredUserId: signUpData.user.id,
            referralType: accountType === "business" ? "business" : "worker",
          }),
        }).catch(() => {});
      }

      // Sign out immediately — user must verify email before logging in
      await supabase.auth.signOut();

      router.push("/signup-confirmation");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?type=${accountType}`,
      },
    });
  };

  return (
    <div className="relative flex min-h-screen">
      {/* Left — mountain image panel */}
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80"
          alt="Snowy mountain peaks"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-primary/30" />

        {/* Branding overlay */}
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Mountain Connect" width={40} height={40} />
            <span className="text-xl font-bold text-white">Mountain Connect</span>
          </Link>

          <div className="max-w-md">
            <h2 className="text-4xl font-extrabold leading-tight text-white">
              Find your season.
              <br />
              <span className="text-secondary">Find your mountain.</span>
            </h2>
            <p className="mt-4 text-base text-white/70">
              Whether you&apos;re a seasonal worker chasing powder or a business
              building your dream team — Mountain Connect brings it all together.
            </p>

            {/* Testimonial-style callout */}
            <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <p className="text-sm italic text-white/80">
                &ldquo;Mountain Connect made it so easy to find my dream ski instructor
                job in Whistler. Best season of my life!&rdquo;
              </p>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary/30 text-xs font-bold text-white">
                  EJ
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Emma Johansson</p>
                  <p className="text-xs text-white/40">Ski Instructor, Whistler</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Mountain Connect
          </p>
        </div>
      </div>

      {/* Right — signup form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Image src="/logo.svg" alt="Mountain Connect" width={32} height={32} />
            <span className="text-lg font-bold text-primary">Mountain Connect</span>
          </div>

          <h1 className="text-3xl font-extrabold text-primary">Create your account</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Join Mountain Connect and start your next mountain adventure.
          </p>

          {/* Account type toggle */}
          <div className="mt-6 flex items-center rounded-xl border border-accent bg-accent/20 p-1">
            <button
              type="button"
              onClick={() => setAccountType("worker")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                accountType === "worker"
                  ? "bg-white text-primary shadow-sm"
                  : "text-foreground/50 hover:text-foreground/70"
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Seasonal Worker
            </button>
            <button
              type="button"
              onClick={() => setAccountType("business")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                accountType === "business"
                  ? "bg-white text-primary shadow-sm"
                  : "text-foreground/50 hover:text-foreground/70"
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
              Business
            </button>
          </div>


          {/* Google OAuth — prominent */}
          <button
            onClick={handleGoogleSignup}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-accent bg-white py-3 text-sm font-semibold text-primary shadow-sm transition-all hover:border-secondary/30 hover:shadow-md"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-accent" />
            <span className="text-xs font-medium text-foreground/30">or sign up with email</span>
            <div className="h-px flex-1 bg-accent" />
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            {accountType === "business" ? (
              <div>
                <label htmlFor="businessName" className="block text-sm font-medium text-foreground/70">
                  Business name
                </label>
                <div className="relative mt-1.5">
                  <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                  <input
                    id="businessName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setLastName(""); }}
                    className="w-full rounded-xl border border-accent bg-white py-3 pl-11 pr-4 text-sm text-primary placeholder-foreground/30 transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                    placeholder="Your business name"
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label htmlFor="firstName" className="block text-sm font-medium text-foreground/70">
                    First name
                  </label>
                  <div className="relative mt-1.5">
                    <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <input
                      id="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-xl border border-accent bg-white py-3 pl-11 pr-4 text-sm text-primary placeholder-foreground/30 transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                      placeholder="First"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label htmlFor="lastName" className="block text-sm font-medium text-foreground/70">
                    Last name
                  </label>
                  <div className="relative mt-1.5">
                    <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                    <input
                      id="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-xl border border-accent bg-white py-3 pl-11 pr-4 text-sm text-primary placeholder-foreground/30 transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                      placeholder="Last"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Resort selector — business only */}
            {accountType === "business" && (
              <div>
                <label className="block text-sm font-medium text-foreground/70">
                  Associated Ski Resort <span className="text-red-400">*</span>
                </label>
                <div className="relative mt-1.5">
                  <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30 pointer-events-none z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M3 10h18M3 7l9-4 9 4" />
                  </svg>
                  {selectedResortId ? (
                    <div className="flex items-center rounded-xl border border-green-400 bg-green-50/30 py-3 pl-11 pr-3">
                      <span className="flex-1 text-sm font-medium text-primary">
                        {allResorts.find((r) => r.id === selectedResortId)?.name || "Selected"}
                      </span>
                      <button type="button" onClick={() => { setSelectedResortId(""); setResortSearch(""); }} className="text-foreground/40 hover:text-red-500">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={resortSearch}
                        onChange={(e) => { setResortSearch(e.target.value); setShowResortDropdown(true); }}
                        onFocus={() => setShowResortDropdown(true)}
                        onBlur={() => setTimeout(() => setShowResortDropdown(false), 200)}
                        className="w-full rounded-xl border border-accent bg-white py-3 pl-11 pr-4 text-sm text-primary placeholder-foreground/30 transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                        placeholder="Search for your closest ski resort..."
                      />
                      {showResortDropdown && (
                        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-accent bg-white shadow-lg">
                          {allResorts
                            .filter((r) => !resortSearch.trim() || r.name.toLowerCase().includes(resortSearch.toLowerCase()) || r.country.toLowerCase().includes(resortSearch.toLowerCase()))
                            .slice(0, 8)
                            .map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { setSelectedResortId(r.id); setResortSearch(""); setShowResortDropdown(false); }}
                                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-accent/20 transition-colors"
                              >
                                <span className="font-medium text-primary">{r.name}</span>
                                <span className="text-xs text-foreground/40">{r.country}</span>
                              </button>
                            ))}
                          {allResorts.filter((r) => !resortSearch.trim() || r.name.toLowerCase().includes(resortSearch.toLowerCase())).length === 0 && (
                            <p className="px-4 py-3 text-sm text-foreground/40">No resorts found</p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs text-foreground/40">
                  Mountain Connect is currently live in {LAUNCH_LOCATION_NAMES}. Businesses in other locations can still sign up and prepare their profiles — we&apos;ll be launching in more areas soon!
                </p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground/70">
                Email address
              </label>
              <div className="relative mt-1.5">
                <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-accent bg-white py-3 pl-11 pr-4 text-sm text-primary placeholder-foreground/30 transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  placeholder={accountType === "business" ? "Work email required" : "you@example.com"}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground/70">
                Password
              </label>
              <div className="relative mt-1.5">
                <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-accent bg-white py-3 pl-11 pr-11 text-sm text-primary placeholder-foreground/30 transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
                >
                  {showPassword ? (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-foreground/30">Must be at least 6 characters</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                accountType === "business" ? "Create Business Account" : "Create Account"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-foreground/30">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="underline hover:text-foreground/50">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-foreground/50">Privacy Policy</Link>.
          </p>

          <p className="mt-4 text-center text-sm text-foreground/50">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:text-secondary">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

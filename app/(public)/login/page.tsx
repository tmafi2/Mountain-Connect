"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Turnstile } from "@marsidev/react-turnstile";

type LoginType = "worker" | "business";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [loginType, setLoginType] = useState<LoginType>("worker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [businessClickCount, setBusinessClickCount] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [turnstileError, setTurnstileError] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const inactiveLogout = searchParams.get("reason") === "inactive";

  // Show errors from URL (e.g., Google OAuth role mismatch)
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError && urlError !== "auth_failed") {
      setError(decodeURIComponent(urlError));
    } else if (urlError === "auth_failed") {
      setError("Authentication failed. Please try again.");
    }
  }, [searchParams]);

  const handleBusinessClick = () => {
    setLoginType("business");
    const newCount = businessClickCount + 1;
    setBusinessClickCount(newCount);
    if (newCount >= 5) {
      setShowAdminLogin(true);
      setBusinessClickCount(0);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminLoading(true);

    try {
      // Check 2FA via server-side API
      const checkRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });

      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        setAdminError(checkData.error || "Invalid credentials");
        return;
      }

      if (checkData.requires2fa) {
        sessionStorage.setItem("2fa_password", adminPassword);
        router.push(`/login/verify?email=${encodeURIComponent(adminEmail)}&type=admin`);
        return;
      }

      // No 2FA — proceed normally
      const supabase = createClient();
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: adminPassword,
      });

      if (signInError) {
        setAdminError(signInError.message);
        return;
      }

      // Verify user has admin role
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", signInData.user.id)
        .single();

      if (userData?.role !== "admin") {
        await supabase.auth.signOut();
        setAdminError("Access denied. Admin privileges required.");
        return;
      }

      router.push("/admin/dashboard");
    } catch {
      setAdminError("Something went wrong. Please try again.");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // First check if user has 2FA enabled via server-side API
      const checkRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, turnstileToken }),
      });

      const checkData = await checkRes.json();

      if (!checkRes.ok) {
        setError(checkData.error || "Invalid email or password");
        return;
      }

      // If 2FA required, redirect to verification page
      if (checkData.requires2fa) {
        // Store password temporarily for post-2FA sign-in (cleared after use)
        sessionStorage.setItem("2fa_password", password);
        router.push(`/login/verify?email=${encodeURIComponent(email)}&type=${loginType}`);
        return;
      }

      // No 2FA — proceed with normal client-side sign in
      const supabase = createClient();
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Check user's actual role from the database
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", signInData.user.id)
        .single();

      const role = userData?.role;

      // Admin can access any portal
      if (role === "admin") {
        if (loginType === "business") {
          router.push("/business/dashboard");
        } else {
          router.push("/dashboard");
        }
        return;
      }

      // Enforce role matches the selected login type
      if (loginType === "business" && role !== "business_owner") {
        await supabase.auth.signOut();
        setError("This account is registered as a worker. Please use the Seasonal Worker login.");
        return;
      }

      if (loginType === "worker" && role === "business_owner") {
        await supabase.auth.signOut();
        setError("This account is registered as a business. Please use the Business login.");
        return;
      }

      // Check if user needs onboarding (no profile yet)
      if (role === "business_owner") {
        const { data: bizProfile } = await supabase
          .from("business_profiles")
          .select("id")
          .eq("user_id", signInData.user.id)
          .single();
        if (!bizProfile) {
          router.push("/onboarding?type=business");
          return;
        }
        router.push("/business/dashboard");
      } else {
        const { data: workerProfile } = await supabase
          .from("worker_profiles")
          .select("id")
          .eq("user_id", signInData.user.id)
          .single();
        if (!workerProfile) {
          router.push("/onboarding?type=worker");
          return;
        }
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?type=${loginType}`,
      },
    });
  };

  return (
    <div className="relative flex min-h-screen">
      {/* Left — mountain image panel */}
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src="https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=1200&q=80"
          alt="Mountain landscape"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-primary/30" />

        {/* Branding overlay */}
        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/Logo.jpeg" alt="Mountain Connects" width={40} height={40} className="rounded-lg" />
            <span className="text-xl font-bold text-white">Mountain Connects</span>
          </Link>

          <div className="max-w-md">
            <h2 className="text-4xl font-extrabold leading-tight text-white">
              Your next season
              <br />
              <span className="text-secondary">starts here.</span>
            </h2>
            <p className="mt-4 text-base text-white/70">
              Connect with ski resorts worldwide. Find seasonal work, housing,
              and your mountain community.
            </p>

            {/* Stats */}
            <div className="mt-8 flex gap-8">
              <div>
                <p className="text-2xl font-bold text-white">69</p>
                <p className="text-sm text-white/50">Resorts</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">12</p>
                <p className="text-sm text-white/50">Countries</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">50+</p>
                <p className="text-sm text-white/50">Mountain Towns</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Mountain Connects
          </p>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Image src="/images/Logo.jpeg" alt="Mountain Connects" width={32} height={32} className="rounded-md" />
            <span className="text-lg font-bold text-primary">Mountain Connects</span>
          </div>

          {inactiveLogout && (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-center gap-3">
              <svg className="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-amber-700">You were logged out due to inactivity. Please sign in again.</p>
            </div>
          )}

          <h1 className="text-3xl font-extrabold text-primary">Welcome back</h1>
          <p className="mt-2 text-sm text-foreground/60">
            Log in to continue your mountain adventure.
          </p>

          {/* Login type toggle */}
          <div className="mt-6 flex items-center rounded-xl border border-accent bg-accent/20 p-1">
            <button
              type="button"
              onClick={() => { setLoginType("worker"); setBusinessClickCount(0); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                loginType === "worker"
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
              onClick={handleBusinessClick}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                loginType === "business"
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
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-accent bg-white py-3 text-sm font-semibold text-primary shadow-sm transition-all hover:border-secondary/30 hover:shadow-md disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {loading ? "Redirecting..." : "Continue with Google"}
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-accent" />
            <span className="text-xs font-medium text-foreground/30">or sign in with email</span>
            <div className="h-px flex-1 bg-accent" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-foreground/70">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-medium text-secondary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-accent bg-white py-3 pl-11 pr-11 text-sm text-primary placeholder-foreground/30 transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  placeholder="Your password"
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
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {error}
              </div>
            )}

            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileError && (
              <div className="flex justify-center">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onSuccess={setTurnstileToken}
                  onExpire={() => setTurnstileToken("")}
                  onError={() => setTurnstileError(true)}
                />
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
                  Logging in...
                </span>
              ) : (
                loginType === "business" ? "Log In as Business" : "Log In"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-foreground/50">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:text-secondary">
              Create one
            </Link>
          </p>

          {/* Hidden Admin Login — appears after 5 clicks on Business */}
          {showAdminLogin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="relative w-full max-w-sm rounded-2xl border border-red-500/20 bg-[#0a1e33] p-8 shadow-2xl">
                <button
                  onClick={() => { setShowAdminLogin(false); setAdminError(null); }}
                  className="absolute right-4 top-4 text-white/40 hover:text-white/70"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Admin Access</h2>
                    <p className="text-xs text-white/40">Restricted area</p>
                  </div>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/50">Email</label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      placeholder="admin@mountainconnects.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/50">Password</label>
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-red-500/50 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                      placeholder="Enter admin password"
                    />
                  </div>

                  {adminError && (
                    <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs text-red-300">
                      {adminError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={adminLoading}
                    className="w-full rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-red-500 disabled:opacity-50"
                  >
                    {adminLoading ? "Verifying..." : "Access Admin Portal"}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Test Portal Buttons — dev only */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-8 rounded-xl border border-dashed border-secondary/30 bg-secondary/5 p-4">
              <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-widest text-foreground/30">
                Test Portals
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push("/dashboard?test=true")}
                  className="flex-1 rounded-lg border border-accent bg-white py-2 text-xs font-semibold text-primary transition-colors hover:bg-accent/20"
                >
                  Worker
                </button>
                <button
                  onClick={() => router.push("/business/dashboard?test=true")}
                  className="flex-1 rounded-lg border border-accent bg-white py-2 text-xs font-semibold text-primary transition-colors hover:bg-accent/20"
                >
                  Business
                </button>
                <button
                  onClick={() => router.push("/admin/dashboard?test=true")}
                  className="flex-1 rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                >
                  Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/utils/password";
import PasswordStrength from "@/components/ui/PasswordStrength";

function ResetPasswordContent() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      setCheckingSession(false);
    }
    checkSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      setError("Password must meet all requirements: " + passwordCheck.errors.join(", "));
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) throw updateError;

      // Get user role to redirect to the correct dashboard
      const { data: { user } } = await supabase.auth.getUser();
      let redirectPath = "/dashboard";

      if (user) {
        const { data: userData } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (userData?.role === "business_owner") {
          redirectPath = "/business/dashboard";
        } else if (userData?.role === "admin") {
          redirectPath = "/admin/dashboard";
        }
      }

      setSuccess(true);
      setTimeout(() => router.push(redirectPath), 2000);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50">
          <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-primary">Link expired or invalid</h1>
        <p className="mt-3 text-sm text-foreground/60">
          This password reset link has expired or is no longer valid. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
        >
          Request new reset link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50">
          <svg className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-primary">Password updated!</h1>
        <p className="mt-3 text-sm text-foreground/60">
          Your password has been changed successfully. Redirecting you to your dashboard...
        </p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold text-primary">Set new password</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Enter your new password below. Make sure it&apos;s at least 6 characters.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground/70">
            New password
          </label>
          <div className="relative mt-1.5">
            <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-accent bg-white py-3 pl-11 pr-11 text-sm text-primary placeholder-foreground/30 transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Create a strong password"
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
          <PasswordStrength password={password} />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-foreground/70">
            Confirm new password
          </label>
          <div className="relative mt-1.5">
            <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-accent bg-white py-3 pl-11 pr-11 text-sm text-primary placeholder-foreground/30 transition-colors focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
              placeholder="Re-enter your new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
            >
              {showConfirm ? (
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

        {/* Password match indicator */}
        {confirmPassword.length > 0 && (
          <div className={`flex items-center gap-2 text-xs ${password === confirmPassword ? "text-green-600" : "text-red-500"}`}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              {password === confirmPassword ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              )}
            </svg>
            {password === confirmPassword ? "Passwords match" : "Passwords do not match"}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || password !== confirmPassword || password.length < 6}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Saving...
            </span>
          ) : (
            "Save New Password"
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-foreground/50">
        <Link href="/login" className="font-semibold text-primary hover:text-secondary">
          Back to login
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
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

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/Logo.jpeg" alt="Mountain Connect" width={40} height={40} className="rounded-lg" />
            <span className="text-xl font-bold text-white">Mountain Connect</span>
          </Link>

          <div className="max-w-md">
            <h2 className="text-4xl font-extrabold leading-tight text-white">
              Secure your
              <br />
              <span className="text-secondary">account.</span>
            </h2>
            <p className="mt-4 text-base text-white/70">
              Choose a strong password to keep your Mountain Connect account safe.
            </p>
          </div>

          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} Mountain Connect
          </p>
        </div>
      </div>

      {/* Right — reset form */}
      <div className="flex w-full items-center justify-center px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Image src="/images/Logo.jpeg" alt="Mountain Connect" width={32} height={32} className="rounded-lg" />
            <span className="text-lg font-bold text-primary">Mountain Connect</span>
          </div>

          <Suspense fallback={
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
            </div>
          }>
            <ResetPasswordContent />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

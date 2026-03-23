"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Redirect to correct portal based on role
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .single();
      if (userData?.role === "business_owner") {
        router.push("/business/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-primary">Welcome back</h1>
        <p className="mt-2 text-foreground">
          Log in to your Mountain Connect account.
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary placeholder-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary placeholder-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              placeholder="Your password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-accent" />
          <span className="text-xs text-foreground/50">or</span>
          <div className="h-px flex-1 bg-accent" />
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          className="w-full rounded-lg border border-accent bg-white py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
        >
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>

        {/* Test Portal Buttons */}
        <div className="mt-8 rounded-xl border border-dashed border-secondary/50 bg-secondary/5 p-5">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-foreground/40">
            Test Portals
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/dashboard?test=true")}
              className="flex-1 rounded-lg border border-secondary bg-secondary/10 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-secondary/20"
            >
              Worker
            </button>
            <button
              onClick={() => router.push("/business/dashboard?test=true")}
              className="flex-1 rounded-lg border border-secondary bg-secondary/10 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-secondary/20"
            >
              Business
            </button>
            <button
              onClick={() => router.push("/admin/dashboard?test=true")}
              className="flex-1 rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

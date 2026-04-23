"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const loginType = searchParams.get("type") || "worker";

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newCode = [...code];
    for (let i = 0; i < pasted.length; i++) {
      newCode[i] = pasted[i];
    }
    setCode(newCode);
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setError("Please enter the full 6-digit code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const password = sessionStorage.getItem("2fa_password") || "";

      const res = await fetch("/api/auth/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fullCode, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verification failed");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }

      // Code verified — now do the actual Supabase sign in on the client
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // Clean up
      sessionStorage.removeItem("2fa_password");

      if (signInError) {
        setError("Login failed. Please try again.");
        setLoading(false);
        return;
      }

      // Redirect based on login type
      if (loginType === "business") {
        router.push("/business/dashboard");
      } else if (loginType === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    try {
      const res = await fetch("/api/auth/verify-2fa", { method: "PUT" });
      if (res.ok) {
        setResent(true);
        setTimeout(() => setResent(false), 5000);
      } else {
        setError("Failed to resend code. Please try logging in again.");
      }
    } catch {
      setError("Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Image src="/images/logo-source.png" alt="Mountain Connects" width={32} height={32} className="rounded-md" />
          <span className="text-lg font-bold text-primary">Mountain Connects</span>
        </div>

        <div className="rounded-2xl border border-accent bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10">
              <svg className="h-7 w-7 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-primary">Check your email</h1>
            <p className="mt-2 text-sm text-foreground/60">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-primary">{email || "your email"}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* 6-digit code input */}
            <div className="mb-6 flex justify-center gap-2" onPaste={handlePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="h-12 w-12 rounded-xl border border-accent bg-white text-center text-xl font-bold text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
              ))}
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-center text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.join("").length !== 6}
              className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify & Log In"}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs text-foreground/40">
              Didn&apos;t receive the code?{" "}
              <button
                onClick={handleResend}
                disabled={resending || resent}
                className="font-medium text-secondary hover:underline disabled:opacity-50"
              >
                {resending ? "Sending..." : resent ? "Code sent!" : "Resend code"}
              </button>
            </p>
            <p className="mt-3 text-xs text-foreground/30">
              Code expires in 10 minutes
            </p>
          </div>

          <div className="mt-6 border-t border-accent pt-4 text-center">
            <Link href="/login" className="text-xs font-medium text-foreground/40 hover:text-foreground/60">
              ← Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

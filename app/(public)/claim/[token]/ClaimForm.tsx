"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordStrength from "@/components/ui/PasswordStrength";
import { validatePassword } from "@/lib/utils/password";

interface ClaimFormProps {
  claimToken: string;
  businessName: string;
  defaultEmail: string;
}

export default function ClaimForm({ claimToken, businessName, defaultEmail }: ClaimFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pwCheck = validatePassword(password);
    if (!pwCheck.isValid) {
      setError("Password must meet all requirements: " + pwCheck.errors.join(", "));
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/claim/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimToken, email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Could not complete claim. Please try again.");
        setSubmitting(false);
        return;
      }
      router.push(data.redirectUrl || "/login?claimed=1");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-base font-bold text-primary">Create your account for {businessName}</h2>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/50">
          Email *
        </label>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          className="mt-1 w-full rounded-xl border border-accent/50 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-50"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/50">
          Password *
        </label>
        <input
          required
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={submitting}
          placeholder="Min 8 characters"
          className="mt-1 w-full rounded-xl border border-accent/50 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-50"
        />
        {password && <PasswordStrength password={password} />}
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/50">
          Confirm password *
        </label>
        <input
          required
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={submitting}
          className="mt-1 w-full rounded-xl border border-accent/50 bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-50"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !email.trim() || !password || !confirmPassword}
        className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition-all hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50"
      >
        {submitting ? "Claiming listing..." : `Claim ${businessName}`}
      </button>

      <p className="text-xs text-foreground/50">
        By claiming, you agree to Mountain Connects&apos; terms of service.
      </p>
    </form>
  );
}

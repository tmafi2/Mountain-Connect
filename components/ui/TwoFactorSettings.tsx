"use client";

import { useState, useEffect } from "react";

export default function TwoFactorSettings() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/auth/toggle-2fa")
      .then((res) => res.json())
      .then((data) => {
        setEnabled(data.two_factor_enabled ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleEnable = async () => {
    setToggling(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/toggle-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });

      const data = await res.json();
      if (res.ok) {
        setEnabled(true);
        setSuccess("Two-factor authentication enabled! You'll receive a code via email on your next login.");
        setTimeout(() => setSuccess(""), 5000);
      } else {
        setError(data.error || "Failed to enable 2FA");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setToggling(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword) {
      setError("Password is required");
      return;
    }

    setToggling(true);
    setError("");

    try {
      const res = await fetch("/api/auth/toggle-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false, password: disablePassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setEnabled(false);
        setShowDisableConfirm(false);
        setDisablePassword("");
        setSuccess("Two-factor authentication disabled.");
        setTimeout(() => setSuccess(""), 5000);
      } else {
        setError(data.error || "Failed to disable 2FA");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-accent bg-white p-6">
        <div className="h-4 w-48 animate-pulse rounded bg-accent/50" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-accent bg-white p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <h2 className="text-sm font-semibold text-primary">Two-Factor Authentication</h2>
          </div>
          <p className="mt-1 text-sm text-foreground/50">
            Add an extra layer of security. When enabled, you&apos;ll receive a verification code via email each time you log in.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            enabled
              ? "bg-green-50 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {success && (
        <div className="mt-4 rounded-lg bg-green-50 px-4 py-2.5 text-sm text-green-700">
          {success}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="mt-4">
        {!enabled ? (
          <button
            onClick={handleEnable}
            disabled={toggling}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {toggling ? "Enabling..." : "Enable 2FA"}
          </button>
        ) : showDisableConfirm ? (
          <div className="space-y-3 rounded-lg border border-red-200 bg-red-50/30 p-4">
            <p className="text-sm font-medium text-red-900">
              Enter your password to disable 2FA:
            </p>
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => { setDisablePassword(e.target.value); setError(""); }}
              placeholder="Your password"
              className="w-full max-w-xs rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleDisable}
                disabled={toggling || !disablePassword}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {toggling ? "Disabling..." : "Disable 2FA"}
              </button>
              <button
                onClick={() => { setShowDisableConfirm(false); setDisablePassword(""); setError(""); }}
                className="text-sm text-foreground/50 hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDisableConfirm(true)}
            className="rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
          >
            Disable 2FA
          </button>
        )}
      </div>
    </div>
  );
}

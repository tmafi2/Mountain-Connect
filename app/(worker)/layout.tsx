"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PortalHeader from "@/components/layout/PortalHeader";
import WorkerSidebar from "@/components/layout/WorkerSidebar";
import ChatUnreadProvider from "@/components/chat/ChatUnreadProvider";
import BugReportWidget from "@/components/ui/BugReportWidget";
import InactivityGuard from "@/components/auth/InactivityGuard";
import { validatePassword } from "@/lib/utils/password";
import PasswordStrength from "@/components/ui/PasswordStrength";

function PasswordResetModal({ onClose }: { onClose: () => void }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.isValid) { setError("Password must meet all requirements: " + pwCheck.errors.join(", ")); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      setError(err?.message || "Failed to update password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/20">
            <svg className="h-7 w-7 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-primary">Set your new password</h2>
          <p className="mt-1 text-sm text-foreground/60">Please choose a new password to continue.</p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-green-700">Password updated!</p>
            <p className="mt-1 text-sm text-foreground/60">Closing this window...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground/70">New Password</label>
              <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70">Confirm Password</label>
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30" />
            </div>
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-secondary/90 disabled:opacity-50">
              {saving ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userName, setUserName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
      return;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setUserName(data.user?.user_metadata?.full_name || "");
      if (data.user) {
        const { data: profile } = await supabase
          .from("worker_profiles")
          .select("avatar_url")
          .eq("user_id", data.user.id)
          .single();
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
      }
    });

    // Listen for password recovery event — fires automatically when
    // user arrives from a Supabase recovery link, regardless of which page they land on
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setShowPasswordReset(true);
      }
    });

    // Also check URL for manual trigger
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("reset_password") === "true") {
      setShowPasswordReset(true);
      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => subscription.unsubscribe();
  }, []);

  return (
    <ChatUnreadProvider>
      <div className="flex h-screen flex-col">
        {showPasswordReset && <PasswordResetModal onClose={() => setShowPasswordReset(false)} />}
        <PortalHeader
          portalType="worker"
          userName={userName}
          avatarUrl={avatarUrl}
          onMobileMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <div className="flex flex-1 overflow-hidden">
          <WorkerSidebar
            mobileOpen={sidebarOpen}
            onMobileClose={() => setSidebarOpen(false)}
          />
          <main className="flex-1 overflow-y-auto bg-background p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
      <BugReportWidget />
      <InactivityGuard />
    </ChatUnreadProvider>
  );
}

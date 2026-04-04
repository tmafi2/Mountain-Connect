"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function BusinessSettingsPage() {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    setError("");

    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-primary">Settings</h1>
      <p className="mt-1 text-sm text-foreground/50">Manage your account settings</p>

      {/* Delete Account */}
      <div className="mt-10 rounded-xl border border-red-200 bg-red-50/30 p-6">
        <h2 className="text-sm font-semibold text-red-900">Delete Account</h2>
        <p className="mt-1 text-sm text-red-800/70">
          Permanently delete your account, business profile, job listings, and all associated data. This action cannot be undone.
        </p>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="mt-4 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            Delete My Account
          </button>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-red-900">
              Type <span className="font-mono font-bold">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full max-w-xs rounded-lg border border-red-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
              placeholder="DELETE"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                onClick={handleDelete}
                disabled={confirmText !== "DELETE" || deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Permanently Delete Account"}
              </button>
              <button
                onClick={() => { setShowConfirm(false); setConfirmText(""); setError(""); }}
                className="text-sm text-foreground/50 hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

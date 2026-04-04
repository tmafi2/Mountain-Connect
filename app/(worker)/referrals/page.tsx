"use client";

import { useEffect, useState } from "react";

interface ReferredUser {
  name: string;
  type: string;
  date: string;
}

export default function WorkerReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [stats, setStats] = useState({ total: 0, workers: 0, businesses: 0 });
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals")
      .then((r) => r.json())
      .then((data) => {
        setReferralCode(data.referralCode || "");
        setStats(data.stats || { total: 0, workers: 0, businesses: 0 });
        setReferredUsers(data.referredUsers || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const referralLink = referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : "https://www.mountainconnects.com"}/signup?ref=${referralCode}`
    : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-primary">Referrals</h1>
      <p className="mt-1 text-sm text-foreground/50">
        Invite friends to Mountain Connect and track your referrals
      </p>

      {/* Referral Link Card */}
      <div className="mt-8 rounded-xl border border-accent/30 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-primary">Your Referral Link</h2>
        <p className="mt-1 text-xs text-foreground/40">Share this link with friends to invite them to Mountain Connect</p>
        <div className="mt-4 flex items-center gap-2">
          <input
            readOnly
            value={referralLink}
            className="flex-1 rounded-lg border border-accent bg-background px-4 py-2.5 text-sm text-primary font-mono"
          />
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-secondary/90"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <p className="mt-2 text-xs text-foreground/40">
          Your code: <span className="font-mono font-semibold text-primary">{referralCode}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-accent/30 bg-white p-5 shadow-sm text-center">
          <p className="text-2xl font-bold text-primary">{stats.total}</p>
          <p className="mt-1 text-xs text-foreground/50">Total Referrals</p>
        </div>
        <div className="rounded-xl border border-accent/30 bg-white p-5 shadow-sm text-center">
          <p className="text-2xl font-bold text-secondary">{stats.workers}</p>
          <p className="mt-1 text-xs text-foreground/50">Workers</p>
        </div>
        <div className="rounded-xl border border-accent/30 bg-white p-5 shadow-sm text-center">
          <p className="text-2xl font-bold text-warm">{stats.businesses}</p>
          <p className="mt-1 text-xs text-foreground/50">Businesses</p>
        </div>
      </div>

      {/* Referred Users List */}
      <div className="mt-6 rounded-xl border border-accent/30 bg-white shadow-sm">
        <div className="p-5 border-b border-accent/20">
          <h3 className="text-sm font-semibold text-primary">Referred Users</h3>
        </div>
        {referredUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-foreground/40">
            No referrals yet. Share your link to get started!
          </div>
        ) : (
          <div className="divide-y divide-accent/10">
            {referredUsers.map((user, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-primary">{user.name}</p>
                  <p className="text-xs text-foreground/40">
                    Joined {new Date(user.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
                  user.type === "worker" ? "bg-secondary/10 text-secondary" : "bg-warm/10 text-warm"
                }`}>
                  {user.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

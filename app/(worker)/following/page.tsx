"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { seedBusinesses, getCategoryLabel } from "@/lib/data/businesses";
import type { SeedBusiness } from "@/lib/data/businesses";

/* ─── Demo followed businesses ───────────────────────────── */

const demoFollowed = seedBusinesses
  .filter((b) => ["biz-1", "biz-2", "biz-6", "biz-9"].includes(b.id))
  .map((b) => ({ ...b, followedAt: "2026-02-15T00:00:00Z" }));

const VERIFICATION_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  verified: { bg: "bg-green-50", text: "text-green-700", label: "Verified" },
  pending_review: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Pending" },
  unverified: { bg: "bg-gray-50", text: "text-gray-500", label: "Unverified" },
  rejected: { bg: "bg-red-50", text: "text-red-500", label: "Rejected" },
};

/* ─── Page ───────────────────────────────────────────────── */

export default function FollowingPage() {
  const [followed, setFollowed] = useState<typeof demoFollowed>([]);
  const [unfollowLoading, setUnfollowLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/follow");
        if (!res.ok) {
          // Not authenticated or error — show demo data
          setFollowed(demoFollowed);
          setLoading(false);
          return;
        }
        const { follows } = await res.json();

        if (follows && follows.length > 0) {
          const mapped = follows.map((f: Record<string, unknown>) => {
            const biz = f.business as Record<string, unknown> | null;
            if (!biz) return null;
            return {
              id: biz.id as string,
              business_name: (biz.business_name as string) || "Unknown",
              description: (biz.description as string) || "",
              location: (biz.location as string) || "",
              category: (biz.category as string) || "other",
              verification_status: (biz.verification_status as string) || "unverified",
              slug: (biz.slug as string) || "",
              logo_url: (biz.logo_url as string) || null,
              open_positions: 0,
              standard_perks: [],
              followedAt: f.created_at as string,
            };
          }).filter(Boolean);
          setFollowed(mapped);
        }
        // else: authenticated but no follows — keep empty array
      } catch {
        // On error, show demo data for non-auth visitors
        setFollowed(demoFollowed);
      }
      setLoading(false);
    })();
  }, []);

  // Get unique categories from followed businesses
  const categories = [...new Set(followed.map((b) => b.category).filter(Boolean))] as string[];

  const filtered =
    filter === "all" ? followed : followed.filter((b) => b.category === filter);

  const handleUnfollow = async (bizId: string) => {
    setUnfollowLoading(bizId);
    try {
      await fetch(`/api/follow?business_id=${bizId}`, { method: "DELETE" });
    } catch {
      // Ignore API errors — still remove from UI
    }
    setFollowed((prev) => prev.filter((b) => b.id !== bizId));
    setUnfollowLoading(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Following</h1>
          <p className="mt-1 text-sm text-foreground/60">
            Employers you follow. You&apos;ll get notified when they post new jobs.
          </p>
        </div>
        <span className="rounded-full bg-secondary/20 px-3 py-1 text-sm font-medium text-primary">
          {followed.length} employer{followed.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Category filter */}
      {categories.length > 1 && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === "all"
                ? "border-primary bg-primary text-white"
                : "border-accent bg-white text-foreground/70 hover:bg-accent/20"
            }`}
          >
            All ({followed.length})
          </button>
          {categories.map((cat) => {
            const count = followed.filter((b) => b.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === cat
                    ? "border-primary bg-primary text-white"
                    : "border-accent bg-white text-foreground/70 hover:bg-accent/20"
                }`}
              >
                {getCategoryLabel(cat as SeedBusiness["category"])} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Followed businesses list */}
      {filtered.length === 0 ? (
        <div className="mt-8 rounded-xl border border-accent bg-white p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary/20">
            <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-primary">No employers followed yet</h2>
          <p className="mt-2 text-sm text-foreground/60">
            Browse resorts and follow employers to get notified about new job postings.
          </p>
          <Link
            href="/explore"
            className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            Explore Resorts
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((biz) => {
            const badge = VERIFICATION_BADGE[biz.verification_status] || VERIFICATION_BADGE.unverified;

            return (
              <div
                key={biz.id}
                className="rounded-xl border border-accent bg-white p-5 transition-all hover:border-secondary/50"
              >
                <div className="flex items-start gap-4">
                  {/* Logo */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {biz.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/employers/${biz.slug}`}
                        className="font-semibold text-primary hover:text-secondary hover:underline truncate"
                      >
                        {biz.business_name}
                      </Link>
                      <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-foreground/60 truncate">
                      {getCategoryLabel(biz.category)} · {biz.location}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-foreground/50">
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {biz.open_positions} open position{biz.open_positions !== 1 ? "s" : ""}
                      </span>
                      {biz.standard_perks && biz.standard_perks.length > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {biz.standard_perks.slice(0, 2).join(", ")}
                          {biz.standard_perks.length > 2 && ` +${biz.standard_perks.length - 2}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/employers/${biz.slug}`}
                      className="rounded-lg border border-accent bg-white px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleUnfollow(biz.id)}
                      disabled={unfollowLoading !== null}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
                    >
                      {unfollowLoading === biz.id ? "..." : "Unfollow"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info card */}
      <div className="mt-8 rounded-xl border border-secondary/30 bg-secondary/5 p-5">
        <h3 className="text-sm font-semibold text-primary">How notifications work</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-foreground/60">
          <li className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span>Get a bell notification when a followed employer posts or closes a job</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Receive email alerts so you never miss an opportunity</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>Be one of the first to apply and stand out to employers</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

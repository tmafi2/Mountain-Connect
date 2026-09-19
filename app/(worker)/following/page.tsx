"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCategoryLabel } from "@/lib/data/businesses";
import type { BusinessCategory } from "@/types/database";

/* ─── Types ──────────────────────────────────────────────── */

// Real follows only. This page used to fall back to four demo businesses
// (Whistler Blackcomb, Fairmont, NZSki…) badged "Verified" whenever the API
// failed, showing workers follows they never made of companies that are not
// on the platform.
interface FollowedBusiness {
  id: string;
  business_name: string;
  location: string;
  category: BusinessCategory;
  verification_status: string;
  followedAt: string;
}

const VERIFICATION_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  verified: { bg: "bg-green-50", text: "text-green-700", label: "Verified" },
  pending_verification: { bg: "bg-purple-50", text: "text-purple-700", label: "Pending Verification" },
  accepted: { bg: "bg-blue-50", text: "text-blue-700", label: "Accepted" },
  pending_review: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Pending" },
  unverified: { bg: "bg-gray-50", text: "text-gray-500", label: "Unverified" },
  rejected: { bg: "bg-red-50", text: "text-red-500", label: "Unsuccessful" },
};

/* ─── Page ───────────────────────────────────────────────── */

export default function FollowingPage() {
  const [followed, setFollowed] = useState<FollowedBusiness[]>([]);
  const [unfollowLoading, setUnfollowLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | string>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/follow");
        // 404 = no worker profile yet, so nothing can have been followed.
        // Any other failure is an error, NOT an empty list: telling someone
        // they follow no one because the request failed would be untrue.
        if (res.status === 404) return;
        if (!res.ok) throw new Error(`GET /api/follow answered ${res.status}`);
        const { follows } = await res.json();

        if (follows && follows.length > 0) {
          const mapped = follows.map((f: Record<string, unknown>) => {
            const biz = f.business as Record<string, unknown> | null;
            if (!biz) return null;
            return {
              id: biz.id as string,
              business_name: (biz.business_name as string) || "Unknown",
              location: (biz.location as string) || "",
              category: (biz.category as BusinessCategory) || "other",
              verification_status: (biz.verification_status as string) || "unverified",
              followedAt: f.created_at as string,
            };
          }).filter(Boolean) as FollowedBusiness[];
          setFollowed(mapped);
        }
        // else: authenticated but no follows — keep empty array
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Gradient header */}
      <div className="relative -mx-6 -mt-6 mb-8 overflow-hidden rounded-b-3xl bg-gradient-to-br from-primary via-primary-light to-primary px-6 pb-8 pt-8 sm:-mx-8 sm:px-8">
        <div className="pointer-events-none absolute -left-12 -top-8 h-44 w-44 rounded-full bg-highlight/15 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-36 w-36 rounded-full bg-secondary/20 blur-3xl" />
        <div className="relative flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Following</h1>
            <p className="mt-1 text-sm text-white/60">
              Employers you follow. You&apos;ll get notified when they post new jobs.
            </p>
          </div>
          {!loadError && (
            <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white backdrop-blur-sm">
              {followed.length} employer{followed.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Category filter — rounded-full pills */}
      {categories.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              filter === "all"
                ? "bg-primary text-white shadow-md shadow-primary/20"
                : "border border-accent/50 bg-white/70 text-foreground/70 backdrop-blur-sm hover:border-secondary/50 hover:bg-white"
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
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  filter === cat
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "border border-accent/50 bg-white/70 text-foreground/70 backdrop-blur-sm hover:border-secondary/50 hover:bg-white"
                }`}
              >
                {getCategoryLabel(cat as BusinessCategory)} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Followed businesses list */}
      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">We couldn&apos;t load the employers you follow.</p>
          <p className="mt-1 text-sm text-red-700/70">Refresh the page to try again.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-accent/50 bg-white/70 p-12 text-center backdrop-blur-sm">
          <div className="relative mx-auto mb-6 h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-secondary/10" />
            <div className="absolute inset-2 rounded-full bg-secondary/15" />
            <div className="absolute inset-4 flex items-center justify-center rounded-full bg-secondary/20">
              <svg className="h-8 w-8 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h2 className="text-lg font-semibold text-primary">No employers followed yet</h2>
          <p className="mt-2 text-sm text-foreground/60">
            Browse resorts and follow employers to get notified about new job postings.
          </p>
          <Link
            href="/explore"
            className="mt-5 inline-block rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20"
          >
            Explore Resorts
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((biz) => {
            const badge = VERIFICATION_BADGE[biz.verification_status] || VERIFICATION_BADGE.unverified;

            return (
              <div
                key={biz.id}
                className="rounded-2xl border border-accent/50 bg-white/70 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-secondary/5"
              >
                <div className="flex items-start gap-4">
                  {/* Logo bubble */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary/15 text-sm font-bold text-secondary">
                    {biz.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/business/${biz.id}`}
                        className="font-semibold text-primary hover:text-secondary hover:underline truncate"
                      >
                        {biz.business_name}
                      </Link>
                      <span className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-foreground/60 truncate">
                      {getCategoryLabel(biz.category)} · {biz.location}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/business/${biz.id}`}
                      className="rounded-xl border border-accent/50 bg-white/80 px-3 py-2 text-sm font-medium text-foreground transition-all hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-sm"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleUnfollow(biz.id)}
                      disabled={unfollowLoading !== null}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-all hover:-translate-y-0.5 hover:bg-red-100 hover:shadow-sm disabled:opacity-50"
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
      <div className="mt-8 rounded-2xl border border-secondary/20 bg-gradient-to-br from-secondary/5 to-highlight/5 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/15">
            <svg className="h-4 w-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-primary">How notifications work</h3>
        </div>
        <ul className="space-y-2 text-sm text-foreground/60">
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

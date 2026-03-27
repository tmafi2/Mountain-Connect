"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ────────────────────────────────────────────── */
interface Business {
  id: string;
  business_name: string;
  logo_url: string | null;
  description: string | null;
  location: string | null;
  country: string | null;
  industries: string[] | null;
  verification_status: string | null;
  resort_names: string[];
  active_listings: number;
}

const INDUSTRY_LABELS: Record<string, string> = {
  ski_school: "Ski / Snowboard School",
  hospitality: "Hospitality",
  food_beverage: "Food & Beverage",
  retail: "Retail",
  resort_operations: "Resort Operations",
  accommodation: "Accommodation",
  rental_shop: "Rental Shop",
  transport: "Transport",
  entertainment: "Entertainment",
  cleaning_housekeeping: "Cleaning / Housekeeping",
  construction_maintenance: "Construction / Maintenance",
  childcare: "Childcare",
  health_fitness: "Health & Fitness",
  tourism: "Tourism / Adventure",
  other: "Other",
};

const COUNTRIES = [
  "Australia", "Austria", "Canada", "Chile", "Finland", "France", "Germany",
  "Italy", "Japan", "New Zealand", "Norway", "South Korea", "Spain",
  "Sweden", "Switzerland", "United Kingdom", "United States",
];

const INDUSTRY_OPTIONS = Object.entries(INDUSTRY_LABELS).map(([value, label]) => ({ value, label }));

/* ─── Helpers ──────────────────────────────────────────── */
function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/* ═══════════════════════════════════════════════════════════ */
/*  PAGE                                                       */
/* ═══════════════════════════════════════════════════════════ */
export default function EmployersPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();

        // Fetch all business profiles
        const { data: bps } = await supabase
          .from("business_profiles")
          .select("id, business_name, logo_url, description, location, country, industries, verification_status")
          .order("verification_status", { ascending: true })
          .order("business_name", { ascending: true });

        if (!bps || bps.length === 0) { setLoading(false); return; }

        // Get active listing counts per business
        const bizIds = bps.map((b) => b.id);
        const { data: jobs } = await supabase
          .from("job_posts")
          .select("business_id")
          .in("business_id", bizIds)
          .eq("status", "active");

        const jobCounts: Record<string, number> = {};
        if (jobs) {
          for (const j of jobs) {
            jobCounts[j.business_id] = (jobCounts[j.business_id] || 0) + 1;
          }
        }

        // Get resort names linked to each business
        const { data: bizResorts } = await supabase
          .from("business_resorts")
          .select("business_id, resort_id")
          .in("business_id", bizIds);

        let resortMap: Record<string, string[]> = {};
        if (bizResorts && bizResorts.length > 0) {
          const resortIds = [...new Set(bizResorts.map((br) => br.resort_id))];
          const { data: resorts } = await supabase
            .from("resorts")
            .select("id, name")
            .in("id", resortIds);

          const resortNameMap: Record<string, string> = {};
          if (resorts) {
            for (const r of resorts) resortNameMap[r.id] = r.name;
          }

          for (const br of bizResorts) {
            if (!resortMap[br.business_id]) resortMap[br.business_id] = [];
            const name = resortNameMap[br.resort_id];
            if (name && !resortMap[br.business_id].includes(name)) {
              resortMap[br.business_id].push(name);
            }
          }
        }

        // Also check direct resort_id on profiles
        const profilesWithResort = bps.filter((b) => b.id && !resortMap[b.id]?.length);
        // We'll handle this if needed

        const mapped: Business[] = bps.map((b) => ({
          id: b.id,
          business_name: b.business_name,
          logo_url: b.logo_url,
          description: b.description,
          location: b.location,
          country: b.country,
          industries: b.industries,
          verification_status: b.verification_status,
          resort_names: resortMap[b.id] || [],
          active_listings: jobCounts[b.id] || 0,
        }));

        setBusinesses(mapped);
      } catch (err) {
        console.error("Failed to load employers:", err);
      }
      setLoading(false);
    })();
  }, []);

  // Filtered + sorted results
  const filtered = useMemo(() => {
    let results = businesses;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (b) =>
          b.business_name.toLowerCase().includes(q) ||
          b.location?.toLowerCase().includes(q) ||
          b.resort_names.some((r) => r.toLowerCase().includes(q)) ||
          b.industries?.some((i) => (INDUSTRY_LABELS[i] || i).toLowerCase().includes(q))
      );
    }

    // Country
    if (country) {
      results = results.filter((b) => b.country === country);
    }

    // Industry
    if (industry) {
      results = results.filter((b) => b.industries?.includes(industry));
    }

    // Verified only
    if (verifiedOnly) {
      results = results.filter((b) => b.verification_status === "verified");
    }

    // Sort: verified first, then by name
    return results.sort((a, b) => {
      const aV = a.verification_status === "verified" ? 0 : 1;
      const bV = b.verification_status === "verified" ? 0 : 1;
      if (aV !== bV) return aV - bV;
      return a.business_name.localeCompare(b.business_name);
    });
  }, [businesses, search, country, industry, verifiedOnly]);

  const activeFilterCount = [country, industry, verifiedOnly].filter(Boolean).length;
  const verifiedCount = businesses.filter((b) => b.verification_status === "verified").length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* Hero */}
      <div className="relative mb-8 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#132d4a]" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-3xl bg-secondary/8 blur-2xl rotate-12" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-64 rounded-full bg-secondary/6 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

        <div className="relative px-8 py-10 sm:px-10 sm:py-12">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-5 w-5 text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            <span className="text-xs font-medium uppercase tracking-widest text-secondary/70">Employer Directory</span>
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Employers</h1>
          <p className="mt-2 max-w-xl text-sm text-white/50">
            Browse ski resort businesses hiring seasonal workers worldwide. Verified employers are highlighted for your confidence.
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm text-white/40">
            <span>{businesses.length} employers</span>
            <span className="h-3 w-px bg-white/20" />
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {verifiedCount} verified
            </span>
          </div>
        </div>
      </div>

      {/* Search + Filter toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, location, resort, or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-accent/40 bg-white py-2.5 pl-10 pr-4 text-sm text-primary placeholder-foreground/40 shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-sm transition-colors ${
            showFilters || activeFilterCount > 0
              ? "border-secondary bg-secondary/10 text-secondary"
              : "border-accent/40 bg-white text-foreground/60 hover:border-secondary/50"
          }`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mt-3 rounded-xl border border-accent/40 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs font-medium text-foreground/50">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full rounded-lg border border-accent/40 bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              >
                <option value="">All countries</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs font-medium text-foreground/50">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-lg border border-accent/40 bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              >
                <option value="">All industries</option>
                {INDUSTRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-accent/40 px-4 py-2 text-sm text-foreground/70 hover:border-secondary/50 transition-colors">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="h-4 w-4 rounded border-accent text-secondary focus:ring-secondary"
              />
              Verified only
            </label>
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setCountry(""); setIndustry(""); setVerifiedOnly(false); }}
                className="text-xs font-medium text-secondary hover:text-secondary/80 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="mt-4 text-xs text-foreground/40">
        Showing {filtered.length} employer{filtered.length !== 1 ? "s" : ""}
        {search && <> matching &ldquo;<span className="font-medium text-foreground/60">{search}</span>&rdquo;</>}
      </p>

      {/* Results grid */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-accent/40 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
              <svg className="h-7 w-7 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground/60">No employers match your search.</p>
            <p className="mt-1 text-xs text-foreground/40">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          filtered.map((biz) => {
            const isVerified = biz.verification_status === "verified";
            return (
              <Link
                key={biz.id}
                href={`/business/${biz.id}`}
                className={`group rounded-2xl border bg-white transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                  isVerified
                    ? "border-accent/50 hover:border-secondary/50 hover:shadow-secondary/10"
                    : "border-accent/30 opacity-75 hover:opacity-100 hover:border-accent"
                }`}
              >
                {/* Card content */}
                <div className="p-5">
                  {/* Logo + Name + Verified */}
                  <div className="flex items-start gap-3.5">
                    {biz.logo_url ? (
                      <img
                        src={biz.logo_url}
                        alt={biz.business_name}
                        className="h-12 w-12 rounded-xl object-cover border border-accent/30 shadow-sm"
                      />
                    ) : (
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-sm ${
                        isVerified
                          ? "bg-secondary/15 text-secondary"
                          : "bg-accent/30 text-foreground/40"
                      }`}>
                        {getInitials(biz.business_name)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-semibold truncate group-hover:text-secondary transition-colors ${
                          isVerified ? "text-primary" : "text-foreground/70"
                        }`}>
                          {biz.business_name}
                        </h3>
                        {isVerified && (
                          <span className="shrink-0 flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Verified
                          </span>
                        )}
                      </div>
                      {biz.location && (
                        <p className="mt-0.5 text-xs text-foreground/50 truncate flex items-center gap-1">
                          <svg className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                          {biz.location}{biz.country ? `, ${biz.country}` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {biz.description && (
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-foreground/50">
                      {biz.description}
                    </p>
                  )}

                  {/* Industries */}
                  {biz.industries && biz.industries.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {biz.industries.slice(0, 3).map((ind) => (
                        <span
                          key={ind}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                            isVerified
                              ? "bg-secondary/10 text-secondary/80"
                              : "bg-accent/30 text-foreground/50"
                          }`}
                        >
                          {INDUSTRY_LABELS[ind] || ind}
                        </span>
                      ))}
                      {biz.industries.length > 3 && (
                        <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-medium text-foreground/40">
                          +{biz.industries.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Resort names + active listings */}
                  <div className="mt-3 flex items-center justify-between border-t border-accent/30 pt-3">
                    <div className="flex items-center gap-1 text-[11px] text-foreground/40 min-w-0">
                      {biz.resort_names.length > 0 ? (
                        <>
                          <svg className="h-3 w-3 shrink-0 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75" />
                          </svg>
                          <span className="truncate">{biz.resort_names.slice(0, 2).join(", ")}</span>
                          {biz.resort_names.length > 2 && <span>+{biz.resort_names.length - 2}</span>}
                        </>
                      ) : (
                        <span className="text-foreground/30">No resort linked</span>
                      )}
                    </div>
                    {biz.active_listings > 0 && (
                      <span className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                        isVerified
                          ? "bg-green-50 text-green-700"
                          : "bg-accent/30 text-foreground/50"
                      }`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        {biz.active_listings} active listing{biz.active_listings !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

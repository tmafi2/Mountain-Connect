"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { regionHierarchy } from "@/lib/data/region-hierarchy";

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
  resort_ids: string[];
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

const INDUSTRY_EMOJIS: Record<string, string> = {
  ski_school: "🎿",
  hospitality: "🏨",
  food_beverage: "🍽️",
  retail: "🛍️",
  resort_operations: "⛷️",
  accommodation: "🏠",
  rental_shop: "🎿",
  transport: "🚐",
  entertainment: "🎭",
  cleaning_housekeeping: "🧹",
  construction_maintenance: "🔧",
  childcare: "👶",
  health_fitness: "💪",
  tourism: "🏔️",
  other: "📋",
};

const COUNTRIES = [
  "Australia", "Austria", "Canada", "Chile", "Finland", "France", "Germany",
  "Italy", "Japan", "New Zealand", "Norway", "South Korea", "Spain",
  "Sweden", "Switzerland", "United Kingdom", "United States",
];

const INDUSTRY_OPTIONS = Object.entries(INDUSTRY_LABELS).map(([value, label]) => ({ value, label }));

/* ─── Build resort → country map from region hierarchy ── */
const RESORT_COUNTRY_MAP: Record<string, string> = {};
const COUNTRY_RESORTS_MAP: Record<string, { id: string; name: string }[]> = {};
for (const continent of regionHierarchy) {
  for (const countryEntry of continent.countries) {
    if (!COUNTRY_RESORTS_MAP[countryEntry.name]) COUNTRY_RESORTS_MAP[countryEntry.name] = [];
    for (const resort of countryEntry.resorts) {
      RESORT_COUNTRY_MAP[resort.id] = countryEntry.name;
      COUNTRY_RESORTS_MAP[countryEntry.name].push({ id: resort.id, name: resort.name });
    }
  }
}

/* ─── Helpers ──────────────────────────────────────────── */
function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

/** Map country names from region-hierarchy to the COUNTRIES list used in business profiles */
const COUNTRY_NAME_ALIASES: Record<string, string> = {
  "USA": "United States",
  "United States": "USA",
};

/* ═══════════════════════════════════════════════════════════ */
/*  PAGE                                                       */
/* ═══════════════════════════════════════════════════════════ */
export default function EmployersPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [allResorts, setAllResorts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [industry, setIndustry] = useState("");
  const [resort, setResort] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();

        // Fetch all business profiles
        const { data: bps } = await supabase
          .from("business_profiles")
          .select("id, business_name, logo_url, description, location, country, industries, verification_status, resort_id")
          .order("verification_status", { ascending: true })
          .order("business_name", { ascending: true });

        if (!bps || bps.length === 0) { setLoading(false); return; }

        // Get active listing counts per business (also grab resort_id for resort linking)
        const bizIds = bps.map((b) => b.id);
        const { data: jobs } = await supabase
          .from("job_posts")
          .select("business_id, resort_id")
          .in("business_id", bizIds)
          .eq("status", "active");

        const jobCounts: Record<string, number> = {};
        const jobResortLinks: { business_id: string; resort_id: string }[] = [];
        if (jobs) {
          for (const j of jobs) {
            jobCounts[j.business_id] = (jobCounts[j.business_id] || 0) + 1;
            if (j.resort_id) {
              jobResortLinks.push({ business_id: j.business_id, resort_id: j.resort_id });
            }
          }
        }

        // Get resort names linked to each business
        const { data: bizResorts } = await supabase
          .from("business_resorts")
          .select("business_id, resort_id")
          .in("business_id", bizIds);

        const resortMap: Record<string, string[]> = {};
        const resortIdMap: Record<string, string[]> = {};
        const allResortIds = new Set<string>();

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
            if (!resortIdMap[br.business_id]) resortIdMap[br.business_id] = [];
            const name = resortNameMap[br.resort_id];
            if (name && !resortMap[br.business_id].includes(name)) {
              resortMap[br.business_id].push(name);
              resortIdMap[br.business_id].push(br.resort_id);
              allResortIds.add(br.resort_id);
            }
          }
        }

        // Also include resort_id directly from business_profiles (set in company profile)
        const directResortIds = bps
          .filter((b) => b.resort_id)
          .map((b) => b.resort_id as string);

        if (directResortIds.length > 0) {
          const uniqueDirectIds = [...new Set(directResortIds)];
          const { data: directResorts } = await supabase
            .from("resorts")
            .select("id, name")
            .in("id", uniqueDirectIds);

          const directNameMap: Record<string, string> = {};
          if (directResorts) {
            for (const r of directResorts) directNameMap[r.id] = r.name;
          }

          for (const b of bps) {
            if (b.resort_id && directNameMap[b.resort_id]) {
              if (!resortMap[b.id]) resortMap[b.id] = [];
              if (!resortIdMap[b.id]) resortIdMap[b.id] = [];
              if (!resortIdMap[b.id].includes(b.resort_id)) {
                resortMap[b.id].push(directNameMap[b.resort_id]);
                resortIdMap[b.id].push(b.resort_id);
                allResortIds.add(b.resort_id);
              }
            }
          }
        }

        // Also link businesses to resorts via their active job posts
        if (jobResortLinks.length > 0) {
          const jobResortIds = [...new Set(jobResortLinks.map((jrl) => jrl.resort_id))];
          const { data: jobResorts } = await supabase
            .from("resorts")
            .select("id, name")
            .in("id", jobResortIds);

          const jobResortNameMap: Record<string, string> = {};
          if (jobResorts) {
            for (const r of jobResorts) jobResortNameMap[r.id] = r.name;
          }

          for (const jrl of jobResortLinks) {
            if (jobResortNameMap[jrl.resort_id]) {
              if (!resortMap[jrl.business_id]) resortMap[jrl.business_id] = [];
              if (!resortIdMap[jrl.business_id]) resortIdMap[jrl.business_id] = [];
              if (!resortIdMap[jrl.business_id].includes(jrl.resort_id)) {
                resortMap[jrl.business_id].push(jobResortNameMap[jrl.resort_id]);
                resortIdMap[jrl.business_id].push(jrl.resort_id);
                allResortIds.add(jrl.resort_id);
              }
            }
          }
        }

        // Get all resorts for the dropdown
        const { data: allResortsData } = await supabase
          .from("resorts")
          .select("id, name")
          .order("name", { ascending: true });

        if (allResortsData) {
          setAllResorts(allResortsData);
        }

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
          resort_ids: resortIdMap[b.id] || [],
          active_listings: jobCounts[b.id] || 0,
        }));

        setBusinesses(mapped);
      } catch (err) {
        console.error("Failed to load employers:", err);
      }
      setLoading(false);
    })();
  }, []);

  // Determine if any filter is active
  const hasActiveFilter = !!(search.trim() || country || industry || resort || verifiedOnly);

  // Filtered + sorted results
  const filtered = useMemo(() => {
    if (!hasActiveFilter) return [];

    let results = businesses;

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

    if (country) {
      results = results.filter((b) => b.country === country);
    }

    if (industry) {
      results = results.filter((b) => b.industries?.includes(industry));
    }

    if (resort) {
      results = results.filter((b) => b.resort_ids.includes(resort));
    }

    if (verifiedOnly) {
      results = results.filter((b) => b.verification_status === "verified");
    }

    return results.sort((a, b) => {
      const aV = a.verification_status === "verified" ? 0 : 1;
      const bV = b.verification_status === "verified" ? 0 : 1;
      if (aV !== bV) return aV - bV;
      return a.business_name.localeCompare(b.business_name);
    });
  }, [businesses, search, country, industry, resort, verifiedOnly, hasActiveFilter]);

  const verifiedCount = businesses.filter((b) => b.verification_status === "verified").length;
  const featuredEmployers = useMemo(
    () => businesses.filter((b) => b.verification_status === "verified").slice(0, 4),
    [businesses]
  );

  // Count businesses per industry for the category cards
  const industryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of businesses) {
      if (b.industries) {
        for (const ind of b.industries) {
          counts[ind] = (counts[ind] || 0) + 1;
        }
      }
    }
    return counts;
  }, [businesses]);

  // Only show categories that have at least 1 business
  const activeCategories = INDUSTRY_OPTIONS.filter((opt) => (industryCounts[opt.value] || 0) > 0);

  // Filter resort dropdown options by selected country
  const filteredResortOptions = useMemo(() => {
    if (!country) return allResorts;
    // Try to match the country filter value to region-hierarchy country names
    const matchingResorts = COUNTRY_RESORTS_MAP[country] || COUNTRY_RESORTS_MAP[COUNTRY_NAME_ALIASES[country] || ""];
    if (matchingResorts && matchingResorts.length > 0) {
      const ids = new Set(matchingResorts.map((r) => r.id));
      return allResorts.filter((r) => ids.has(r.id));
    }
    // Fallback: filter allResorts by matching country name in resort data
    return allResorts;
  }, [country, allResorts]);

  const clearFilters = () => {
    setSearch("");
    setCountry("");
    setIndustry("");
    setResort("");
    setVerifiedOnly(false);
  };

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
            Discover ski resort businesses hiring seasonal workers worldwide. Browse by resort, search by name, or filter by country and industry.
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

      {/* Search bar */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search employers by name, location, or resort..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-2xl border border-accent/40 bg-white py-3.5 pl-12 pr-4 text-sm text-primary placeholder-foreground/40 shadow-sm focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
        />
      </div>

      {/* Filter row — always visible */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={country}
          onChange={(e) => {
            const newCountry = e.target.value;
            setCountry(newCountry);
            // Reset resort if it doesn't belong to the new country
            if (newCountry && resort) {
              const resortCountry = RESORT_COUNTRY_MAP[resort];
              if (resortCountry !== newCountry && COUNTRY_NAME_ALIASES[resortCountry] !== newCountry) {
                setResort("");
              }
            }
          }}
          className="rounded-xl border border-accent/40 bg-white px-4 py-2.5 text-sm text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        >
          <option value="">All Countries</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={resort}
          onChange={(e) => setResort(e.target.value)}
          className="rounded-xl border border-accent/40 bg-white px-4 py-2.5 text-sm text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        >
          <option value="">All Resorts</option>
          {filteredResortOptions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>

        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="rounded-xl border border-accent/40 bg-white px-4 py-2.5 text-sm text-primary shadow-sm focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        >
          <option value="">All Industries</option>
          {INDUSTRY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-accent/40 bg-white px-4 py-2.5 text-sm text-foreground/70 shadow-sm hover:border-secondary/50 transition-colors">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="h-4 w-4 rounded border-accent text-secondary focus:ring-secondary"
          />
          Verified only
        </label>

        {hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-secondary hover:bg-secondary/10 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  LANDING VIEW — shown when no filters are active       */}
      {/* ═══════════════════════════════════════════════════════ */}
      {!hasActiveFilter && (
        <div className="mt-8 space-y-10">

          {/* Featured / Verified Employers */}
          {featuredEmployers.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                  <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Verified Employers
                </h2>
                {verifiedCount > 4 && (
                  <button
                    onClick={() => setVerifiedOnly(true)}
                    className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
                  >
                    View all {verifiedCount} →
                  </button>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {featuredEmployers.map((biz) => (
                  <Link
                    key={biz.id}
                    href={`/business/${biz.id}`}
                    className="group rounded-2xl border border-accent/50 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/10"
                  >
                    <div className="flex items-center gap-3">
                      {biz.logo_url ? (
                        <img
                          src={biz.logo_url}
                          alt={biz.business_name}
                          className="h-11 w-11 rounded-xl object-cover border border-accent/30 shadow-sm"
                        />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-sm font-bold text-secondary shadow-sm">
                          {getInitials(biz.business_name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-primary truncate group-hover:text-secondary transition-colors">
                          {biz.business_name}
                        </h3>
                        {biz.location && (
                          <p className="text-xs text-foreground/40 truncate">{biz.location}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Verified
                      </span>
                      {biz.active_listings > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-foreground/40">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          {biz.active_listings} listing{biz.active_listings !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Browse by Ski Resort — grouped by country */}
          <div>
            <h2 className="text-lg font-bold text-primary mb-6">Browse by Ski Resort</h2>
            <div className="space-y-8">
              {regionHierarchy.map((continent) => (
                <div key={continent.name}>
                  {/* Continent header */}
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-base font-bold text-primary">{continent.name}</h3>
                    <div className="h-px flex-1 bg-gradient-to-r from-accent to-transparent" />
                    <span className="rounded-full bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold text-primary/60">
                      {continent.countries.reduce((s, c) => s + c.resorts.length, 0)} resorts
                    </span>
                  </div>

                  <div className="space-y-5">
                    {continent.countries.map((countryEntry) => (
                      <div key={countryEntry.name}>
                        {/* Country label */}
                        <div className="mb-2.5 flex items-center gap-2">
                          <h4 className="text-xs font-bold uppercase tracking-widest text-secondary">
                            {countryEntry.name}
                          </h4>
                          <span className="text-xs text-foreground/30">
                            {countryEntry.resorts.length} {countryEntry.resorts.length === 1 ? "resort" : "resorts"}
                          </span>
                        </div>

                        {/* Resort cards grid */}
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                          {countryEntry.resorts.map((resortEntry) => (
                            <button
                              key={resortEntry.id}
                              onClick={() => setResort(resortEntry.id)}
                              className="group flex items-center gap-2.5 rounded-xl border border-accent/40 bg-white px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-md hover:shadow-secondary/5"
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-base group-hover:bg-secondary/20 transition-colors">
                                <svg className="h-4.5 w-4.5 text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75" />
                                </svg>
                              </span>
                              <span className="text-sm font-medium text-primary group-hover:text-secondary transition-colors truncate">
                                {resortEntry.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt */}
          <div className="rounded-2xl border border-dashed border-accent/50 bg-accent/5 p-8 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
              <svg className="h-6 w-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground/60">
              Use the search bar or filters above to find specific employers
            </p>
            <p className="mt-1 text-xs text-foreground/40">
              Or click a resort above to browse employers at that location
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/*  RESULTS VIEW — shown when filters are active          */}
      {/* ═══════════════════════════════════════════════════════ */}
      {hasActiveFilter && (
        <>
          <p className="mt-5 text-xs text-foreground/40">
            Showing {filtered.length} employer{filtered.length !== 1 ? "s" : ""}
            {search && <> matching &ldquo;<span className="font-medium text-foreground/60">{search}</span>&rdquo;</>}
            {industry && <> in <span className="font-medium text-foreground/60">{INDUSTRY_LABELS[industry]}</span></>}
            {resort && <> at <span className="font-medium text-foreground/60">{allResorts.find((r) => r.id === resort)?.name}</span></>}
            {country && <> in <span className="font-medium text-foreground/60">{country}</span></>}
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-accent/40 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
                  <svg className="h-7 w-7 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground/60">No employers match your filters.</p>
                <p className="mt-1 text-xs text-foreground/40">Try adjusting your search or filter criteria.</p>
                <button
                  onClick={clearFilters}
                  className="mt-3 rounded-lg bg-secondary/10 px-4 py-2 text-xs font-medium text-secondary hover:bg-secondary/20 transition-colors"
                >
                  Clear all filters
                </button>
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
        </>
      )}
    </div>
  );
}

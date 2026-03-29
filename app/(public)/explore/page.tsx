"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { resorts } from "@/lib/data/resorts";
import { regionHierarchy } from "@/lib/data/region-hierarchy";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const GlobeComponent = dynamic(() => import("@/components/globe/Globe"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center" style={{ minHeight: 500 }}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
        <span className="text-sm text-white/40">Loading globe...</span>
      </div>
    </div>
  ),
});

/* ── Continent icons for mobile explorer ─────────────────── */
const CONTINENT_ICONS: Record<string, React.ReactNode> = {
  "North America": (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  Europe: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  Asia: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ),
  "Australia / New Zealand": (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036" />
    </svg>
  ),
  "South America": (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  ),
};

/* ── Mobile Region Explorer ──────────────────────────────── */
function MobileRegionExplorer({ continentFilter, onSelectContinent }: { continentFilter: string; onSelectContinent: (c: string) => void }) {
  const continents = regionHierarchy.map((c) => ({
    name: c.name,
    countries: c.countries.length,
    resorts: c.countries.reduce((sum, co) => sum + co.resorts.length, 0),
  }));

  return (
    <div className="mt-8 space-y-3 px-2">
      {continents.map((continent) => (
        <button
          key={continent.name}
          onClick={() => onSelectContinent(continentFilter === continent.name ? "All" : continent.name)}
          className={`group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
            continentFilter === continent.name
              ? "border-secondary/40 bg-white/10 shadow-lg shadow-secondary/10"
              : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
          }`}
        >
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors ${
            continentFilter === continent.name
              ? "bg-secondary/20 text-secondary"
              : "bg-white/10 text-white/50 group-hover:text-white/70"
          }`}>
            {CONTINENT_ICONS[continent.name]}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-base font-bold transition-colors ${
              continentFilter === continent.name ? "text-white" : "text-white/80"
            }`}>
              {continent.name}
            </p>
            <p className="text-xs text-white/40">
              {continent.resorts} resorts · {continent.countries} {continent.countries === 1 ? "country" : "countries"}
            </p>
          </div>
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
            continentFilter === continent.name
              ? "bg-secondary text-white rotate-90"
              : "bg-white/10 text-white/40"
          }`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
}

const resortMap = new Map(resorts.map((r) => [r.id, r]));

const CONTINENTS = ["All", "North America", "Europe", "Asia", "Australia / New Zealand", "South America"];

const CONTINENT_COUNTS: Record<string, number> = {
  All: resorts.length,
  "North America": 0,
  Europe: 0,
  Asia: 0,
  "Australia / New Zealand": 0,
  "South America": 0,
};

regionHierarchy.forEach((continent) => {
  const total = continent.countries.reduce((sum, c) => sum + c.resorts.length, 0);
  const key = continent.name;
  if (key in CONTINENT_COUNTS) {
    CONTINENT_COUNTS[key] = total;
  }
});

// Hero images for each continent
const CONTINENT_IMAGES: Record<string, string> = {
  "North America": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80",
  Europe: "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=400&q=80",
  Asia: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=400&q=80",
  "Australia / New Zealand": "https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=400&q=80",
  "South America": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80",
};

// Derive unique countries from resort data
const ALL_COUNTRIES = Array.from(new Set(resorts.map((r) => r.country))).sort();

const VERTICAL_DROP_OPTIONS = [
  { label: "Any", min: 0, max: Infinity },
  { label: "Under 500m", min: 0, max: 499 },
  { label: "500 – 1,000m", min: 500, max: 1000 },
  { label: "1,000 – 1,500m", min: 1000, max: 1500 },
  { label: "1,500m+", min: 1500, max: Infinity },
];

const RUNS_OPTIONS = [
  { label: "Any", min: 0, max: Infinity },
  { label: "Under 50", min: 0, max: 49 },
  { label: "50 – 100", min: 50, max: 100 },
  { label: "100 – 150", min: 100, max: 150 },
  { label: "150+", min: 150, max: Infinity },
];

const DIFFICULTY_OPTIONS = ["Beginner Friendly", "Intermediate", "Advanced"] as const;

export default function ExplorePage() {
  const [continentFilter, setContinentFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [countryFilter, setCountryFilter] = useState("All");
  const [verticalDropFilter, setVerticalDropFilter] = useState(0); // index into VERTICAL_DROP_OPTIONS
  const [runsFilter, setRunsFilter] = useState(0); // index into RUNS_OPTIONS
  const [difficultyFilter, setDifficultyFilter] = useState<string[]>([]);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const hasInteracted = useRef(false);

  // Globe search
  const [globeSearch, setGlobeSearch] = useState("");
  const [globeSearchSelection, setGlobeSearchSelection] = useState<string | null>(null); // country slug
  const [showGlobeSuggestions, setShowGlobeSuggestions] = useState(false);
  const globeSearchRef = useRef<HTMLDivElement>(null);

  const globeSuggestions = useMemo(() => {
    if (!globeSearch.trim()) return [];
    const q = globeSearch.toLowerCase();
    const results: { type: "country" | "resort"; name: string; country: string; countrySlug: string }[] = [];
    regionHierarchy.forEach((continent) => {
      continent.countries.forEach((country) => {
        const slug = country.name.toLowerCase().replace(/\s+/g, "-");
        if (country.name.toLowerCase().includes(q)) {
          results.push({ type: "country", name: country.name, country: country.name, countrySlug: slug });
        }
        country.resorts.forEach((resort) => {
          if (resort.name.toLowerCase().includes(q)) {
            results.push({ type: "resort", name: resort.name, country: country.name, countrySlug: slug });
          }
        });
      });
    });
    return results.slice(0, 8);
  }, [globeSearch]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (globeSearchRef.current && !globeSearchRef.current.contains(e.target as Node)) {
        setShowGlobeSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useScrollAnimation();

  const activeFilterCount = [
    countryFilter !== "All",
    verticalDropFilter !== 0,
    runsFilter !== 0,
    difficultyFilter.length > 0,
    verifiedOnly,
  ].filter(Boolean).length;

  // Track if user has changed any filter — skip scroll animations after first interaction
  const isFiltered = continentFilter !== "All" || searchQuery !== "" || activeFilterCount > 0;
  if (isFiltered) hasInteracted.current = true;

  const clearAllFilters = () => {
    setSearchQuery("");
    setContinentFilter("All");
    setCountryFilter("All");
    setVerticalDropFilter(0);
    setRunsFilter(0);
    setDifficultyFilter([]);
    setVerifiedOnly(false);
  };

  // Filter resorts by search + filters
  const filteredHierarchy = useMemo(() => {
    const vd = VERTICAL_DROP_OPTIONS[verticalDropFilter];
    const rn = RUNS_OPTIONS[runsFilter];

    // When searching, show results across all continents regardless of filter
    const effectiveContinentFilter = searchQuery ? "All" : continentFilter;

    return regionHierarchy
      .filter((continent) => effectiveContinentFilter === "All" || continent.name === effectiveContinentFilter)
      .map((continent) => ({
        ...continent,
        countries: continent.countries
          .filter((country) => countryFilter === "All" || country.name === countryFilter)
          .map((country) => ({
            ...country,
            resorts: country.resorts.filter((entry) => {
              const resort = resortMap.get(entry.id);
              if (!resort) return false;

              // Search filter
              if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchesSearch =
                  resort.name.toLowerCase().includes(q) ||
                  (resort.nearest_town?.toLowerCase().includes(q) ?? false) ||
                  country.name.toLowerCase().includes(q);
                if (!matchesSearch) return false;
              }

              // Vertical drop filter
              if (verticalDropFilter !== 0 && resort.vertical_drop_m) {
                if (resort.vertical_drop_m < vd.min || resort.vertical_drop_m > vd.max) return false;
              }
              if (verticalDropFilter !== 0 && !resort.vertical_drop_m) return false;

              // Runs filter
              if (runsFilter !== 0 && resort.num_runs) {
                if (resort.num_runs < rn.min || resort.num_runs > rn.max) return false;
              }
              if (runsFilter !== 0 && !resort.num_runs) return false;

              // Difficulty filter
              if (difficultyFilter.length > 0 && resort.num_runs) {
                const greenPct = (resort.runs_green ?? 0) / resort.num_runs;
                const bluePct = (resort.runs_blue ?? 0) / resort.num_runs;
                const blackPct = ((resort.runs_black ?? 0) + (resort.runs_double_black ?? 0)) / resort.num_runs;

                const matchesDifficulty = difficultyFilter.some((d) => {
                  if (d === "Beginner Friendly") return greenPct >= 0.3;
                  if (d === "Intermediate") return bluePct >= 0.3;
                  if (d === "Advanced") return blackPct >= 0.3;
                  return false;
                });
                if (!matchesDifficulty) return false;
              }

              // Verified filter
              if (verifiedOnly && !resort.is_verified) return false;

              return true;
            }),
          }))
          .filter((country) => country.resorts.length > 0),
      }))
      .filter((continent) => continent.countries.length > 0);
  }, [continentFilter, searchQuery, countryFilter, verticalDropFilter, runsFilter, difficultyFilter, verifiedOnly]);

  const totalFiltered = filteredHierarchy.reduce(
    (sum, c) => sum + c.countries.reduce((s, co) => s + co.resorts.length, 0),
    0
  );

  return (
    <>
      {/* ═══ HERO — Dark with globe ═══════════════════════ */}
      <section className="relative overflow-hidden bg-primary">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute -top-40 right-0 h-[600px] w-[600px] rounded-full bg-secondary/5 blur-[150px]" />
          <div className="absolute -bottom-40 left-0 h-[400px] w-[400px] rounded-full bg-highlight/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pb-12 pt-20">
          {/* Header text */}
          <div className="text-center">
            <span className="inline-block text-sm font-bold uppercase tracking-widest text-secondary">
              Explore
            </span>
            <h1 className="mt-3 text-5xl font-extrabold text-white md:text-6xl">
              Discover Resorts
              <br />
              <span className="text-gradient">Worldwide</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/40">
              <span className="hidden md:inline">Spin the globe, pick a mountain, start your adventure. </span>
              <span className="md:hidden">Pick a region, find your mountain. </span>
              {resorts.length} resorts across 12 countries.
            </p>
          </div>

          {/* Continent filter pills */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {CONTINENTS.map((continent) => (
              <button
                key={continent}
                onClick={() => setContinentFilter(continent)}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  continentFilter === continent
                    ? "bg-white text-primary shadow-lg shadow-white/10"
                    : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {continent}
                <span className={`ml-1.5 text-xs ${
                  continentFilter === continent ? "text-primary/50" : "text-white/30"
                }`}>
                  {CONTINENT_COUNTS[continent]}
                </span>
              </button>
            ))}
          </div>

          {/* Globe — desktop/tablet only */}
          <div className="mt-6 hidden md:block">
            <div className="relative">
              {/* Globe search bar — overlaid top-left */}
              <div ref={globeSearchRef} className="absolute left-4 top-4 z-10 w-72">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search countries or resorts..."
                    value={globeSearch}
                    onChange={(e) => {
                      setGlobeSearch(e.target.value);
                      setGlobeSearchSelection(null);
                      setShowGlobeSuggestions(true);
                    }}
                    onFocus={() => setShowGlobeSuggestions(true)}
                    className="w-full rounded-lg border border-white/20 bg-white/10 py-2.5 pl-10 pr-8 text-sm text-white placeholder:text-white/40 backdrop-blur-md focus:border-secondary/50 focus:outline-none"
                  />
                  {globeSearch && (
                    <button
                      onClick={() => { setGlobeSearch(""); setGlobeSearchSelection(null); }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {showGlobeSuggestions && globeSuggestions.length > 0 && (
                  <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-white/20 bg-white/95 shadow-xl backdrop-blur-md">
                    {globeSuggestions.map((s, i) => (
                      <button
                        key={`${s.type}-${s.name}-${i}`}
                        onClick={() => {
                          setGlobeSearchSelection(s.countrySlug);
                          setGlobeSearch(s.name);
                          setShowGlobeSuggestions(false);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-secondary/10"
                      >
                        <div>
                          <p className="text-sm font-medium text-primary">{s.name}</p>
                          {s.type === "resort" && (
                            <p className="text-xs text-foreground/50">{s.country}</p>
                          )}
                        </div>
                        <span className="rounded-full bg-accent/50 px-2 py-0.5 text-[10px] font-medium text-foreground/40">
                          {s.type === "country" ? "Country" : "Resort"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <GlobeComponent continentFilter={globeSearchSelection ? "All" : continentFilter} selectedCountry={globeSearchSelection} />
            </div>
          </div>

          {/* Mobile region explorer — mobile only */}
          <div className="md:hidden pb-10">
            <MobileRegionExplorer
              continentFilter={continentFilter}
              onSelectContinent={setContinentFilter}
            />
          </div>
        </div>

        {/* Fade to background */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a1628] to-transparent" />
      </section>

      {/* ═══ SEARCH + RESORT LIST ═════════════════════════ */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Search bar */}
        <div className="animate-on-scroll flex flex-col items-center">
          <div className="relative w-full max-w-xl">
            <svg
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/30"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search resorts, towns, or countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-accent/50 bg-white py-4 pl-12 pr-4 text-sm text-primary shadow-sm placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter toggle + count */}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                showFilters || activeFilterCount > 0
                  ? "border-secondary/40 bg-secondary/5 text-secondary"
                  : "border-accent/50 bg-white text-foreground/60 hover:border-secondary/30 hover:text-secondary"
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm font-medium text-secondary hover:text-secondary/80 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-4 w-full max-w-3xl rounded-2xl border border-accent/30 bg-white p-5 shadow-sm animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {/* Country filter */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground/40">Country</label>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="w-full rounded-lg border border-accent/50 bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  >
                    <option value="All">All Countries</option>
                    {ALL_COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Vertical drop filter */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground/40">Vertical Drop</label>
                  <select
                    value={verticalDropFilter}
                    onChange={(e) => setVerticalDropFilter(Number(e.target.value))}
                    className="w-full rounded-lg border border-accent/50 bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  >
                    {VERTICAL_DROP_OPTIONS.map((opt, i) => (
                      <option key={opt.label} value={i}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Runs filter */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground/40">Number of Runs</label>
                  <select
                    value={runsFilter}
                    onChange={(e) => setRunsFilter(Number(e.target.value))}
                    className="w-full rounded-lg border border-accent/50 bg-white px-3 py-2 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  >
                    {RUNS_OPTIONS.map((opt, i) => (
                      <option key={opt.label} value={i}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Difficulty filter */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground/40">Difficulty</label>
                  <div className="flex flex-wrap gap-2">
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <button
                        key={d}
                        onClick={() =>
                          setDifficultyFilter((prev) =>
                            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                          )
                        }
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                          difficultyFilter.includes(d)
                            ? "bg-secondary text-white shadow-sm"
                            : "bg-primary/5 text-primary/60 hover:bg-primary/10"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Verified only toggle */}
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-foreground/40">Verified</label>
                  <button
                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      verifiedOnly
                        ? "bg-green-500 text-white shadow-sm"
                        : "bg-primary/5 text-primary/60 hover:bg-primary/10"
                    }`}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verified Only
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {countryFilter !== "All" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                  {countryFilter}
                  <button onClick={() => setCountryFilter("All")} className="ml-0.5 hover:text-secondary/70">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              )}
              {verticalDropFilter !== 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                  Drop: {VERTICAL_DROP_OPTIONS[verticalDropFilter].label}
                  <button onClick={() => setVerticalDropFilter(0)} className="ml-0.5 hover:text-secondary/70">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              )}
              {runsFilter !== 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                  Runs: {RUNS_OPTIONS[runsFilter].label}
                  <button onClick={() => setRunsFilter(0)} className="ml-0.5 hover:text-secondary/70">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              )}
              {difficultyFilter.map((d) => (
                <span key={d} className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary">
                  {d}
                  <button onClick={() => setDifficultyFilter((prev) => prev.filter((x) => x !== d))} className="ml-0.5 hover:text-secondary/70">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              ))}
              {verifiedOnly && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-600">
                  Verified Only
                  <button onClick={() => setVerifiedOnly(false)} className="ml-0.5 hover:text-green-500/70">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              )}
            </div>
          )}

          <p className="mt-3 text-sm text-foreground/40">
            {searchQuery ? (
              <>
                <span className="font-semibold text-primary">{totalFiltered}</span>{" "}
                {totalFiltered === 1 ? "resort" : "resorts"} found
              </>
            ) : (
              <>
                Showing <span className="font-semibold text-primary">{totalFiltered}</span> resorts
                {continentFilter !== "All" && ` in ${continentFilter}`}
              </>
            )}
          </p>
        </div>

        {/* Resort grid grouped by continent → country */}
        <div className="mt-12 space-y-16">
          {filteredHierarchy.map((continent) => (
            <section key={continent.name} className={hasInteracted.current ? "" : "animate-on-scroll"}>
              {/* Continent header */}
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-extrabold text-primary">{continent.name}</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-accent to-transparent" />
                <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  {continent.countries.reduce((s, c) => s + c.resorts.length, 0)} resorts
                </span>
              </div>

              <div className="mt-8 space-y-10">
                {continent.countries.map((country) => (
                  <div key={country.name}>
                    {/* Country label */}
                    <div className="mb-4 flex items-center gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">
                        {country.name}
                      </h3>
                      <span className="text-xs text-foreground/30">
                        {country.resorts.length} {country.resorts.length === 1 ? "resort" : "resorts"}
                      </span>
                    </div>

                    {/* Resort cards */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {country.resorts.map((entry) => {
                        const resort = resortMap.get(entry.id);
                        if (!resort) return null;
                        return (
                          <Link
                            key={resort.id}
                            href={`/resorts/${resort.id}`}
                            className="group relative overflow-hidden rounded-2xl border border-accent/30 bg-white transition-all hover-lift"
                          >
                            {/* Image header */}
                            <div className="relative h-36 overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10">
                              {resort.banner_image_url ? (
                                <Image
                                  src={resort.banner_image_url}
                                  alt={resort.name}
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <svg className="h-10 w-10 text-secondary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                              {/* Verified badge */}
                              {resort.is_verified && (
                                <div className="absolute top-3 right-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-green-600 backdrop-blur-sm">
                                  Verified
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="p-5">
                              <h4 className="text-base font-bold text-primary transition-colors group-hover:text-secondary">
                                {resort.name}
                              </h4>
                              <p className="mt-1 text-sm text-foreground/50">
                                {[resort.nearest_town, resort.state_province]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>

                              {/* Stats row */}
                              <div className="mt-4 flex items-center gap-4">
                                {resort.vertical_drop_m && (
                                  <div className="flex items-center gap-1.5">
                                    <svg className="h-3.5 w-3.5 text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                    </svg>
                                    <span className="text-xs font-semibold text-primary">{resort.vertical_drop_m}m</span>
                                  </div>
                                )}
                                {resort.num_runs && (
                                  <div className="flex items-center gap-1.5">
                                    <svg className="h-3.5 w-3.5 text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                    <span className="text-xs font-semibold text-primary">{resort.num_runs} runs</span>
                                  </div>
                                )}
                                {resort.num_lifts && (
                                  <div className="flex items-center gap-1.5">
                                    <svg className="h-3.5 w-3.5 text-secondary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                    <span className="text-xs font-semibold text-primary">{resort.num_lifts} lifts</span>
                                  </div>
                                )}
                              </div>

                              {/* Run difficulty bar */}
                              {resort.runs_green !== null && resort.num_runs && (
                                <div className="mt-3 flex h-1.5 overflow-hidden rounded-full">
                                  {resort.runs_green !== null && resort.runs_green > 0 && (
                                    <div
                                      className="bg-green-400"
                                      style={{ width: `${(resort.runs_green / resort.num_runs) * 100}%` }}
                                    />
                                  )}
                                  {resort.runs_blue !== null && resort.runs_blue > 0 && (
                                    <div
                                      className="bg-blue-400"
                                      style={{ width: `${(resort.runs_blue / resort.num_runs) * 100}%` }}
                                    />
                                  )}
                                  {resort.runs_black !== null && resort.runs_black > 0 && (
                                    <div
                                      className="bg-gray-800"
                                      style={{ width: `${(resort.runs_black / resort.num_runs) * 100}%` }}
                                    />
                                  )}
                                  {resort.runs_double_black !== null && resort.runs_double_black > 0 && (
                                    <div
                                      className="bg-gray-900"
                                      style={{ width: `${(resort.runs_double_black / resort.num_runs) * 100}%` }}
                                    />
                                  )}
                                </div>
                              )}

                              {/* View link */}
                              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-secondary opacity-0 transition-all duration-300 group-hover:opacity-100">
                                View Resort
                                <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {/* No results */}
          {filteredHierarchy.length === 0 && (
            <div className="rounded-2xl border border-accent/30 bg-white py-20 text-center">
              <svg className="mx-auto h-12 w-12 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="mt-4 text-lg font-bold text-primary">No resorts found</p>
              <p className="mt-1 text-sm text-foreground/40">Try a different search or filter.</p>
              <button
                onClick={clearAllFilters}
                className="mt-4 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═══ CTA ═════════════════════════════════════════ */}
      <section className="border-t border-accent/30 bg-white py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <div className="animate-on-scroll-scale">
            <h2 className="text-3xl font-extrabold text-primary">
              Found your resort?
              <span className="text-gradient"> Start applying</span>
            </h2>
            <p className="mt-3 text-foreground/50">
              Browse open positions at your favourite resorts and apply with one click.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/jobs"
                className="group relative overflow-hidden rounded-xl bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:shadow-xl"
              >
                <span className="relative z-10">Browse Jobs</span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-secondary/30 to-highlight/30 transition-transform duration-500 group-hover:translate-x-0" />
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border-2 border-primary/10 px-8 py-3.5 text-sm font-bold text-primary transition-all hover:border-primary/30 hover:bg-primary/5"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

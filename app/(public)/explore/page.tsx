"use client";

import { useState, useMemo } from "react";
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

const resortMap = new Map(resorts.map((r) => [r.id, r]));

const CONTINENTS = ["All", "North America", "Europe", "Asia", "Oceania", "South America"];

const CONTINENT_COUNTS: Record<string, number> = {
  All: resorts.length,
  "North America": 0,
  Europe: 0,
  Asia: 0,
  Oceania: 0,
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
  Asia: "https://images.unsplash.com/photo-1547178681-1c2ab0de tried2?w=400&q=80",
  Oceania: "https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=400&q=80",
  "South America": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80",
};

export default function ExplorePage() {
  const [continentFilter, setContinentFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useScrollAnimation();

  // Filter resorts by search
  const filteredHierarchy = useMemo(() => {
    return regionHierarchy
      .filter((continent) => continentFilter === "All" || continent.name === continentFilter)
      .map((continent) => ({
        ...continent,
        countries: continent.countries
          .map((country) => ({
            ...country,
            resorts: country.resorts.filter((entry) => {
              if (!searchQuery) return true;
              const resort = resortMap.get(entry.id);
              if (!resort) return false;
              const q = searchQuery.toLowerCase();
              return (
                resort.name.toLowerCase().includes(q) ||
                (resort.nearest_town?.toLowerCase().includes(q) ?? false) ||
                country.name.toLowerCase().includes(q)
              );
            }),
          }))
          .filter((country) => country.resorts.length > 0),
      }))
      .filter((continent) => continent.countries.length > 0);
  }, [continentFilter, searchQuery]);

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

        <div className="relative mx-auto max-w-7xl px-6 pb-0 pt-20">
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
              Spin the globe, pick a mountain, start your adventure. {resorts.length} resorts across 12 countries.
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

          {/* Globe */}
          <div className="mt-6">
            <GlobeComponent continentFilter={continentFilter} />
          </div>
        </div>

        {/* Fade to background */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ═══ SEARCH + RESORT LIST ═════════════════════════ */}
      <section className="mx-auto max-w-7xl px-6 py-16">
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
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground/60"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
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
            <section key={continent.name} className="animate-on-scroll">
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
                onClick={() => {
                  setSearchQuery("");
                  setContinentFilter("All");
                }}
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

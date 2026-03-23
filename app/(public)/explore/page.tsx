"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { resorts } from "@/lib/data/resorts";
import { regionHierarchy } from "@/lib/data/region-hierarchy";

const GlobeComponent = dynamic(() => import("@/components/globe/Globe"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center text-foreground/40" style={{ minHeight: 500 }}>
      Loading globe…
    </div>
  ),
});

const resortMap = new Map(resorts.map((r) => [r.id, r]));

const CONTINENTS = ["All", "North America", "Europe", "Asia", "Oceania", "South America"];

const CONTINENT_ICONS: Record<string, string> = {
  All: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9",
  "North America": "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064",
  Europe: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064",
  Asia: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064",
  Oceania: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064",
  "South America": "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064",
};

const CONTINENT_COUNTS: Record<string, number> = {
  All: resorts.length,
  "North America": 0,
  Europe: 0,
  Asia: 0,
  Oceania: 0,
  "South America": 0,
};

// Count resorts per continent
regionHierarchy.forEach((continent) => {
  const total = continent.countries.reduce((sum, c) => sum + c.resorts.length, 0);
  const key = continent.name;
  if (key in CONTINENT_COUNTS) {
    CONTINENT_COUNTS[key] = total;
  }
});

export default function ExplorePage() {
  const [continentFilter, setContinentFilter] = useState("All");

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-4xl font-bold text-primary">Explore Resorts</h1>
      <p className="mt-2 text-foreground/70">
        Discover ski resorts worldwide. Click a region to zoom in, or filter by continent.
      </p>

      {/* Globe section — filter on left, globe takes rest */}
      <div className="mt-8 flex gap-6">
        {/* Left: continent filter */}
        <div className="hidden w-48 shrink-0 space-y-1.5 pt-4 lg:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/40">
            Filter by Region
          </p>
          {CONTINENTS.map((continent) => (
            <button
              key={continent}
              onClick={() => setContinentFilter(continent)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                continentFilter === continent
                  ? "bg-primary text-white"
                  : "text-foreground/70 hover:bg-accent/20 hover:text-foreground"
              }`}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={CONTINENT_ICONS[continent]} />
              </svg>
              <span className="flex-1">{continent}</span>
              <span className={`text-xs ${
                continentFilter === continent ? "text-white/70" : "text-foreground/40"
              }`}>
                {CONTINENT_COUNTS[continent]}
              </span>
            </button>
          ))}
        </div>

        {/* Mobile filter — horizontal pills */}
        <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
          {CONTINENTS.map((continent) => (
            <button
              key={continent}
              onClick={() => setContinentFilter(continent)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                continentFilter === continent
                  ? "bg-primary text-white"
                  : "bg-white text-foreground/60 border border-accent hover:bg-accent/20"
              }`}
            >
              {continent} ({CONTINENT_COUNTS[continent]})
            </button>
          ))}
        </div>

        {/* Globe — no box, transparent background */}
        <div className="flex-1">
          <GlobeComponent continentFilter={continentFilter} />
        </div>
      </div>

      {/* Resort List — grouped by Region then Country */}
      <h2 className="mt-12 text-2xl font-semibold text-primary">
        All Resorts
      </h2>

      <div className="mt-8 space-y-12">
        {regionHierarchy
          .filter((continent) =>
            continentFilter === "All" || continent.name === continentFilter
          )
          .map((continent) => (
          <section key={continent.name}>
            <h3 className="flex items-center gap-3 text-xl font-bold text-primary">
              {continent.name}
              <span className="h-px flex-1 bg-accent" />
              <span className="text-sm font-normal text-foreground/40">
                {continent.countries.reduce(
                  (sum, c) => sum + c.resorts.length,
                  0
                )}{" "}
                resorts
              </span>
            </h3>

            <div className="mt-6 space-y-8">
              {continent.countries.map((country) => (
                <div key={country.name}>
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground/50">
                    {country.name}
                  </h4>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {country.resorts.map((entry) => {
                      const resort = resortMap.get(entry.id);
                      if (!resort) return null;
                      return (
                        <Link
                          key={resort.id}
                          href={`/resorts/${resort.id}`}
                          className="group rounded-lg border border-accent bg-white p-4 transition-shadow hover:shadow-md"
                        >
                          <h5 className="font-semibold text-primary group-hover:text-secondary">
                            {resort.name}
                          </h5>
                          <p className="mt-1 text-sm text-foreground/70">
                            {[resort.nearest_town, resort.state_province]
                              .filter(Boolean)
                              .join(", ")}
                          </p>
                          <div className="mt-2 flex gap-3 text-xs text-foreground/50">
                            {resort.num_runs && (
                              <span>{resort.num_runs} runs</span>
                            )}
                            {resort.num_lifts && (
                              <span>{resort.num_lifts} lifts</span>
                            )}
                            {resort.vertical_drop_m && (
                              <span>{resort.vertical_drop_m}m</span>
                            )}
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
      </div>
    </div>
  );
}

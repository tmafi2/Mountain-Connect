"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  regionHierarchy,
  type ContinentEntry,
  type CountryEntry,
} from "@/lib/data/region-hierarchy";

interface RegionsDropdownProps {
  textColor?: string;
  hoverColor?: string;
  activeColor?: string;
}

export default function RegionsDropdown({
  textColor = "text-foreground",
  hoverColor = "hover:bg-accent/30 hover:text-primary",
  activeColor = "bg-secondary/15 text-primary",
}: RegionsDropdownProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selectedContinent, setSelectedContinent] =
    useState<ContinentEntry | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryEntry | null>(
    null
  );

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSelectedContinent(null);
        setSelectedCountry(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSelectedContinent(null);
        setSelectedCountry(null);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const toggleOpen = useCallback(() => {
    setOpen((prev) => {
      if (prev) {
        setSelectedContinent(null);
        setSelectedCountry(null);
      }
      return !prev;
    });
  }, []);

  const handleContinentClick = useCallback((continent: ContinentEntry) => {
    setSelectedContinent(continent);
    setSelectedCountry(null);
  }, []);

  const handleCountryClick = useCallback((country: CountryEntry) => {
    setSelectedCountry(country);
  }, []);

  const handleResortClick = useCallback(
    (resortId: string) => {
      setOpen(false);
      setSelectedContinent(null);
      setSelectedCountry(null);
      router.push(`/resorts/${resortId}`);
    },
    [router]
  );

  const handleBack = useCallback(() => {
    if (selectedCountry) {
      setSelectedCountry(null);
    } else if (selectedContinent) {
      setSelectedContinent(null);
    }
  }, [selectedContinent, selectedCountry]);

  // Determine current panel title and content
  let panelTitle = "Select a Region";
  if (selectedCountry) {
    panelTitle = selectedCountry.name;
  } else if (selectedContinent) {
    panelTitle = selectedContinent.name;
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={toggleOpen}
        className={`flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
          open
            ? activeColor
            : `${textColor} ${hoverColor}`
        }`}
      >
        Regions
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m19.5 8.25-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 overflow-hidden rounded-xl border border-accent bg-white shadow-lg">
          {/* Header with back button */}
          <div className="flex items-center gap-2 border-b border-accent/50 px-4 py-2.5">
            {(selectedContinent || selectedCountry) && (
              <button
                onClick={handleBack}
                className="flex h-6 w-6 items-center justify-center rounded-md text-foreground/60 transition-colors hover:bg-accent/30 hover:text-primary"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5 8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground/50">
              {panelTitle}
            </span>
          </div>

          {/* Content */}
          <div className="max-h-72 overflow-y-auto py-1">
            {/* Level 1: Continents */}
            {!selectedContinent &&
              regionHierarchy.map((continent) => (
                <button
                  key={continent.name}
                  onClick={() => handleContinentClick(continent)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary/10 hover:text-primary"
                >
                  <span>{continent.name}</span>
                  <svg
                    className="h-3.5 w-3.5 text-foreground/30"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m8.25 4.5 7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </button>
              ))}

            {/* Level 2: Countries */}
            {selectedContinent &&
              !selectedCountry &&
              selectedContinent.countries.map((country) => (
                <button
                  key={country.name}
                  onClick={() => handleCountryClick(country)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary/10 hover:text-primary"
                >
                  <span>{country.name}</span>
                  <div className="flex items-center gap-2">
                    {country.resorts.length === 0 && (
                      <span className="text-[10px] text-foreground/30">
                        Coming soon
                      </span>
                    )}
                    <svg
                      className="h-3.5 w-3.5 text-foreground/30"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m8.25 4.5 7.5 7.5-7.5 7.5"
                      />
                    </svg>
                  </div>
                </button>
              ))}

            {/* Level 3: Resorts */}
            {selectedCountry &&
              (selectedCountry.resorts.length > 0 ? (
                selectedCountry.resorts.map((resort) => (
                  <button
                    key={resort.id}
                    onClick={() => handleResortClick(resort.id)}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-secondary/10 hover:text-primary"
                  >
                    <span className="text-xs text-secondary">⛷</span>
                    <span>{resort.name}</span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-sm text-foreground/40">
                  No resorts listed yet.
                  <br />
                  Check back soon!
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

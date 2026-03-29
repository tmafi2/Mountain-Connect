"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { resorts } from "@/lib/data/resorts";
import type { Resort } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

/* ─── helpers ─────────────────────────────────────────────── */
function formatSeason(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("en-AU", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-AU", { month: "short", day: "numeric" })}`;
}

function CompareValue({ value, unit, best }: { value: string | number | null | undefined; unit?: string; best?: boolean }) {
  if (value == null || value === "") return <span className="text-foreground/30">—</span>;
  return (
    <span className={best ? "font-bold text-secondary" : ""}>
      {typeof value === "number" ? value.toLocaleString() : value}
      {unit && <span className="ml-0.5 text-foreground/40 text-xs">{unit}</span>}
    </span>
  );
}

/* ─── main page ───────────────────────────────────────────── */
export default function ComparePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-secondary" /></div>}>
      <CompareContent />
    </Suspense>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) || [];

  const [jobCounts, setJobCounts] = useState<Record<string, number>>({});

  const selected = useMemo(() => {
    return ids
      .map((id) => resorts.find((r) => r.id === id))
      .filter((r): r is Resort => r != null)
      .slice(0, 3);
  }, [ids]);

  // Fetch active job counts for each resort
  useEffect(() => {
    if (selected.length === 0) return;
    (async () => {
      try {
        const supabase = createClient();
        const counts: Record<string, number> = {};
        for (const r of selected) {
          const { count } = await supabase
            .from("job_posts")
            .select("id", { count: "exact", head: true })
            .eq("resort_id", r.id)
            .eq("status", "active");
          counts[r.id] = count ?? 0;
        }
        setJobCounts(counts);
      } catch {
        // silent
      }
    })();
  }, [selected]);

  if (selected.length < 2) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
          <svg className="h-8 w-8 text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-primary">Compare Resorts</h1>
        <p className="mt-2 text-sm text-foreground/50">Select 2 or 3 resorts from the Explore page to compare them side by side.</p>
        <Link
          href="/explore"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-secondary-light"
        >
          Go to Explore
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>
    );
  }

  // Determine "best" values for highlighting
  const maxVertical = Math.max(...selected.map((r) => r.vertical_drop_m ?? 0));
  const maxRuns = Math.max(...selected.map((r) => r.num_runs ?? 0));
  const maxLifts = Math.max(...selected.map((r) => r.num_lifts ?? 0));
  const maxArea = Math.max(...selected.map((r) => r.skiable_terrain_ha ?? 0));
  const maxSnow = Math.max(...selected.map((r) => r.snowfall_avg_cm ?? 0));
  const maxJobs = Math.max(...selected.map((r) => jobCounts[r.id] ?? 0));

  const rows: { label: string; icon: string; values: { value: string | number | null; unit?: string; best?: boolean }[] }[] = [
    {
      label: "Vertical Drop",
      icon: "↕️",
      values: selected.map((r) => ({ value: r.vertical_drop_m, unit: "m", best: r.vertical_drop_m === maxVertical && maxVertical > 0 })),
    },
    {
      label: "Number of Runs",
      icon: "🎿",
      values: selected.map((r) => ({ value: r.num_runs, best: r.num_runs === maxRuns && maxRuns > 0 })),
    },
    {
      label: "Lifts",
      icon: "🚡",
      values: selected.map((r) => ({ value: r.num_lifts, best: r.num_lifts === maxLifts && maxLifts > 0 })),
    },
    {
      label: "Skiable Area",
      icon: "⛰️",
      values: selected.map((r) => ({ value: r.skiable_terrain_ha, unit: "ha", best: r.skiable_terrain_ha === maxArea && maxArea > 0 })),
    },
    {
      label: "Avg Snowfall",
      icon: "❄️",
      values: selected.map((r) => ({ value: r.snowfall_avg_cm, unit: "cm", best: r.snowfall_avg_cm === maxSnow && maxSnow > 0 })),
    },
    {
      label: "Season Dates",
      icon: "📅",
      values: selected.map((r) => ({ value: formatSeason(r.season_start, r.season_end) })),
    },
    {
      label: "Summit Elevation",
      icon: "🏔️",
      values: selected.map((r) => ({ value: r.summit_elevation_m, unit: "m" })),
    },
    {
      label: "Base Elevation",
      icon: "📍",
      values: selected.map((r) => ({ value: r.base_elevation_m, unit: "m" })),
    },
    {
      label: "Snow Reliability",
      icon: "✅",
      values: selected.map((r) => ({ value: r.snow_reliability ? r.snow_reliability.charAt(0).toUpperCase() + r.snow_reliability.slice(1) : null })),
    },
    {
      label: "Staff Housing",
      icon: "🏠",
      values: selected.map((r) => ({ value: r.staff_housing_available ? "Available" : "Not available" })),
    },
    {
      label: "Housing Cost",
      icon: "💰",
      values: selected.map((r) => ({ value: r.staff_housing_avg_rent })),
    },
    {
      label: "Cost of Living",
      icon: "🛒",
      values: selected.map((r) => ({ value: r.cost_of_living_weekly })),
    },
    {
      label: "Seasonal Staff",
      icon: "👥",
      values: selected.map((r) => ({ value: r.estimated_seasonal_staff })),
    },
    {
      label: "Languages",
      icon: "🗣️",
      values: selected.map((r) => ({ value: r.languages_required?.join(", ") || null })),
    },
    {
      label: "Active Jobs",
      icon: "💼",
      values: selected.map((r) => ({ value: jobCounts[r.id] ?? 0, best: (jobCounts[r.id] ?? 0) === maxJobs && maxJobs > 0 })),
    },
  ];

  const colWidth = selected.length === 2 ? "w-1/2" : "w-1/3";

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-primary">Resort Comparison</h1>
          <p className="mt-1 text-sm text-foreground/50">
            Comparing {selected.length} resorts side by side
          </p>
        </div>
        <Link
          href="/explore"
          className="flex items-center gap-2 rounded-lg border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground/60 transition-colors hover:border-secondary/40 hover:text-primary"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Explore
        </Link>
      </div>

      {/* Resort Headers */}
      <div className="sticky top-16 z-20 -mx-6 bg-background/95 px-6 py-4 backdrop-blur-md border-b border-accent/30">
        <div className="flex gap-4">
          {selected.map((r) => (
            <div key={r.id} className={`${colWidth} min-w-0`}>
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-accent/20">
                  {r.banner_image_url ? (
                    <Image src={r.banner_image_url} alt={r.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg">⛷</div>
                  )}
                </div>
                <div className="min-w-0">
                  <Link href={`/resorts/${r.id}`} className="truncate text-sm font-bold text-primary hover:text-secondary transition-colors">
                    {r.name}
                  </Link>
                  <p className="truncate text-xs text-foreground/40">
                    {[r.nearest_town, r.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="mt-2 divide-y divide-accent/30">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-4 py-4">
            <div className="w-36 flex-shrink-0">
              <span className="text-sm font-medium text-foreground/70">
                <span className="mr-1.5">{row.icon}</span>
                {row.label}
              </span>
            </div>
            {row.values.map((v, i) => (
              <div key={i} className={`${colWidth} min-w-0 text-sm text-primary`}>
                <CompareValue value={v.value} unit={v.unit} best={v.best} />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Run Difficulty Comparison */}
      <div className="mt-8 rounded-2xl border border-accent/30 bg-white p-6">
        <h2 className="text-sm font-semibold text-primary mb-4">Run Difficulty Breakdown</h2>
        <div className="flex gap-4">
          {selected.map((r) => (
            <div key={r.id} className={`${colWidth} min-w-0`}>
              <p className="mb-2 text-xs font-medium text-foreground/50">{r.name}</p>
              {r.num_runs ? (
                <div className="space-y-2">
                  <DifficultyBar label="Green" count={r.runs_green} total={r.num_runs} color="bg-green-400" />
                  <DifficultyBar label="Blue" count={r.runs_blue} total={r.num_runs} color="bg-blue-400" />
                  <DifficultyBar label="Black" count={r.runs_black} total={r.num_runs} color="bg-gray-800" />
                  <DifficultyBar label="Double Black" count={r.runs_double_black} total={r.num_runs} color="bg-gray-900" />
                </div>
              ) : (
                <p className="text-xs text-foreground/30">No run data</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* View Jobs CTA */}
      <div className="mt-8 flex gap-4">
        {selected.map((r) => (
          <Link
            key={r.id}
            href={`/jobs?resort=${encodeURIComponent(r.name)}`}
            className={`${colWidth} flex items-center justify-center gap-2 rounded-xl border border-secondary/30 bg-secondary/5 py-3 text-sm font-semibold text-secondary transition-all hover:bg-secondary/10`}
          >
            View Jobs at {r.name}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Difficulty Bar ──────────────────────────────────────── */
function DifficultyBar({ label, count, total, color }: { label: string; count: number | null; total: number; color: string }) {
  const pct = count && total ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-xs text-foreground/50">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent/20">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-right text-xs font-medium text-foreground/60">{count ?? 0}</span>
    </div>
  );
}

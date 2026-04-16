import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Towns — Seasonal Worker Town Guides | Mountain Connects",
  description:
    "Discover the towns where seasonal ski workers live, eat, and socialise. Housing, transport, cost of living, and insider tips for every resort town.",
  alternates: { canonical: "https://www.mountainconnects.com/towns" },
  openGraph: {
    title: "Explore Towns — Seasonal Worker Town Guides",
    description:
      "Discover the towns where seasonal ski workers live. Housing, transport, cost of living, and insider tips for 50+ resort towns worldwide.",
    url: "https://www.mountainconnects.com/towns",
    siteName: "Mountain Connects",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Explore Towns — Seasonal Worker Town Guides | Mountain Connects",
    description:
      "Discover the towns where seasonal ski workers live. Housing, transport, and insider tips.",
  },
};

interface TownWithResorts {
  id: string;
  name: string;
  slug: string;
  country: string;
  state_region: string | null;
  description: string | null;
  hero_image_url: string | null;
  resort_names: string[];
}

export default async function TownsIndexPage() {
  const supabase = await createClient();

  // Fetch all towns
  const { data: towns } = await supabase
    .from("nearby_towns")
    .select("id, name, slug, country, state_region, description, hero_image_url")
    .order("country")
    .order("name");

  if (!towns || towns.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-6 py-16 text-center">
          <h1 className="text-3xl font-bold text-primary">Explore Towns</h1>
          <p className="mt-4 text-foreground/60">No towns available yet. Check back soon.</p>
        </div>
      </div>
    );
  }

  // Fetch resort links for all towns
  const townIds = towns.map((t) => t.id);
  const { data: links } = await supabase
    .from("resort_nearby_towns")
    .select("town_id, resorts(name)")
    .in("town_id", townIds);

  const resortsByTown: Record<string, string[]> = {};
  if (links) {
    for (const l of links) {
      const rName = (l.resorts as unknown as { name: string })?.name;
      if (!rName) continue;
      if (!resortsByTown[l.town_id]) resortsByTown[l.town_id] = [];
      if (!resortsByTown[l.town_id].includes(rName)) resortsByTown[l.town_id].push(rName);
    }
  }

  const townsWithResorts: TownWithResorts[] = towns.map((t) => ({
    ...t,
    resort_names: resortsByTown[t.id] || [],
  }));

  // Group by country
  const grouped: Record<string, TownWithResorts[]> = {};
  for (const t of townsWithResorts) {
    const key = t.country || "Other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(t);
  }

  const countries = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b border-accent bg-gradient-to-br from-primary/5 via-white to-secondary/5">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <h1 className="text-3xl font-bold text-primary md:text-4xl">Explore Towns</h1>
          <p className="mt-3 max-w-2xl text-foreground/60">
            Discover the towns where seasonal workers live, eat, and socialise. Every town guide
            includes housing costs, transport options, nightlife, and insider tips from workers
            who&apos;ve been there.
          </p>
          <p className="mt-2 text-sm text-foreground/40">
            {townsWithResorts.length} towns across {countries.length} countries
          </p>
        </div>
      </div>

      {/* Town listings grouped by country */}
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-12">
        {countries.map((country) => (
          <section key={country}>
            <h2 className="flex items-center gap-2 text-xl font-semibold text-primary">
              {country}
              <span className="text-sm font-normal text-foreground/40">
                ({grouped[country].length} town{grouped[country].length !== 1 ? "s" : ""})
              </span>
            </h2>
            <div className="mt-4 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {grouped[country].map((town) => (
                <Link
                  key={town.id}
                  href={`/towns/${town.slug}`}
                  className="group rounded-xl border border-accent/50 bg-white/70 p-5 transition-all hover:border-secondary/50 hover:shadow-md hover:-translate-y-0.5"
                >
                  {/* Town header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-primary group-hover:text-secondary transition-colors">
                        {town.name}
                      </h3>
                      {town.state_region && (
                        <p className="text-xs text-foreground/40">{town.state_region}</p>
                      )}
                    </div>
                    <svg
                      className="h-4 w-4 shrink-0 text-foreground/20 group-hover:text-secondary transition-colors mt-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>

                  {/* Description */}
                  {town.description && (
                    <p className="mt-2 text-sm text-foreground/60 line-clamp-2">
                      {town.description}
                    </p>
                  )}

                  {/* Resort badges */}
                  {town.resort_names.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {town.resort_names.map((name) => (
                        <span
                          key={name}
                          className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-medium text-secondary"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

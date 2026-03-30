import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResortMap from "@/components/ui/ResortMap";
import type { Metadata } from "next";

interface TownPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}

/* ── helpers ────────────────────────────────────────────────── */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xl font-semibold text-primary">
      {children}
    </h2>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2.5">
      <dt className="w-44 shrink-0 text-sm font-medium text-foreground/60">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-accent/50 bg-white/70 p-5">
      <h3 className="mb-3 text-base font-bold text-primary">{title}</h3>
      {children}
    </div>
  );
}

/* ── SEO metadata ──────────────────────────────────────────── */
const DEFAULT_OG_IMAGE = "/og-default.png";
const BASE_URL = "https://www.mountainconnects.com";

export async function generateMetadata({ params }: TownPageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: town } = await supabase
    .from("nearby_towns")
    .select("name, slug, description, country, state_region, hero_image_url, latitude, longitude")
    .eq("slug", slug)
    .single();

  if (!town) return { title: "Town Not Found | Mountain Connect" };

  // Fetch linked resort names
  const { data: links } = await supabase
    .from("resort_nearby_towns")
    .select("resorts(name)")
    .eq("town_id", (await supabase.from("nearby_towns").select("id").eq("slug", slug).single()).data?.id || "");

  const resortNames = (links || []).map((l) => (l.resorts as unknown as { name: string })?.name).filter(Boolean);

  // Build title
  let title: string;
  if (resortNames.length > 0 && resortNames.length <= 3) {
    title = `${town.name} Seasonal Worker Guide — Near ${resortNames.join(" & ")} | Mountain Connect`;
  } else {
    title = `${town.name} Seasonal Worker Guide — Housing, Jobs & Living | Mountain Connect`;
  }

  // Build description (under 160 chars)
  let description: string;
  if (town.description) {
    description = town.description.length > 155 ? town.description.slice(0, 152) + "..." : town.description;
  } else {
    const resortPart = resortNames.length > 0 ? `, transport to ${resortNames.slice(0, 2).join(" & ")}` : "";
    description = `Everything seasonal workers need to know about living in ${town.name}, ${town.country || ""}. Housing costs${resortPart}, nightlife, and jobs.`;
    if (description.length > 160) description = description.slice(0, 157) + "...";
  }

  const ogImage = town.hero_image_url || DEFAULT_OG_IMAGE;
  const canonicalUrl = `${BASE_URL}/towns/${town.slug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      images: [{ url: ogImage, alt: `${town.name} town guide` }],
      siteName: "Mountain Connect",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

/* ── page ───────────────────────────────────────────────────── */
export default async function TownDetailPage({ params, searchParams }: TownPageProps) {
  const { slug } = await params;
  const { from: fromResortLegacyId } = await searchParams;
  const supabase = await createClient();

  // Fetch town
  const { data: town } = await supabase
    .from("nearby_towns")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!town) notFound();

  // Fetch linked resorts
  const { data: links } = await supabase
    .from("resort_nearby_towns")
    .select("resort_id, distance_km, is_primary, resorts(id, name, legacy_id, country)")
    .eq("town_id", town.id);

  const linkedResorts = (links || []).map((l) => {
    const r = l.resorts as unknown as { id: string; name: string; legacy_id: string; country: string };
    return { id: r.id, name: r.name, legacyId: r.legacy_id, country: r.country, distance_km: l.distance_km };
  });

  // Fetch other towns linked to the same resorts (cross-links)
  let crossLinkedTowns: { name: string; slug: string; resortName: string; distance_km: number | null }[] = [];
  if (resortIds.length > 0) {
    const { data: otherLinks } = await supabase
      .from("resort_nearby_towns")
      .select("distance_km, resort_id, resorts(name), nearby_towns(id, name, slug)")
      .in("resort_id", resortIds)
      .neq("town_id", town.id);

    if (otherLinks) {
      const seen = new Set<string>();
      for (const ol of otherLinks) {
        const t = ol.nearby_towns as unknown as { id: string; name: string; slug: string } | null;
        const r = ol.resorts as unknown as { name: string } | null;
        if (t && !seen.has(t.slug)) {
          seen.add(t.slug);
          crossLinkedTowns.push({
            name: t.name,
            slug: t.slug,
            resortName: r?.name || "",
            distance_km: ol.distance_km,
          });
        }
      }
    }
  }

  // Fetch live jobs from linked resorts
  const resortIds = linkedResorts.map((r) => r.id);
  let jobCount = 0;
  let jobs: { id: string; title: string; business_name: string; category: string | null; resort_name: string }[] = [];
  if (resortIds.length > 0) {
    const { data: jobData } = await supabase
      .from("job_posts")
      .select("id, title, category, resort_id, business_profiles(business_name), resorts(name)")
      .in("resort_id", resortIds)
      .eq("status", "active")
      .limit(6);

    if (jobData) {
      jobs = jobData.map((j) => ({
        id: j.id,
        title: j.title,
        category: j.category,
        business_name: (j.business_profiles as unknown as { business_name: string })?.business_name || "Unknown",
        resort_name: (j.resorts as unknown as { name: string })?.name || "",
      }));
    }
    const { count } = await supabase
      .from("job_posts")
      .select("id", { count: "exact", head: true })
      .in("resort_id", resortIds)
      .eq("status", "active");
    jobCount = count ?? 0;
  }

  // Also count jobs from town-based businesses
  const { data: townBiz } = await supabase
    .from("business_profiles")
    .select("id")
    .eq("operates_in_town", true)
    .eq("nearby_town_id", town.id);

  if (townBiz && townBiz.length > 0) {
    const { count: townJobCount } = await supabase
      .from("job_posts")
      .select("id", { count: "exact", head: true })
      .in("business_id", townBiz.map((b) => b.id))
      .eq("status", "active");
    jobCount += townJobCount ?? 0;
  }

  const hasAccommodation = town.staff_housing_available || town.avg_rent_weekly || town.housing_demand || town.temporary_stay_options;
  const hasTransport = town.public_transport_to_resort || town.parking_availability || town.distance_to_airport || town.road_conditions;
  const hasCostOfLiving = town.weekly_cost_estimate || town.supermarkets || town.eating_out;
  const hasWork = town.local_employers || town.extra_job_opportunities;
  const hasLifestyle = town.bars_nightlife || town.restaurants_cafes || town.gyms_fitness || town.shops_services || town.events_festivals;
  const hasHealthcare = town.medical_facilities || town.emergency_services;
  const hasCommunity = town.vibe_atmosphere || town.international_workforce || town.social_life;
  const hasClimate = town.avg_winter_temp || town.snowfall_in_town || town.summer_appeal;
  const hasTips = town.best_time_to_arrive || town.community_groups || town.insider_tips;

  // Build resort names for JSON-LD
  const resortNamesForLd = linkedResorts.map((r) => r.name);
  const canonicalUrl = `${BASE_URL}/towns/${town.slug}`;

  const placeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: town.name,
    description: town.description || `Seasonal worker town guide for ${town.name}`,
    ...(town.latitude && town.longitude
      ? { geo: { "@type": "GeoCoordinates", latitude: town.latitude, longitude: town.longitude } }
      : {}),
    ...(town.country
      ? { containedInPlace: { "@type": "AdministrativeArea", name: [town.state_region, town.country].filter(Boolean).join(", ") } }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Explore", item: `${BASE_URL}/explore` },
      ...(resortNamesForLd.length === 1
        ? [{ "@type": "ListItem", position: 2, name: resortNamesForLd[0], item: `${BASE_URL}/explore` }]
        : []),
      { "@type": "ListItem", position: resortNamesForLd.length === 1 ? 3 : 2, name: town.name, item: canonicalUrl },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(placeJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* ═══ HERO ═══════════════════════════════════════════════ */}
      <div className="border-b border-accent bg-gradient-to-br from-primary/5 via-white to-secondary/5">
        <div className="mx-auto max-w-7xl px-6 py-10">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-2 text-sm text-foreground/50">
            <Link href="/explore" className="hover:text-primary transition-colors">Explore</Link>
            <span>/</span>
            {(() => {
              // Determine which resort to show in breadcrumb
              let breadcrumbResort: typeof linkedResorts[0] | null = null;

              if (fromResortLegacyId) {
                // User came from a specific resort page — match by legacy_id
                breadcrumbResort = linkedResorts.find((r) => r.legacyId === fromResortLegacyId) || null;
              } else if (linkedResorts.length === 1) {
                // Only one linked resort — always show it
                breadcrumbResort = linkedResorts[0];
              }
              // If multiple resorts and no ?from param, skip resort in breadcrumb

              if (breadcrumbResort) {
                return (
                  <>
                    <Link href={`/resorts/${breadcrumbResort.id}`} className="hover:text-primary transition-colors">
                      {breadcrumbResort.name}
                    </Link>
                    <span>/</span>
                  </>
                );
              }
              return null;
            })()}
            <span className="text-primary font-medium">{town.name}</span>
          </nav>

          <h1 className="text-3xl font-bold text-primary md:text-4xl">{town.name}</h1>
          <p className="mt-1 text-foreground/60">
            {[town.state_region, town.country].filter(Boolean).join(", ")}
          </p>

          {town.description && (
            <p className="mt-4 max-w-3xl text-foreground/70 leading-relaxed">{town.description}</p>
          )}

          {/* Linked Resorts badges */}
          {linkedResorts.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {linkedResorts.map((r) => (
                <Link
                  key={r.id}
                  href={`/resorts/${r.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-sm font-medium text-secondary hover:bg-secondary/20 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4" />
                  </svg>
                  {r.name}
                  {r.distance_km != null && <span className="text-secondary/60">({r.distance_km}km)</span>}
                </Link>
              ))}
            </div>
          )}
          {/* Cross-linked towns */}
          {crossLinkedTowns.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/50">
              <span>Other nearby towns:</span>
              {crossLinkedTowns.map((ct, i) => (
                <span key={ct.slug}>
                  <Link href={`/towns/${ct.slug}`} className="font-medium text-primary/70 hover:text-secondary transition-colors">
                    {ct.name}
                  </Link>
                  {ct.distance_km != null && <span className="text-foreground/30 ml-0.5">({ct.distance_km}km to {ct.resortName})</span>}
                  {i < crossLinkedTowns.length - 1 && <span className="ml-1">&middot;</span>}
                </span>
              ))}
            </div>
          )}

          {/* Hero Banner Image */}
          <div className="mt-6 relative h-72 overflow-hidden rounded-xl">
            {town.hero_image_url ? (
              <>
                <Image
                  src={town.hero_image_url}
                  alt={town.name}
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
              </>
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/20 border border-accent/30 rounded-xl">
                <div className="flex flex-col items-center gap-2 text-foreground/30">
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5zm14.25-14.25h.008v.008h-.008V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <span className="text-sm">Town photo coming soon</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ CONTENT ═════════════════════════════════════════════ */}
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-8 lg:flex-row">

          {/* ── MAIN CONTENT ──────────────────────────────────── */}
          <div className="flex-1 space-y-10">

            {/* Accommodation & Housing */}
            {hasAccommodation && (
              <section>
                <SectionHeading>Accommodation &amp; Housing</SectionHeading>
                <div className="mt-4 rounded-xl border border-accent/50 bg-white/70 p-5">
                  <dl className="divide-y divide-accent/50">
                    {town.staff_housing_available && (
                      <div className="flex items-start gap-3 py-2.5">
                        <dt className="w-44 shrink-0 text-sm font-medium text-foreground/60">Staff Housing</dt>
                        <dd className="text-sm text-foreground">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                            Available
                          </span>
                        </dd>
                      </div>
                    )}
                    <InfoRow label="Average Rent" value={town.avg_rent_weekly} />
                    <InfoRow label="Housing Demand" value={town.housing_demand} />
                    <InfoRow label="Temporary Stays" value={town.temporary_stay_options} />
                  </dl>
                </div>
              </section>
            )}

            {/* Transport & Accessibility */}
            {hasTransport && (
              <section>
                <SectionHeading>Transport &amp; Accessibility</SectionHeading>
                <div className="mt-4 rounded-xl border border-accent/50 bg-white/70 p-5">
                  <dl className="divide-y divide-accent/50">
                    <InfoRow label="To Resort" value={town.public_transport_to_resort} />
                    <InfoRow label="Parking" value={town.parking_availability} />
                    <InfoRow label="Nearest Airport" value={town.distance_to_airport} />
                    <InfoRow label="Road Conditions" value={town.road_conditions} />
                  </dl>
                </div>
              </section>
            )}

            {/* Cost of Living */}
            {hasCostOfLiving && (
              <section>
                <SectionHeading>Cost of Living</SectionHeading>
                <div className="mt-4 rounded-xl border border-accent/50 bg-white/70 p-5">
                  <dl className="divide-y divide-accent/50">
                    <InfoRow label="Weekly Estimate" value={town.weekly_cost_estimate} />
                    <InfoRow label="Supermarkets" value={town.supermarkets} />
                    <InfoRow label="Eating Out" value={town.eating_out} />
                  </dl>
                </div>
              </section>
            )}

            {/* Work & Employment */}
            {(hasWork || jobCount > 0) && (
              <section>
                <SectionHeading>Work &amp; Employment</SectionHeading>
                <div className="mt-4 space-y-4">
                  {hasWork && (
                    <div className="rounded-xl border border-accent/50 bg-white/70 p-5">
                      <dl className="divide-y divide-accent/50">
                        <InfoRow label="Local Employers" value={town.local_employers} />
                        <InfoRow label="Extra Opportunities" value={town.extra_job_opportunities} />
                      </dl>
                    </div>
                  )}

                  {/* Live job listings */}
                  <InfoCard title={`Jobs in this area (${jobCount})`}>
                    {jobs.length > 0 ? (
                      <div className="space-y-2">
                        {jobs.map((j) => (
                          <Link
                            key={j.id}
                            href={`/jobs?open=${j.id}`}
                            className="flex items-center justify-between rounded-lg border border-accent/30 px-4 py-3 hover:bg-accent/10 transition-colors"
                          >
                            <div>
                              <p className="text-sm font-semibold text-primary">{j.title}</p>
                              <p className="text-xs text-foreground/50">{j.business_name} &middot; {j.resort_name}</p>
                            </div>
                            {j.category && (
                              <span className="shrink-0 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
                                {j.category}
                              </span>
                            )}
                          </Link>
                        ))}
                        {jobCount > 6 && (
                          <Link
                            href={`/jobs?town=${town.slug}`}
                            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-secondary transition-colors"
                          >
                            View all {jobCount} jobs near {town.name} &rarr;
                          </Link>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-foreground/50">
                        No jobs posted yet.{" "}
                        <Link href="/jobs" className="text-primary underline">Browse all jobs</Link>
                      </p>
                    )}
                  </InfoCard>
                </div>
              </section>
            )}

            {/* Lifestyle & Amenities */}
            {hasLifestyle && (
              <section>
                <SectionHeading>Lifestyle &amp; Amenities</SectionHeading>
                <div className="mt-4 rounded-xl border border-accent/50 bg-white/70 p-5">
                  <dl className="divide-y divide-accent/50">
                    <InfoRow label="Bars & Nightlife" value={town.bars_nightlife} />
                    <InfoRow label="Restaurants & Cafés" value={town.restaurants_cafes} />
                    <InfoRow label="Gyms & Fitness" value={town.gyms_fitness} />
                    <InfoRow label="Shops & Services" value={town.shops_services} />
                    <InfoRow label="Events & Festivals" value={town.events_festivals} />
                  </dl>
                </div>
              </section>
            )}

            {/* Healthcare & Safety */}
            {hasHealthcare && (
              <section>
                <SectionHeading>Healthcare &amp; Safety</SectionHeading>
                <div className="mt-4 rounded-xl border border-accent/50 bg-white/70 p-5">
                  <dl className="divide-y divide-accent/50">
                    <InfoRow label="Medical Facilities" value={town.medical_facilities} />
                    <InfoRow label="Emergency Services" value={town.emergency_services} />
                  </dl>
                </div>
              </section>
            )}

            {/* Community & Culture */}
            {hasCommunity && (
              <section>
                <SectionHeading>Community &amp; Culture</SectionHeading>
                <div className="mt-4 rounded-xl border border-accent/50 bg-white/70 p-5">
                  <dl className="divide-y divide-accent/50">
                    <InfoRow label="Vibe & Atmosphere" value={town.vibe_atmosphere} />
                    <InfoRow label="International Workers" value={town.international_workforce} />
                    <InfoRow label="Social Life" value={town.social_life} />
                  </dl>
                </div>
              </section>
            )}

            {/* Climate */}
            {hasClimate && (
              <section>
                <SectionHeading>Climate</SectionHeading>
                <div className="mt-4 rounded-xl border border-accent/50 bg-white/70 p-5">
                  <dl className="divide-y divide-accent/50">
                    <InfoRow label="Winter Temperature" value={town.avg_winter_temp} />
                    <InfoRow label="Snowfall in Town" value={town.snowfall_in_town} />
                    <InfoRow label="Summer Appeal" value={town.summer_appeal} />
                  </dl>
                </div>
              </section>
            )}

            {/* Practical Tips */}
            {hasTips && (
              <section>
                <SectionHeading>Practical Tips for Seasonal Workers</SectionHeading>
                <div className="mt-4 rounded-xl border border-accent/50 bg-white/70 p-5">
                  <dl className="divide-y divide-accent/50">
                    <InfoRow label="Best Time to Arrive" value={town.best_time_to_arrive} />
                    <InfoRow label="Community Groups" value={town.community_groups} />
                    <InfoRow label="Insider Tips" value={town.insider_tips} />
                  </dl>
                </div>
              </section>
            )}
          </div>

          {/* ── SIDEBAR ───────────────────────────────────────── */}
          <div className="w-full space-y-6 lg:w-80 lg:shrink-0">

            {/* Map */}
            {town.latitude && town.longitude && (
              <div className="overflow-hidden rounded-2xl border border-accent/30 bg-white shadow-sm">
                <ResortMap
                  pins={[{
                    id: town.slug,
                    lat: town.latitude,
                    lng: town.longitude,
                    label: town.name,
                  }]}
                  center={{ lat: town.latitude, lng: town.longitude }}
                  zoom={11}
                  height="220px"
                  singlePin
                />
              </div>
            )}

            {/* Core Info Card */}
            <div className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/40">Quick Info</h3>
              <div className="mt-4 space-y-4">
                {/* Population */}
                {(town.population_permanent || town.population_seasonal) && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                      <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground/40">Population</p>
                      {town.population_permanent && (
                        <p className="text-sm text-foreground">{town.population_permanent.toLocaleString()} permanent</p>
                      )}
                      {town.population_seasonal && (
                        <p className="text-sm text-foreground">{town.population_seasonal.toLocaleString()} in season</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Website */}
                {town.website && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                      <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground/40">Website</p>
                      <a
                        href={town.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-secondary hover:underline"
                      >
                        Visit website &rarr;
                      </a>
                    </div>
                  </div>
                )}

                {/* Distance to resorts */}
                {linkedResorts.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                      <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground/40">Linked Resorts</p>
                      <div className="mt-1 space-y-1">
                        {linkedResorts.map((r) => (
                          <div key={r.id} className="flex items-center justify-between gap-2">
                            <Link href={`/resorts/${r.id}`} className="text-sm font-medium text-secondary hover:underline">{r.name}</Link>
                            {r.distance_km != null && (
                              <span className="text-xs text-foreground/40">{r.distance_km}km</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Job count */}
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                    <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground/40">Open Positions</p>
                    <p className="text-sm font-medium text-primary">
                      {jobCount > 0 ? (
                        <Link href={`/jobs?town=${town.slug}`} className="text-green-600 hover:underline">
                          {jobCount} active listing{jobCount !== 1 ? "s" : ""}
                        </Link>
                      ) : (
                        <span className="text-foreground/50">None at the moment</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="rounded-2xl border border-secondary/30 bg-secondary/5 p-5">
              <h3 className="text-sm font-bold text-primary">Planning your season?</h3>
              <p className="mt-1 text-xs text-foreground/60">Browse jobs near {town.name} and start your mountain adventure.</p>
              <Link
                href={`/jobs?town=${town.slug}`}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2.5 text-sm font-semibold text-white hover:bg-secondary-light transition-colors"
              >
                View Jobs Near {town.name} &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PLANNING YOUR SEASON CTA ════════════════════════════ */}
      <section className="border-t border-accent/30 bg-gradient-to-br from-primary/5 via-white to-secondary/5">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-primary md:text-3xl">
            Planning your season in {town.name}?
          </h2>
          <p className="mt-3 text-foreground/60">
            Browse open positions near {town.name} and apply with one click.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/jobs?town=${town.slug}`}
              className="inline-flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-secondary-light hover:shadow-lg transition-all"
            >
              Browse Jobs Near {town.name} &rarr;
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 px-6 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-all"
            >
              Explore Resorts
            </Link>
          </div>
          {linkedResorts.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-foreground/50">
              <span>Resorts nearby:</span>
              {linkedResorts.map((r, i) => (
                <span key={r.id}>
                  <Link href={`/resorts/${r.id}`} className="font-medium text-secondary hover:underline">
                    {r.name}
                  </Link>
                  {i < linkedResorts.length - 1 && <span className="ml-1">&middot;</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

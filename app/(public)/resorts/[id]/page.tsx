import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { resorts } from "@/lib/data/resorts";
import { regions } from "@/lib/data/regions";
import { formatPay } from "@/lib/utils/format-pay";
import { seedJobs } from "@/lib/data/jobs";
import { getVerifiedBusinessesForResort, getCategoryLabel } from "@/lib/data/businesses";
import ResortMap from "@/components/ui/ResortMap";
import { createClient } from "@/lib/supabase/server";

interface ResortPageProps {
  params: Promise<{ id: string }>;
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg bg-secondary/10 p-4 text-center">
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs text-foreground/60">{label}</p>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-xl font-semibold text-primary">
      {children}
    </h2>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-full bg-secondary/15 px-3 py-1 text-sm text-primary"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <dt className="w-44 shrink-0 text-sm font-medium text-foreground/60">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export default async function ResortDetailPage({ params }: ResortPageProps) {
  const { id } = await params;
  const resort = resorts.find((r) => r.id === id);

  if (!resort) {
    notFound();
  }

  const region = regions.find((r) => r.id === resort.region_id);

  // ── Query Supabase for linked businesses and real job posts ──
  let linkedBusinesses: {
    id: string;
    business_name: string;
    logo_url: string | null;
    industries: string[] | null;
    location: string | null;
    verification_status: string | null;
    description: string | null;
  }[] = [];
  let realJobs: {
    id: string;
    title: string;
    business_name: string;
    business_verified: boolean;
    category: string | null;
    position_type: string | null;
    pay_amount: string | null;
    pay_currency: string | null;
    accommodation_included: boolean;
    ski_pass_included: boolean;
    start_date: string | null;
    applications_count: number;
  }[] = [];

  try {
    const supabase = await createClient();

    // Get the resort's UUID from Supabase using legacy_id
    const { data: dbResort } = await supabase
      .from("resorts")
      .select("id")
      .eq("legacy_id", id)
      .single();

    const resortUuid = dbResort?.id;

    if (resortUuid) {
      // Get businesses linked via business_resorts junction table
      const { data: bizResorts } = await supabase
        .from("business_resorts")
        .select("business_id")
        .eq("resort_id", resortUuid);

      // Also get businesses with resort_id directly on their profile
      const { data: directBiz } = await supabase
        .from("business_profiles")
        .select("id, business_name, logo_url, industries, location, verification_status, description")
        .eq("resort_id", resortUuid);

      // Merge both sources
      const bizIds = new Set<string>();
      const allBusinesses: typeof linkedBusinesses = [];

      if (directBiz) {
        for (const b of directBiz) {
          if (!bizIds.has(b.id)) {
            bizIds.add(b.id);
            allBusinesses.push(b);
          }
        }
      }

      if (bizResorts && bizResorts.length > 0) {
        const junctionBizIds = bizResorts.map((br) => br.business_id).filter((bid) => !bizIds.has(bid));
        if (junctionBizIds.length > 0) {
          const { data: junctionBiz } = await supabase
            .from("business_profiles")
            .select("id, business_name, logo_url, industries, location, verification_status, description")
            .in("id", junctionBizIds);
          if (junctionBiz) {
            for (const b of junctionBiz) {
              if (!bizIds.has(b.id)) {
                bizIds.add(b.id);
                allBusinesses.push(b);
              }
            }
          }
        }
      }

      // Sort: verified first, then alphabetically
      linkedBusinesses = allBusinesses.sort((a, b) => {
        if (a.verification_status === "verified" && b.verification_status !== "verified") return -1;
        if (b.verification_status === "verified" && a.verification_status !== "verified") return 1;
        return a.business_name.localeCompare(b.business_name);
      });

      // Get real job posts for this resort
      const { data: jobs } = await supabase
        .from("job_posts")
        .select(`
          id, title, category, position_type, pay_amount, pay_currency,
          accommodation_included, ski_pass_included, start_date,
          status, business_id,
          business_profiles!inner(business_name, verification_status)
        `)
        .eq("resort_id", resortUuid)
        .eq("status", "active")
        .limit(10);

      if (jobs) {
        // Get application counts
        for (const job of jobs) {
          const { count } = await supabase
            .from("applications")
            .select("id", { count: "exact", head: true })
            .eq("job_id", job.id);

          const biz = job.business_profiles as any;
          realJobs.push({
            id: job.id,
            title: job.title,
            business_name: biz?.business_name || "Unknown",
            business_verified: biz?.verification_status === "verified",
            category: job.category,
            position_type: job.position_type,
            pay_amount: job.pay_amount,
            pay_currency: (job as any).pay_currency || null,
            accommodation_included: job.accommodation_included || false,
            ski_pass_included: job.ski_pass_included || false,
            start_date: job.start_date,
            applications_count: count ?? 0,
          });
        }
      }
    }
  } catch (err) {
    console.error("Failed to load resort data from Supabase:", err);
  }

  const formatSeason = () => {
    if (!resort.season_start || !resort.season_end) return null;
    const start = new Date(resort.season_start).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    const end = new Date(resort.season_end).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    return `${start} – ${end}`;
  };

  // Check which sections have data
  const hasEmployment =
    resort.main_employers ||
    resort.common_jobs ||
    resort.estimated_seasonal_staff ||
    resort.visa_requirements ||
    resort.recruitment_timeline;
  const hasAmenities =
    resort.staff_housing_available !== null ||
    resort.cost_of_living_weekly ||
    resort.public_transport ||
    resort.staff_perks;
  const hasLocalLife =
    resort.apres_scene ||
    resort.outdoor_activities ||
    resort.healthcare_access ||
    resort.shops_and_services ||
    resort.international_community_size;
  const hasClimate =
    resort.avg_winter_temp_min_c !== null ||
    resort.snow_reliability ||
    resort.artificial_snow_coverage_pct !== null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-foreground/60">
        <Link href="/explore" className="hover:text-primary">
          Explore
        </Link>
        <span>›</span>
        {region && (
          <>
            <Link
              href={`/regions/${region.id}`}
              className="hover:text-primary"
            >
              {region.name}
            </Link>
            <span>›</span>
          </>
        )}
        <span className="text-foreground">{resort.name}</span>
      </nav>

      {/* Hero / Header */}
      <div className="mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-primary">{resort.name}</h1>
            <p className="mt-2 text-lg text-foreground/70">
              {[resort.nearest_town, resort.state_province, resort.country]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {resort.is_verified && (
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                ✓ Verified Resort
              </span>
            )}
            {resort.website && (
              <a
                href={resort.website}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-accent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/30 hover:text-primary"
              >
                Visit Website ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Banner Image */}
      <div className="mt-6 relative h-72 overflow-hidden rounded-xl">
        {resort.banner_image_url ? (
          <>
            <Image
              src={resort.banner_image_url}
              alt={resort.name}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/20 border border-accent">
            <span className="text-foreground/40">Resort photos coming soon</span>
          </div>
        )}
      </div>

      {/* Quick Stats Bar */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
        {resort.vertical_drop_m && (
          <StatCard
            label="Vertical Drop"
            value={`${resort.vertical_drop_m.toLocaleString()}m`}
          />
        )}
        {resort.num_runs && (
          <StatCard label="Runs" value={resort.num_runs} />
        )}
        {resort.num_lifts && (
          <StatCard label="Lifts" value={resort.num_lifts} />
        )}
        {resort.skiable_terrain_ha && (
          <StatCard
            label="Skiable Area"
            value={`${resort.skiable_terrain_ha.toLocaleString()} ha`}
          />
        )}
        {resort.snowfall_avg_cm && (
          <StatCard
            label="Avg Snowfall"
            value={`${resort.snowfall_avg_cm.toLocaleString()} cm`}
          />
        )}
        {formatSeason() && (
          <StatCard label="Season" value={formatSeason()!} />
        )}
      </div>

      {/* Main Content Grid */}
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Left Column — Main Content */}
        <div className="space-y-10 lg:col-span-2">
          {/* About */}
          {resort.description && (
            <section>
              <SectionHeading>About</SectionHeading>
              <p className="mt-3 leading-relaxed text-foreground">
                {resort.description}
              </p>
            </section>
          )}

          {/* Resort Profile / Terrain Details */}
          {(resort.runs_green !== null ||
            resort.base_elevation_m !== null ||
            resort.lift_types) && (
            <section>
              <SectionHeading>Terrain & Mountain Profile</SectionHeading>
              <div className="mt-4 space-y-4">
                {/* Run Breakdown */}
                {resort.runs_green !== null && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground/60">
                      Run Breakdown
                    </p>
                    <div className="flex gap-3">
                      {resort.runs_green !== null && (
                        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
                          <div className="h-3 w-3 rounded-full bg-green-500" />
                          <span className="text-sm font-medium">
                            {resort.runs_green} Green
                          </span>
                        </div>
                      )}
                      {resort.runs_blue !== null && (
                        <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
                          <div className="h-3 w-3 rounded-full bg-blue-500" />
                          <span className="text-sm font-medium">
                            {resort.runs_blue} Blue
                          </span>
                        </div>
                      )}
                      {resort.runs_black !== null && (
                        <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
                          <div className="h-3 w-3 rounded-full bg-gray-900" />
                          <span className="text-sm font-medium">
                            {resort.runs_black} Black
                          </span>
                        </div>
                      )}
                      {resort.runs_double_black !== null && (
                        <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2">
                          <div className="flex gap-0.5">
                            <div className="h-3 w-1.5 rounded-sm bg-gray-900" />
                            <div className="h-3 w-1.5 rounded-sm bg-gray-900" />
                          </div>
                          <span className="text-sm font-medium">
                            {resort.runs_double_black} Double Black
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Elevations */}
                {(resort.base_elevation_m !== null ||
                  resort.summit_elevation_m !== null) && (
                  <div className="flex gap-6">
                    {resort.summit_elevation_m !== null && (
                      <div>
                        <p className="text-sm text-foreground/60">Summit</p>
                        <p className="text-lg font-semibold text-primary">
                          {resort.summit_elevation_m.toLocaleString()}m
                        </p>
                      </div>
                    )}
                    {resort.base_elevation_m !== null && (
                      <div>
                        <p className="text-sm text-foreground/60">Base</p>
                        <p className="text-lg font-semibold text-primary">
                          {resort.base_elevation_m.toLocaleString()}m
                        </p>
                      </div>
                    )}
                    {resort.vertical_drop_m !== null && (
                      <div>
                        <p className="text-sm text-foreground/60">
                          Vertical Drop
                        </p>
                        <p className="text-lg font-semibold text-primary">
                          {resort.vertical_drop_m.toLocaleString()}m
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Lift Types */}
                {resort.lift_types && (
                  <div>
                    <p className="mb-2 text-sm text-foreground/60">
                      Lift Breakdown
                    </p>
                    <div className="flex gap-4">
                      <div className="rounded-lg border border-accent bg-white px-4 py-2 text-center">
                        <p className="text-lg font-bold text-primary">
                          {resort.lift_types.gondolas}
                        </p>
                        <p className="text-xs text-foreground/60">Gondolas</p>
                      </div>
                      <div className="rounded-lg border border-accent bg-white px-4 py-2 text-center">
                        <p className="text-lg font-bold text-primary">
                          {resort.lift_types.chairlifts}
                        </p>
                        <p className="text-xs text-foreground/60">
                          Chairlifts
                        </p>
                      </div>
                      <div className="rounded-lg border border-accent bg-white px-4 py-2 text-center">
                        <p className="text-lg font-bold text-primary">
                          {resort.lift_types.surface_lifts}
                        </p>
                        <p className="text-xs text-foreground/60">
                          Surface Lifts
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Employment Context */}
          {hasEmployment && (
            <section>
              <SectionHeading>Employment & Recruitment</SectionHeading>
              <div className="mt-4 space-y-5">
                {resort.estimated_seasonal_staff && (
                  <div className="rounded-lg border border-accent bg-white p-4">
                    <p className="text-sm text-foreground/60">
                      Estimated Seasonal Staff
                    </p>
                    <p className="mt-1 text-xl font-bold text-primary">
                      {resort.estimated_seasonal_staff}
                    </p>
                  </div>
                )}

                {/* Linked Businesses (from Supabase) */}
                {linkedBusinesses.length > 0 && (
                  <div>
                    <p className="mb-3 text-sm font-medium text-foreground/60">
                      Businesses at {resort.name}
                    </p>
                    <div className="space-y-2">
                      {linkedBusinesses.map((biz) => {
                        const isVerified = biz.verification_status === "verified";
                        return (
                          <Link
                            key={biz.id}
                            href={`/business/${biz.id}`}
                            className={`group flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-sm ${
                              isVerified
                                ? "border-accent bg-white hover:border-secondary"
                                : "border-accent/60 bg-accent/5 hover:border-accent"
                            }`}
                          >
                            {biz.logo_url ? (
                              <img src={biz.logo_url} alt={biz.business_name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                            ) : (
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                                isVerified ? "bg-primary/10 text-primary" : "bg-accent/20 text-foreground/40"
                              }`}>
                                {biz.business_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-semibold truncate ${
                                  isVerified ? "text-primary group-hover:text-secondary" : "text-foreground/60"
                                }`}>
                                  {biz.business_name}
                                </p>
                                {isVerified ? (
                                  <span className="shrink-0 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                                    Verified
                                  </span>
                                ) : (
                                  <span className="shrink-0 rounded-full bg-accent/30 px-1.5 py-0.5 text-[10px] font-medium text-foreground/40">
                                    Unverified
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-foreground/50 truncate">
                                {Array.isArray(biz.industries) && biz.industries.length > 0
                                  ? biz.industries.map((ind: string) => {
                                      const label = ind.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
                                      return label;
                                    }).join(", ")
                                  : biz.location || ""}
                              </p>
                            </div>
                            <svg className="h-4 w-4 shrink-0 text-foreground/30 group-hover:text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Fallback: Main Employers from static data */}
                {linkedBusinesses.length === 0 && resort.main_employers && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground/60">
                      Main Employers
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                      {resort.main_employers.map((emp) => (
                        <li key={emp}>{emp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {resort.common_jobs && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground/60">
                      Common Seasonal Jobs
                    </p>
                    <TagList items={resort.common_jobs} />
                  </div>
                )}

                {resort.languages_required && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground/60">
                      Languages Required
                    </p>
                    <TagList items={resort.languages_required} />
                  </div>
                )}

                <dl className="divide-y divide-accent/50">
                  <InfoRow
                    label="Visa Requirements"
                    value={resort.visa_requirements}
                  />
                  <InfoRow
                    label="Recruitment Timeline"
                    value={resort.recruitment_timeline}
                  />
                </dl>
              </div>
            </section>
          )}

          {/* Worker Amenities */}
          {hasAmenities && (
            <section>
              <SectionHeading>Worker Amenities & Living</SectionHeading>
              <div className="mt-4 space-y-5">
                {resort.staff_housing_available !== null && (
                  <div className="rounded-lg border border-accent bg-white p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block h-3 w-3 rounded-full ${resort.staff_housing_available ? "bg-green-500" : "bg-red-400"}`}
                      />
                      <p className="font-medium text-foreground">
                        Staff Housing{" "}
                        {resort.staff_housing_available
                          ? "Available"
                          : "Not Available"}
                      </p>
                    </div>
                    {(resort.staff_housing_capacity ||
                      resort.staff_housing_avg_rent) && (
                      <div className="mt-2 flex gap-6 text-sm text-foreground/70">
                        {resort.staff_housing_capacity && (
                          <span>
                            Capacity: ~{resort.staff_housing_capacity} beds
                          </span>
                        )}
                        {resort.staff_housing_avg_rent && (
                          <span>Rent: {resort.staff_housing_avg_rent}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <dl className="divide-y divide-accent/50">
                  <InfoRow
                    label="Cost of Living"
                    value={resort.cost_of_living_weekly}
                  />
                  <InfoRow
                    label="Public Transport"
                    value={resort.public_transport}
                  />
                </dl>

                {resort.staff_perks && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground/60">
                      Staff Perks
                    </p>
                    <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                      {resort.staff_perks.map((perk) => (
                        <li key={perk}>{perk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Local Life & Community */}
          {hasLocalLife && (
            <section>
              <SectionHeading>Local Life & Community</SectionHeading>
              <div className="mt-4 space-y-5">
                <dl className="divide-y divide-accent/50">
                  <InfoRow
                    label="Après & Nightlife"
                    value={resort.apres_scene}
                  />
                  <InfoRow
                    label="Healthcare"
                    value={resort.healthcare_access}
                  />
                  <InfoRow
                    label="Shops & Services"
                    value={resort.shops_and_services}
                  />
                  <InfoRow
                    label="International Community"
                    value={resort.international_community_size}
                  />
                </dl>

                {resort.outdoor_activities && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-foreground/60">
                      Outdoor Activities (Non-Ski)
                    </p>
                    <TagList items={resort.outdoor_activities} />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Open Positions — Real jobs from Supabase */}
          <section>
            <SectionHeading>Open Positions</SectionHeading>
            {realJobs.length === 0 ? (
              <div className="mt-4 rounded-xl border border-accent bg-white p-6 text-center">
                <p className="text-foreground/60">
                  No jobs posted yet for this resort. Check back soon or{" "}
                  <Link href="/signup" className="text-primary underline">
                    sign up
                  </Link>{" "}
                  for alerts.
                </p>
                <Link
                  href={`/jobs?resort=${encodeURIComponent(resort.name)}`}
                  className="mt-3 inline-block text-sm font-medium text-primary underline decoration-secondary underline-offset-4 hover:decoration-primary"
                >
                  Browse all jobs at {resort.name} &rarr;
                </Link>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {realJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs?resort=${encodeURIComponent(resort.name)}&open=${job.id}`}
                    className="group block rounded-xl border border-accent bg-white p-5 transition-all hover:border-secondary hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-primary group-hover:text-secondary">
                          {job.title}
                        </h3>
                        <p className="mt-1 text-sm text-foreground">
                          {job.business_name}
                          {job.business_verified && (
                            <span className="ml-2 text-xs text-green-600">
                              &#10003; Verified
                            </span>
                          )}
                        </p>
                      </div>
                      {job.pay_amount && (
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">
                            {formatPay(job.pay_amount, job.pay_currency)}
                          </p>
                          <p className="text-xs text-foreground/50">
                            {job.position_type === "full_time"
                              ? "Full Time"
                              : job.position_type === "part_time"
                                ? "Part Time"
                                : "Casual"}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.category && (
                        <span className="rounded-full bg-accent/40 px-2.5 py-0.5 text-xs font-medium text-foreground">
                          {job.category.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      )}
                      {job.accommodation_included && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          Accommodation
                        </span>
                      )}
                      {job.ski_pass_included && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          Ski Pass
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-foreground/50">
                      <span>{job.applications_count} applicant{job.applications_count !== 1 ? "s" : ""}</span>
                      {job.start_date && (
                        <span>
                          Starts{" "}
                          {new Date(job.start_date).toLocaleDateString(
                            "en-GB",
                            { month: "short", year: "numeric" }
                          )}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}

                <Link
                  href={`/jobs?resort=${encodeURIComponent(resort.name)}`}
                  className="flex items-center justify-center gap-2 rounded-xl border border-accent bg-white py-4 text-sm font-medium text-primary transition-colors hover:border-secondary hover:bg-secondary/5"
                >
                  View all jobs at {resort.name}
                  <span>&rarr;</span>
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Right Column — Sidebar */}
        <div className="space-y-5">
          {/* Season Card */}
          {formatSeason() && (
            <div className="rounded-xl border border-accent bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
                Season
              </h3>
              <p className="mt-2 text-lg font-semibold text-primary">
                {formatSeason()}
              </p>
            </div>
          )}

          {/* Climate Card */}
          {hasClimate && (
            <div className="rounded-xl border border-accent bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
                Climate & Snow
              </h3>
              <dl className="mt-3 space-y-3">
                {resort.avg_winter_temp_min_c !== null &&
                  resort.avg_winter_temp_max_c !== null && (
                    <div className="flex justify-between">
                      <dt className="text-sm text-foreground">Winter Temps</dt>
                      <dd className="text-sm font-medium text-primary">
                        {resort.avg_winter_temp_min_c}°C to{" "}
                        {resort.avg_winter_temp_max_c}°C
                      </dd>
                    </div>
                  )}
                {resort.snow_reliability && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-foreground">
                      Snow Reliability
                    </dt>
                    <dd className="text-sm font-medium capitalize text-primary">
                      {resort.snow_reliability}
                    </dd>
                  </div>
                )}
                {resort.artificial_snow_coverage_pct !== null && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-foreground">Snowmaking</dt>
                    <dd className="text-sm font-medium text-primary">
                      {resort.artificial_snow_coverage_pct}% of runs
                    </dd>
                  </div>
                )}
                {resort.snowfall_avg_cm !== null && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-foreground">Avg Snowfall</dt>
                    <dd className="text-sm font-medium text-primary">
                      {resort.snowfall_avg_cm.toLocaleString()} cm/yr
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Location Card */}
          <div className="rounded-xl border border-accent bg-white p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
              Location
            </h3>
            <p className="mt-3 text-sm text-foreground">
              {resort.latitude.toFixed(4)}°{resort.latitude >= 0 ? "N" : "S"},{" "}
              {resort.longitude.toFixed(4)}°{resort.longitude >= 0 ? "E" : "W"}
            </p>
            {resort.nearest_town && (
              <p className="mt-1 text-sm text-foreground/60">
                Nearest town: {resort.nearest_town}
              </p>
            )}
            <div className="mt-3">
              <ResortMap
                pins={[
                  {
                    id: resort.id,
                    lat: resort.latitude,
                    lng: resort.longitude,
                    label: resort.name,
                    sublabel: resort.nearest_town || resort.country,
                  },
                ]}
                height="180px"
                zoom={11}
                singlePin
              />
            </div>
          </div>

          {/* Languages Card */}
          {resort.languages_required && (
            <div className="rounded-xl border border-accent bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">
                Languages
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {resort.languages_required.map((lang) => (
                  <span
                    key={lang}
                    className="rounded-full bg-secondary/15 px-3 py-1 text-sm text-primary"
                  >
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

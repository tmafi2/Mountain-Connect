import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatPay } from "@/lib/utils/format-pay";

interface VenuePageProps {
  params: Promise<{ id: string; venueSlug: string }>;
}

const BASE_URL = "https://www.mountainconnects.com";

export async function generateMetadata({
  params,
}: VenuePageProps): Promise<Metadata> {
  const { id, venueSlug } = await params;
  const supabase = await createClient();
  const [{ data: venue }, { data: business }] = await Promise.all([
    supabase
      .from("business_venues")
      .select("name, description")
      .eq("business_id", id)
      .eq("slug", venueSlug)
      .maybeSingle(),
    supabase
      .from("business_profiles")
      .select("business_name")
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (!venue) return { title: "Venue Not Found" };

  const title = `${venue.name}${business ? ` · ${business.business_name}` : ""} — Seasonal Jobs`;
  const rawDesc =
    venue.description ||
    `Open roles at ${venue.name}${business ? `, part of ${business.business_name}` : ""}. Seasonal ski-resort jobs on Mountain Connects.`;
  const description =
    rawDesc.length > 160 ? rawDesc.slice(0, 157) + "..." : rawDesc;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/business/${id}/${venueSlug}`,
    },
  };
}

export default async function VenuePage({ params }: VenuePageProps) {
  const { id, venueSlug } = await params;
  const supabase = await createClient();

  // Pull venue + business separately — easier on the Supabase type
  // inference than a foreign-table join. Falls back to the business's
  // own logo/cover if the venue hasn't been given its own.
  const [{ data: venue }, { data: business }] = await Promise.all([
    supabase
      .from("business_venues")
      .select(
        "id, name, slug, description, location, logo_url, cover_photo_url, phone, email, website, resort_id, nearby_town_id, is_primary"
      )
      .eq("business_id", id)
      .eq("slug", venueSlug)
      .maybeSingle(),
    supabase
      .from("business_profiles")
      .select(
        "id, business_name, logo_url, cover_photo_url, verification_status, slug, country, description"
      )
      .eq("id", id)
      .maybeSingle(),
  ]);

  if (!venue || !business) notFound();

  const isVerified = business.verification_status === "verified";
  const logo = venue.logo_url || business.logo_url;
  const cover = venue.cover_photo_url || business.cover_photo_url;

  // Resort + town display names + active jobs in parallel — three
  // independent queries that previously ran sequentially.
  const [resortRes, townRes, jobsRes] = await Promise.all([
    venue.resort_id
      ? supabase
          .from("resorts")
          .select("name")
          .eq("id", venue.resort_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    venue.nearby_town_id
      ? supabase
          .from("nearby_towns")
          .select("name")
          .eq("id", venue.nearby_town_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("job_posts")
      .select(
        "id, title, category, position_type, pay_amount, pay_currency, accommodation_included, ski_pass_included, meal_perks, status, created_at, resorts(name)"
      )
      .eq("business_id", id)
      .eq("venue_id", venue.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
  ]);

  const resortName = resortRes.data?.name ?? null;
  const townName = townRes.data?.name ?? null;
  const activeJobs = jobsRes.data ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <nav className="mb-6 text-xs text-foreground/50">
        <Link href="/employers" className="hover:text-secondary">Employers</Link>
        <span className="mx-1.5">/</span>
        <Link
          href={`/business/${business.id}`}
          className="hover:text-secondary"
        >
          {business.business_name}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground/80">{venue.name}</span>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-white shadow-sm">
        <div
          className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10 sm:h-56"
          style={
            cover
              ? { backgroundImage: `url(${cover})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
        </div>
        <div className="relative -mt-12 flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
              {logo ? (
                <img src={logo} alt={venue.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary/10 text-2xl">
                  🏔️
                </div>
              )}
            </div>
            <div className="pb-1 min-w-0">
              <h1 className="truncate text-2xl font-extrabold text-primary sm:text-3xl">
                {venue.name}
              </h1>
              <p className="mt-1 truncate text-sm text-foreground/60">
                A venue of{" "}
                <Link
                  href={`/business/${business.id}`}
                  className="font-semibold text-secondary hover:underline"
                >
                  {business.business_name}
                </Link>
                {isVerified && (
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                    Verified
                  </span>
                )}
              </p>
              <p className="mt-1 truncate text-xs text-foreground/50">
                {[venue.location, townName, resortName, business.country]
                  .filter(Boolean)
                  .join(" · ") || "Location TBA"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-accent/40 bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/10"
              >
                Website ↗
              </a>
            )}
            {venue.phone && (
              <a
                href={`tel:${venue.phone}`}
                className="rounded-lg border border-accent/40 bg-white px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent/10"
              >
                {venue.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {(venue.description || business.description) && (
        <section className="mt-6 rounded-2xl border border-accent/30 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-secondary">
            About this venue
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
            {venue.description || business.description}
          </p>
        </section>
      )}

      {/* Jobs */}
      <section className="mt-6 rounded-2xl border border-accent/30 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-secondary">
            Open roles
          </h2>
          <span className="rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            {activeJobs.length} {activeJobs.length === 1 ? "role" : "roles"}
          </span>
        </div>
        {activeJobs.length === 0 ? (
          <p className="mt-4 text-sm text-foreground/50">
            No active listings at this venue right now. Follow{" "}
            <Link
              href={`/business/${business.id}`}
              className="text-secondary hover:underline"
            >
              {business.business_name}
            </Link>{" "}
            to be alerted when new roles go up.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {activeJobs.map((j) => {
              const pay = formatPay(j.pay_amount, j.pay_currency);
              return (
                <li
                  key={j.id}
                  className="rounded-xl border border-accent/30 bg-white p-4 transition hover:border-secondary/40"
                >
                  <Link
                    href={`/jobs?open=${j.id}`}
                    className="flex flex-col gap-1"
                  >
                    <p className="text-base font-bold text-primary">{j.title}</p>
                    <p className="text-xs text-foreground/60">
                      {[j.category, j.position_type?.replace("_", " "), pay]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                      {j.accommodation_included && (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                          🏠 Housing
                        </span>
                      )}
                      {j.ski_pass_included && (
                        <span className="rounded-md bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
                          🎿 Ski pass
                        </span>
                      )}
                      {j.meal_perks && (
                        <span className="rounded-md bg-orange-50 px-2 py-0.5 font-semibold text-orange-700">
                          🍽️ Meals
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

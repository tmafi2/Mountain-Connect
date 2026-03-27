import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface BusinessPageProps {
  params: Promise<{ id: string }>;
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

export default async function PublicBusinessPage({ params }: BusinessPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch business profile
  const { data: business } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!business) {
    notFound();
  }

  const isVerified = business.verification_status === "verified";

  // Get linked resorts
  const { data: bizResorts } = await supabase
    .from("business_resorts")
    .select("resort_id")
    .eq("business_id", id);

  let resortNames: string[] = [];
  if (bizResorts && bizResorts.length > 0) {
    const { data: resorts } = await supabase
      .from("resorts")
      .select("name, legacy_id")
      .in("id", bizResorts.map((br) => br.resort_id));
    resortNames = resorts?.map((r) => r.name) || [];
  }

  // Also check direct resort_id on the profile
  if (business.resort_id && !resortNames.length) {
    const { data: resort } = await supabase
      .from("resorts")
      .select("name")
      .eq("id", business.resort_id)
      .single();
    if (resort) resortNames = [resort.name];
  }

  // Get active job listings
  const { data: jobs } = await supabase
    .from("job_posts")
    .select("id, title, category, position_type, pay_amount, accommodation_included, ski_pass_included, start_date, status")
    .eq("business_id", id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(20);

  // Get business photos
  const { data: photos } = await supabase
    .from("business_photos")
    .select("id, url, caption")
    .eq("business_id", id)
    .order("created_at", { ascending: false })
    .limit(8);

  // Parse perks and social links
  const perks: string[] = Array.isArray(business.standard_perks) ? business.standard_perks : [];
  const socialLinks = business.social_links as Record<string, string> | null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Logo */}
        {business.logo_url ? (
          <img
            src={business.logo_url}
            alt={business.business_name}
            className="h-20 w-20 rounded-2xl border border-accent object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
            {business.business_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-primary">{business.business_name}</h1>
            {isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verified Business
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/30 px-3 py-1 text-xs font-medium text-foreground/50">
                Unverified
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-foreground/60">
            {business.location && business.country && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {business.location}, {business.country}
              </span>
            )}
            {resortNames.length > 0 && (
              <span className="flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4" />
                </svg>
                {resortNames.join(", ")}
              </span>
            )}
          </div>

          {/* Industries */}
          {Array.isArray(business.industries) && business.industries.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {business.industries.map((ind: string) => (
                <span key={ind} className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                  {INDUSTRY_LABELS[ind] || ind.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
              ))}
            </div>
          )}

          {/* Links */}
          <div className="mt-4 flex flex-wrap gap-3">
            {business.website && (
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/20 hover:text-primary"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Website
              </a>
            )}
            {socialLinks?.instagram && (
              <a href={`https://instagram.com/${socialLinks.instagram.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-accent px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/20">
                Instagram
              </a>
            )}
            {socialLinks?.facebook && (
              <a href={`https://facebook.com/${socialLinks.facebook}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-accent px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/20">
                Facebook
              </a>
            )}
            {socialLinks?.linkedin && (
              <a href={`https://linkedin.com/company/${socialLinks.linkedin}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-accent px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent/20">
                LinkedIn
              </a>
            )}
          </div>
        </div>
      </div>

      {/* About */}
      {business.description && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-primary">About</h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground/70">{business.description}</p>
        </section>
      )}

      {/* Perks */}
      {perks.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-primary">Employee Perks</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {perks.map((perk) => (
              <span key={perk} className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                {perk}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Photos */}
      {photos && photos.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-primary">Photos</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo) => (
              <div key={photo.id} className="overflow-hidden rounded-xl border border-accent">
                <img src={photo.url} alt={photo.caption || business.business_name} className="h-32 w-full object-cover" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Open Positions */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">
            Open Positions {jobs && jobs.length > 0 && <span className="ml-2 text-sm font-normal text-foreground/50">({jobs.length})</span>}
          </h2>
        </div>

        {!jobs || jobs.length === 0 ? (
          <div className="mt-4 rounded-xl border border-accent bg-accent/5 p-6 text-center">
            <p className="text-sm text-foreground/50">No open positions at the moment.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs?open=${job.id}`}
                className="group block rounded-xl border border-accent bg-white p-5 transition-all hover:border-secondary hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-primary group-hover:text-secondary">
                      {job.title}
                    </h3>
                    {job.category && (
                      <p className="mt-1 text-xs text-foreground/50">
                        {job.category.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                      </p>
                    )}
                  </div>
                  {job.pay_amount && (
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">{job.pay_amount}</p>
                      <p className="text-xs text-foreground/50">
                        {job.position_type === "full_time" ? "Full Time" : job.position_type === "part_time" ? "Part Time" : "Casual"}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {job.accommodation_included && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Accommodation</span>
                  )}
                  {job.ski_pass_included && (
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">Ski Pass</span>
                  )}
                  {job.start_date && (
                    <span className="text-xs text-foreground/40">
                      Starts {new Date(job.start_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Contact */}
      {(business.email || business.phone) && (
        <section className="mt-10 rounded-xl border border-accent bg-accent/5 p-6">
          <h2 className="text-lg font-semibold text-primary">Contact</h2>
          <div className="mt-3 space-y-2 text-sm text-foreground/70">
            {business.email && (
              <p className="flex items-center gap-2">
                <svg className="h-4 w-4 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <a href={`mailto:${business.email}`} className="text-primary hover:underline">{business.email}</a>
              </p>
            )}
            {business.phone && (
              <p className="flex items-center gap-2">
                <svg className="h-4 w-4 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                {business.phone}
              </p>
            )}
            {business.address && (
              <p className="flex items-center gap-2">
                <svg className="h-4 w-4 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {business.address}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

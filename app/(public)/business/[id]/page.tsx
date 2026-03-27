import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatPay } from "@/lib/utils/format-pay";

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

const PERK_ICONS: Record<string, string> = {
  "Staff accommodation": "🏠",
  "Ski pass": "🎿",
  "Meals included": "🍽️",
  "Transport provided": "🚐",
  "Uniform provided": "👔",
  "Training provided": "📚",
  "Staff discounts": "💰",
  "Flexible hours": "⏰",
  "Tips": "💵",
  "Season bonus": "🎁",
  "Gym access": "💪",
  "Social events": "🎉",
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

  // Get linked resorts with full details
  const { data: bizResorts } = await supabase
    .from("business_resorts")
    .select("resort_id")
    .eq("business_id", id);

  let resortData: { id: string; name: string }[] = [];
  if (bizResorts && bizResorts.length > 0) {
    const { data: resorts } = await supabase
      .from("resorts")
      .select("id, name")
      .in("id", bizResorts.map((br) => br.resort_id));
    resortData = resorts || [];
  }

  // Also check direct resort_id on the profile
  if (business.resort_id && resortData.length === 0) {
    const { data: resort } = await supabase
      .from("resorts")
      .select("id, name")
      .eq("id", business.resort_id)
      .single();
    if (resort) resortData = [resort];
  }

  // Get active job listings
  const { data: jobs } = await supabase
    .from("job_posts")
    .select("id, title, category, position_type, pay_amount, pay_currency, accommodation_included, ski_pass_included, meals_included, start_date, end_date, status, description")
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
    .limit(12);

  // Parse perks and social links
  const perks: string[] = Array.isArray(business.standard_perks) ? business.standard_perks : [];
  const socialLinks = business.social_links as Record<string, string> | null;
  const industries: string[] = Array.isArray(business.industries) ? business.industries : [];

  // Count details to show in quick stats
  const activeJobCount = jobs?.length || 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

      {/* ═══ HERO HEADER ═══════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-white shadow-sm">
        {/* Decorative gradient bar */}
        <div className="h-28 bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#1a3a5c] relative overflow-hidden sm:h-36">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-secondary/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/4 h-24 w-48 rounded-full bg-secondary/8 blur-2xl" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        </div>

        <div className="relative px-6 pb-6 sm:px-8 sm:pb-8">
          {/* Logo — overlapping the gradient */}
          <div className="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.business_name}
                className="h-24 w-24 rounded-2xl border-4 border-white bg-white object-cover shadow-lg sm:h-28 sm:w-28"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white bg-primary/10 text-3xl font-bold text-primary shadow-lg sm:h-28 sm:w-28">
                {business.business_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-primary sm:text-3xl">{business.business_name}</h1>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent/30 px-3 py-1 text-xs font-medium text-foreground/50">
                    Unverified
                  </span>
                )}
              </div>

              {/* Location & Resort tags */}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/60">
                {(business.location || business.country) && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 shrink-0 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    {[business.location, business.country].filter(Boolean).join(", ")}
                  </span>
                )}
                {business.year_established && (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3.5 w-3.5 shrink-0 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    Est. {business.year_established}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Industries */}
          {industries.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {industries.map((ind: string) => (
                <span key={ind} className="rounded-full bg-secondary/10 px-3 py-1 text-xs font-medium text-secondary">
                  {INDUSTRY_LABELS[ind] || ind.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </span>
              ))}
            </div>
          )}

          {/* Resorts */}
          {resortData.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {resortData.map((r) => (
                <Link
                  key={r.id}
                  href={`/resorts/${r.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4" />
                  </svg>
                  {r.name}
                </Link>
              ))}
            </div>
          )}

          {/* Quick links row — Website + Socials */}
          <div className="mt-4 flex flex-wrap gap-2.5">
            {business.website && (
              <a
                href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-white px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:border-secondary/50 hover:bg-secondary/5 hover:text-secondary"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
                Website
              </a>
            )}
            {socialLinks?.instagram && (
              <a
                href={socialLinks.instagram.startsWith("http") ? socialLinks.instagram : `https://instagram.com/${socialLinks.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-white px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:border-pink-300 hover:bg-pink-50 hover:text-pink-600"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
                Instagram
              </a>
            )}
            {socialLinks?.facebook && (
              <a
                href={socialLinks.facebook.startsWith("http") ? socialLinks.facebook : `https://facebook.com/${socialLinks.facebook}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-white px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </a>
            )}
            {socialLinks?.linkedin && (
              <a
                href={socialLinks.linkedin.startsWith("http") ? socialLinks.linkedin : `https://linkedin.com/company/${socialLinks.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-white px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </a>
            )}
            {socialLinks?.twitter && (
              <a
                href={socialLinks.twitter.startsWith("http") ? socialLinks.twitter : `https://x.com/${socialLinks.twitter.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-white px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:border-gray-400 hover:bg-gray-50 hover:text-gray-800"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                X / Twitter
              </a>
            )}
            {socialLinks?.tiktok && (
              <a
                href={socialLinks.tiktok.startsWith("http") ? socialLinks.tiktok : `https://tiktok.com/@${socialLinks.tiktok.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-white px-3.5 py-2 text-xs font-medium text-foreground transition-all hover:border-gray-400 hover:bg-gray-50 hover:text-gray-800"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                </svg>
                TikTok
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ═══ CONTENT GRID ════════════════════════════════ */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">

        {/* Main column */}
        <div className="lg:col-span-2 space-y-8">

          {/* About */}
          {business.description && (
            <section className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                <svg className="h-5 w-5 text-secondary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
                About
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70 whitespace-pre-line">{business.description}</p>
            </section>
          )}

          {/* Employee Perks */}
          {perks.length > 0 && (
            <section className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                <svg className="h-5 w-5 text-secondary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                Employee Perks
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {perks.map((perk) => (
                  <div key={perk} className="flex items-center gap-2.5 rounded-xl bg-emerald-50/60 px-4 py-2.5">
                    <span className="text-base">{PERK_ICONS[perk] || "✨"}</span>
                    <span className="text-sm font-medium text-emerald-800">{perk}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Photos */}
          {photos && photos.length > 0 && (
            <section className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                <svg className="h-5 w-5 text-secondary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z" />
                </svg>
                Photos
                <span className="text-xs font-normal text-foreground/40">({photos.length})</span>
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-accent/30">
                    <img
                      src={photo.url}
                      alt={photo.caption || business.business_name}
                      className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {photo.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-6">
                        <p className="text-[10px] font-medium text-white/90 line-clamp-2">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Open Positions */}
          <section className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                <svg className="h-5 w-5 text-secondary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                </svg>
                Open Positions
                {activeJobCount > 0 && (
                  <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    {activeJobCount}
                  </span>
                )}
              </h2>
            </div>

            {!jobs || jobs.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-accent/50 bg-accent/5 p-8 text-center">
                <svg className="mx-auto h-10 w-10 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <p className="mt-3 text-sm font-medium text-foreground/50">No open positions at the moment</p>
                <p className="mt-1 text-xs text-foreground/35">Check back later for new opportunities</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="group block rounded-xl border border-accent/30 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-secondary/50 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-primary group-hover:text-secondary transition-colors">
                          {job.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground/50">
                          {job.category && (
                            <span>
                              {job.category.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </span>
                          )}
                          {job.position_type && (
                            <>
                              <span className="h-3 w-px bg-foreground/20" />
                              <span>
                                {job.position_type === "full_time" ? "Full Time" : job.position_type === "part_time" ? "Part Time" : "Casual"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      {job.pay_amount && (
                        <div className="text-right">
                          <p className="text-sm font-bold text-primary">{formatPay(job.pay_amount, job.pay_currency)}</p>
                        </div>
                      )}
                    </div>

                    {/* Job perks + dates */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {job.accommodation_included && (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">🏠 Accommodation</span>
                      )}
                      {job.ski_pass_included && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">🎿 Ski Pass</span>
                      )}
                      {job.meals_included && (
                        <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-orange-700">🍽️ Meals</span>
                      )}
                      {job.start_date && (
                        <span className="text-[10px] text-foreground/40">
                          {new Date(job.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          {job.end_date && ` – ${new Date(job.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ═══ SIDEBAR ═══════════════════════════════════ */}
        <div className="space-y-6">

          {/* Quick Info Card */}
          <div className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/40">Quick Info</h3>
            <div className="mt-4 space-y-4">
              {(business.location || business.country) && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                    <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground/40">Location</p>
                    <p className="text-sm font-medium text-primary">{[business.location, business.country].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
              )}

              {business.address && business.address !== business.location && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                    <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground/40">Address</p>
                    <p className="text-sm font-medium text-primary">{business.address}</p>
                  </div>
                </div>
              )}

              {business.year_established && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                    <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground/40">Established</p>
                    <p className="text-sm font-medium text-primary">{business.year_established}</p>
                  </div>
                </div>
              )}

              {industries.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                    <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground/40">Industry</p>
                    <p className="text-sm font-medium text-primary">
                      {industries.map((ind: string) => INDUSTRY_LABELS[ind] || ind.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())).join(", ")}
                    </p>
                  </div>
                </div>
              )}

              {resortData.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                    <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground/40">Ski Resort{resortData.length !== 1 ? "s" : ""}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {resortData.map((r) => (
                        <Link
                          key={r.id}
                          href={`/resorts/${r.id}`}
                          className="text-sm font-medium text-secondary hover:underline"
                        >
                          {r.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5">
                  <svg className="h-4 w-4 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground/40">Open Positions</p>
                  <p className="text-sm font-medium text-primary">
                    {activeJobCount > 0 ? (
                      <span className="text-green-600">{activeJobCount} active listing{activeJobCount !== 1 ? "s" : ""}</span>
                    ) : (
                      <span className="text-foreground/50">None at the moment</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Card */}
          {(business.email || business.phone || business.address || business.website) && (
            <div className="rounded-2xl border border-accent/30 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/40">Contact</h3>
              <div className="mt-4 space-y-3">
                {business.email && (
                  <a
                    href={`mailto:${business.email}`}
                    className="flex items-center gap-3 rounded-xl bg-accent/10 px-4 py-3 text-sm transition-colors hover:bg-accent/20"
                  >
                    <svg className="h-4 w-4 shrink-0 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    <span className="text-primary font-medium truncate">{business.email}</span>
                  </a>
                )}
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="flex items-center gap-3 rounded-xl bg-accent/10 px-4 py-3 text-sm transition-colors hover:bg-accent/20"
                  >
                    <svg className="h-4 w-4 shrink-0 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    <span className="text-primary font-medium">{business.phone}</span>
                  </a>
                )}
                {business.address && (
                  <div className="flex items-start gap-3 rounded-xl bg-accent/10 px-4 py-3 text-sm">
                    <svg className="h-4 w-4 shrink-0 text-foreground/40 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span className="text-primary font-medium">{business.address}</span>
                  </div>
                )}
                {business.website && (
                  <a
                    href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-xl bg-accent/10 px-4 py-3 text-sm transition-colors hover:bg-accent/20"
                  >
                    <svg className="h-4 w-4 shrink-0 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    <span className="text-primary font-medium truncate">{business.website.replace(/^https?:\/\//, "")}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Browse Jobs CTA */}
          <div className="rounded-2xl border border-secondary/20 bg-gradient-to-br from-secondary/5 to-secondary/10 p-6 text-center">
            <svg className="mx-auto h-8 w-8 text-secondary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="mt-2 text-sm font-semibold text-primary">Looking for more jobs?</p>
            <p className="mt-1 text-xs text-foreground/50">Browse all open positions across resorts</p>
            <Link
              href="/jobs"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-secondary-light hover:shadow-lg hover:shadow-secondary/20"
            >
              Browse All Jobs
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

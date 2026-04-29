import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatPay } from "@/lib/utils/format-pay";

interface BusinessPageProps {
  params: Promise<{ id: string }>;
}

const BASE_URL = "https://www.mountainconnects.com";

export async function generateMetadata({ params }: BusinessPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("business_profiles")
    .select("business_name, description, logo_url, location, verification_status")
    .eq("id", id)
    .single();

  if (!business) return { title: "Business Not Found" };

  const title = `${business.business_name} — Seasonal Jobs & Careers`;
  const rawDesc = business.description
    ? business.description
    : `View open roles, perks, and reviews at ${business.business_name}${business.location ? ` in ${business.location}` : ""}. Seasonal ski resort jobs on Mountain Connects.`;
  const description = rawDesc.length > 160 ? rawDesc.slice(0, 157) + "..." : rawDesc;

  const ogImage = business.logo_url || `${BASE_URL}/opengraph-image.jpg`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/business/${id}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/business/${id}`,
      siteName: "Mountain Connects",
      type: "profile",
      images: [{ url: ogImage, alt: business.business_name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
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

  // Get nearby town name if business operates in a town
  let nearbyTownName: string | null = null;
  if (business.operates_in_town && business.nearby_town_id) {
    const { data: town } = await supabase
      .from("nearby_towns")
      .select("name")
      .eq("id", business.nearby_town_id)
      .single();
    if (town) nearbyTownName = town.name;
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
    .select("id, title, category, position_type, pay_amount, pay_currency, accommodation_included, ski_pass_included, meal_perks, start_date, end_date, status, description, nearby_towns(name)")
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

  // Get business reviews from workers
  const { data: reviews } = await supabase
    .from("business_reviews")
    .select("id, rating, title, review_text, season, position, would_recommend, created_at, worker_profiles!worker_id(users!user_id(full_name))")
    .eq("business_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Calculate review stats
  const reviewCount = reviews?.length || 0;
  const avgRating = reviewCount > 0
    ? reviews!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : 0;
  const recommendPct = reviewCount > 0
    ? Math.round((reviews!.filter((r) => r.would_recommend).length / reviewCount) * 100)
    : 0;

  // Parse perks and social links
  const perks: string[] = Array.isArray(business.standard_perks) ? business.standard_perks : [];
  const socialLinks = business.social_links as Record<string, string> | null;
  const industries: string[] = Array.isArray(business.industries) ? business.industries : [];

  // Count details to show in quick stats
  const activeJobCount = jobs?.length || 0;

  // Build the highlights row — small coloured tiles right under the hero.
  // We cap at 4 so the row stays tight; the order below is the priority order.
  const perksLower = perks.map((p) => p.toLowerCase());
  const hasPerk = (...keywords: string[]) => perksLower.some((p) => keywords.some((k) => p.includes(k)));
  const highlights: { icon: string; value: string; label: string; tone: "green" | "amber" | "emerald" | "blue" | "orange" | "cyan" | "purple" }[] = [];
  if (activeJobCount > 0) {
    highlights.push({
      icon: "💼",
      value: `${activeJobCount} ${activeJobCount === 1 ? "role" : "roles"}`,
      label: "Hiring now",
      tone: "green",
    });
  }
  if (reviewCount > 0) {
    highlights.push({
      icon: "⭐",
      value: avgRating.toFixed(1),
      label: `${reviewCount} review${reviewCount !== 1 ? "s" : ""}`,
      tone: "amber",
    });
  }
  if (hasPerk("housing", "accommodation")) {
    highlights.push({ icon: "🏠", value: "Staff housing", label: "Included", tone: "emerald" });
  }
  if (hasPerk("ski pass", "snow pass", "lift pass")) {
    highlights.push({ icon: "🎿", value: "Ski pass", label: "Included", tone: "blue" });
  }
  if (highlights.length < 4 && hasPerk("meal")) {
    highlights.push({ icon: "🍽️", value: "Meals", label: "Included", tone: "orange" });
  }
  if (highlights.length < 4 && business.year_established) {
    const years = new Date().getFullYear() - Number(business.year_established);
    if (years >= 1) {
      highlights.push({
        icon: "🏔️",
        value: `${years}+ yrs`,
        label: "In business",
        tone: "cyan",
      });
    }
  }
  const visibleHighlights = highlights.slice(0, 4);

  const HIGHLIGHT_TONES: Record<string, string> = {
    green: "border-green-200/70 bg-gradient-to-br from-green-50 to-green-100/30 text-green-900",
    amber: "border-amber-200/70 bg-gradient-to-br from-amber-50 to-amber-100/40 text-amber-900",
    emerald: "border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-emerald-100/40 text-emerald-900",
    blue: "border-blue-200/70 bg-gradient-to-br from-blue-50 to-blue-100/40 text-blue-900",
    orange: "border-orange-200/70 bg-gradient-to-br from-orange-50 to-orange-100/40 text-orange-900",
    cyan: "border-cyan-200/70 bg-gradient-to-br from-cyan-50 to-cyan-100/40 text-cyan-900",
    purple: "border-purple-200/70 bg-gradient-to-br from-purple-50 to-purple-100/40 text-purple-900",
  };

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: business.business_name,
    url: `${BASE_URL}/business/${id}`,
    ...(business.logo_url && { logo: business.logo_url }),
    ...(business.description && { description: business.description }),
    ...((business.operates_in_town && nearbyTownName) || business.location) && {
      address: {
        "@type": "PostalAddress",
        addressLocality:
          (business.operates_in_town && nearbyTownName) || business.location,
        ...(business.country && { addressCountry: business.country }),
      },
    },
    ...(socialLinks && Object.values(socialLinks).filter(Boolean).length > 0 && {
      sameAs: Object.values(socialLinks).filter(Boolean),
    }),
  };

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
    />
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

      {/* ═══ HERO HEADER ═══════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-accent/30 bg-white shadow-sm">
        {/* Cover photo / banner — purely visual, no text overlay */}
        <div className="relative h-44 overflow-hidden sm:h-64">
          {business.cover_photo_url ? (
            <img
              src={business.cover_photo_url}
              alt={`${business.business_name} cover`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary via-primary to-secondary">
              {/* Subtle layered shapes for visual interest when no cover photo */}
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-highlight/40 via-transparent to-transparent" />
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-highlight/60 via-transparent to-transparent" />
            </div>
          )}
          {/* Soft fade at the bottom to ease the eye into the white header below */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/30 to-transparent" />
        </div>

        <div className="relative px-6 pb-6 sm:px-8 sm:pb-8">
          {/* Logo — still overlaps the cover, but the name now lives below on white */}
          <div className="-mt-12 flex items-end gap-5 sm:-mt-14">
            {business.logo_url ? (
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg sm:h-28 sm:w-28">
                <Image
                  src={business.logo_url}
                  alt={business.business_name}
                  width={224}
                  height={224}
                  quality={95}
                  priority
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-primary to-secondary text-3xl font-bold text-white shadow-lg sm:h-28 sm:w-28">
                {business.business_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Business name + tier/verification badges */}
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
              {business.business_name}
            </h1>
            {(business as Record<string, unknown>).tier === "enterprise" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                ⭐ Enterprise Partner
              </span>
            )}
            {(business as Record<string, unknown>).tier === "premium" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                👑 Premium Employer
              </span>
            )}
            {(business as Record<string, unknown>).tier === "standard" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                ✓ Verified Employer
              </span>
            )}
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

          {/* Location · Established — meta line */}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground/60">
            {(business.operates_in_town && nearbyTownName) || business.location || business.country ? (
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4 shrink-0 text-highlight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="font-medium text-foreground/80">
                  {business.operates_in_town && nearbyTownName
                    ? [nearbyTownName, business.country].filter(Boolean).join(", ")
                    : [business.location, business.country].filter(Boolean).join(", ")}
                </span>
              </span>
            ) : null}
            {business.year_established && (
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4 shrink-0 text-highlight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <span className="font-medium text-foreground/80">Est. {business.year_established}</span>
              </span>
            )}
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-highlight/40 bg-highlight/5 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-highlight/15"
                >
                  <svg className="h-3 w-3 text-highlight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M3 10h18M3 7l9-4 9 4" />
                  </svg>
                  {r.name}
                </Link>
              ))}
            </div>
          )}

          {/* Quick links row — Website + Socials */}
          <div className="mt-5 flex flex-wrap gap-2.5">
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

      {/* Unverified business notice — shown for businesses that haven't been
           verified yet. Their profile and jobs are public but we flag the
           status so workers know the business isn't yet vetted by our team. */}
      {!isVerified && (
        <div className="mt-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3.5">
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">Not yet verified</p>
            <p className="mt-0.5 text-sm text-amber-800">
              This business hasn&apos;t been verified by the Mountain Connects team yet. Their listings are public but haven&apos;t gone through our verification process. Verified businesses show a green badge and have been manually reviewed.
            </p>
          </div>
        </div>
      )}

      {/* Highlights row — small coloured tiles giving the page a punchy
           anchor moment of "what does this business offer?" at a glance */}
      {visibleHighlights.length > 0 && (
        <div className={`mt-6 grid gap-3 ${
          visibleHighlights.length === 1 ? "grid-cols-1" :
          visibleHighlights.length === 2 ? "grid-cols-2" :
          visibleHighlights.length === 3 ? "grid-cols-2 sm:grid-cols-3" :
          "grid-cols-2 sm:grid-cols-4"
        }`}>
          {visibleHighlights.map((h, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${HIGHLIGHT_TONES[h.tone]}`}
            >
              <span className="text-2xl leading-none">{h.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight">{h.value}</p>
                <p className="text-[11px] font-medium opacity-70">{h.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ CONTENT GRID ════════════════════════════════ */}
      <div className="mt-10 grid gap-8 lg:grid-cols-3">

        {/* Main column */}
        <div className="lg:col-span-2 space-y-10">

          {/* About — editorial treatment, no card chrome */}
          {business.description && (
            <section>
              <div className="flex items-center gap-3">
                <span className="h-6 w-1 rounded-full bg-highlight" aria-hidden />
                <h2 className="text-xl font-bold tracking-tight text-primary">About</h2>
              </div>
              <p className="mt-4 text-base leading-relaxed text-foreground/75 whitespace-pre-line">
                {business.description}
              </p>
            </section>
          )}

          {/* Open Positions — anchor section, tinted background to draw the eye */}
          <section className="relative overflow-hidden rounded-2xl border border-secondary/15 bg-gradient-to-br from-secondary/[0.04] via-white to-highlight/[0.04] p-6 shadow-sm sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-6 w-1 rounded-full bg-secondary" aria-hidden />
                <h2 className="text-xl font-bold tracking-tight text-primary">Open Positions</h2>
                {activeJobCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                    </span>
                    {activeJobCount} active {activeJobCount === 1 ? "role" : "roles"}
                  </span>
                )}
              </div>
            </div>

            {!jobs || jobs.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-accent/50 bg-white/70 p-8 text-center">
                <svg className="mx-auto h-10 w-10 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                <p className="mt-3 text-sm font-medium text-foreground/50">No open positions at the moment</p>
                <p className="mt-1 text-xs text-foreground/35">Check back later for new opportunities</p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="group block rounded-xl border border-accent/40 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-secondary/60 hover:shadow-md"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-primary group-hover:text-secondary transition-colors">
                          {job.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground/55">
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
                          {(job as any).nearby_towns?.name && (
                            <>
                              <span className="h-3 w-px bg-foreground/20" />
                              <span>Based in {(job as any).nearby_towns.name}</span>
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
                    {(job.accommodation_included || job.ski_pass_included || job.meal_perks || job.start_date) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {job.accommodation_included && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">🏠 Accommodation</span>
                        )}
                        {job.ski_pass_included && (
                          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">🎿 Ski Pass</span>
                        )}
                        {job.meal_perks && (
                          <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold text-orange-700">🍽️ Meals</span>
                        )}
                        {job.start_date && (
                          <span className="text-[10px] text-foreground/40">
                            {new Date(job.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            {job.end_date && ` – ${new Date(job.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Employee Perks — soft emerald-tinted panel breaks up white monotony */}
          {perks.length > 0 && (
            <section className="rounded-2xl border border-emerald-200/40 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/30 p-6 shadow-sm sm:p-7">
              <div className="flex items-center gap-3">
                <span className="h-6 w-1 rounded-full bg-emerald-500" aria-hidden />
                <h2 className="text-xl font-bold tracking-tight text-primary">Employee Perks</h2>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {perks.map((perk) => (
                  <span
                    key={perk}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-white px-3.5 py-1.5 text-sm font-medium text-emerald-800"
                  >
                    <span className="text-base leading-none">{PERK_ICONS[perk] || "✨"}</span>
                    {perk}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Photos — first photo featured, rest as a tighter grid */}
          {photos && photos.length > 0 && (
            <section>
              <div className="flex items-center gap-3">
                <span className="h-6 w-1 rounded-full bg-highlight" aria-hidden />
                <h2 className="text-xl font-bold tracking-tight text-primary">Photos</h2>
                <span className="text-sm font-normal text-foreground/40">({photos.length})</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className={`group relative overflow-hidden rounded-xl border border-accent/30 ${
                      idx === 0 ? "col-span-2 row-span-2 sm:col-span-2 sm:row-span-2" : ""
                    }`}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || business.business_name}
                      className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                        idx === 0 ? "h-full min-h-[16rem]" : "h-32"
                      }`}
                    />
                    {photo.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8">
                        <p className="text-[11px] font-medium text-white/95 line-clamp-2">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Reviews — soft amber-tinted panel when there are reviews */}
          <section className={reviewCount > 0
            ? "rounded-2xl border border-amber-200/40 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/30 p-6 shadow-sm sm:p-7"
            : ""}>
            <div className="flex items-center gap-3">
              <span className="h-6 w-1 rounded-full bg-amber-400" aria-hidden />
              <h2 className="text-xl font-bold tracking-tight text-primary">Worker Reviews</h2>
              {reviewCount > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {reviewCount}
                </span>
              )}
            </div>

            {reviewCount === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-accent/50 bg-accent/5 p-8 text-center">
                <svg className="mx-auto h-10 w-10 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                <p className="mt-3 text-sm font-medium text-foreground/50">No reviews yet</p>
                <p className="mt-1 text-xs text-foreground/35">Workers who have worked here can leave a review</p>
              </div>
            ) : (
              <>
                {/* Review Summary */}
                <div className="mt-4 flex items-center gap-6 rounded-xl bg-amber-50/60 p-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{avgRating.toFixed(1)}</p>
                    <div className="mt-1 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`h-4 w-4 ${star <= Math.round(avgRating) ? "text-amber-400" : "text-gray-200"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-foreground/50">{reviewCount} review{reviewCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="h-12 w-px bg-amber-200" />
                  <div>
                    <p className="text-sm font-semibold text-primary">{recommendPct}% recommend</p>
                    <p className="text-xs text-foreground/50">of workers would work here again</p>
                  </div>
                </div>

                {/* Individual Reviews */}
                <div className="mt-4 space-y-4">
                  {reviews!.map((review) => {
                    const reviewerName = (review.worker_profiles as unknown as { users: { full_name: string } | null })?.users?.full_name || "Anonymous Worker";
                    return (
                      <div key={review.id} className="rounded-xl border border-accent/20 bg-white p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <svg
                                    key={star}
                                    className={`h-3.5 w-3.5 ${star <= review.rating ? "text-amber-400" : "text-gray-200"}`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                              </div>
                              {review.title && (
                                <span className="text-sm font-semibold text-primary">{review.title}</span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-xs text-foreground/40">
                              <span>{reviewerName}</span>
                              {review.position && (
                                <>
                                  <span>&middot;</span>
                                  <span>{review.position}</span>
                                </>
                              )}
                              {review.season && (
                                <>
                                  <span>&middot;</span>
                                  <span>{review.season}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {review.would_recommend && (
                            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                              Recommends
                            </span>
                          )}
                        </div>
                        {review.review_text && (
                          <p className="mt-3 text-sm leading-relaxed text-foreground/70">{review.review_text}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        </div>

        {/* ═══ SIDEBAR ═══════════════════════════════════ */}
        <div className="space-y-6">

          {/* Rating snapshot — only shown when there are reviews */}
          {reviewCount > 0 && (
            <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold leading-none text-primary">{avgRating.toFixed(1)}</p>
                  <div className="mt-1.5 flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`h-3.5 w-3.5 ${star <= Math.round(avgRating) ? "text-amber-400" : "text-amber-100"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <div className="min-w-0 flex-1 border-l border-amber-200/80 pl-4">
                  <p className="text-sm font-semibold text-primary">{recommendPct}% recommend</p>
                  <p className="mt-0.5 text-xs text-foreground/55">
                    based on {reviewCount} worker review{reviewCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contact Card */}
          {(business.email || business.phone || business.address || business.website) && (
            <div className="rounded-2xl border border-accent/30 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="h-5 w-1 rounded-full bg-secondary" aria-hidden />
                <h3 className="text-base font-bold tracking-tight text-primary">Get in touch</h3>
              </div>
              <div className="mt-4 space-y-2">
                {business.email && (
                  <a
                    href={`mailto:${business.email}`}
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-secondary/5"
                  >
                    <svg className="h-4 w-4 shrink-0 text-highlight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    <span className="truncate font-medium text-primary group-hover:text-secondary">{business.email}</span>
                  </a>
                )}
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-secondary/5"
                  >
                    <svg className="h-4 w-4 shrink-0 text-highlight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                    <span className="font-medium text-primary group-hover:text-secondary">{business.phone}</span>
                  </a>
                )}
                {business.website && (
                  <a
                    href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-secondary/5"
                  >
                    <svg className="h-4 w-4 shrink-0 text-highlight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    <span className="truncate font-medium text-primary group-hover:text-secondary">{business.website.replace(/^https?:\/\//, "")}</span>
                  </a>
                )}
                {business.address && (
                  <div className="flex items-start gap-3 px-2 py-2 text-sm">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-highlight" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span className="font-medium text-foreground/80">{business.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Browse Jobs CTA — contextual based on resort/town when available */}
          {(() => {
            const ctaResort = resortData[0];
            const ctaTown = business.operates_in_town && nearbyTownName ? nearbyTownName : null;
            const ctaLabel = ctaTown
              ? `More jobs in ${ctaTown}`
              : ctaResort
                ? `More jobs at ${ctaResort.name}`
                : "Browse all jobs";
            const ctaSub = ctaTown || ctaResort
              ? "See other employers hiring nearby"
              : "Browse all open positions across resorts";
            const ctaHref = ctaResort ? `/resorts/${ctaResort.id}#jobs` : "/jobs";
            return (
              <div className="rounded-2xl border border-secondary/20 bg-gradient-to-br from-primary/[0.04] via-secondary/[0.04] to-highlight/[0.06] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
                    <svg className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary">{ctaLabel}</p>
                    <p className="text-xs text-foreground/55">{ctaSub}</p>
                  </div>
                </div>
                <Link
                  href={ctaHref}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-secondary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-secondary-light hover:shadow-lg hover:shadow-secondary/20"
                >
                  Browse jobs
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
    </>
  );
}

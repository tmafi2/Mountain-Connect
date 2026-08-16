import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { resorts as staticResorts } from "@/lib/data/resorts";
import { EMPLOYER_MARKETS, getEmployerMarket } from "@/lib/data/employer-markets";
import { PRICING, TIER_FEATURES, isFoundingPricingOpen, SEASON_PASS_TERM, SEASON_PASS_EXPLAINER } from "@/lib/tier";
import { flagForCountry } from "@/lib/resort-banner";

const BASE_URL = "https://www.mountainconnects.com";

// Employer landing pages — the business-facing mirror of
// /ski-resort-jobs/[country]. A resort business owner searching "hire
// seasonal staff Canada" / "post ski resort jobs" should land here, see that
// the first post is free, and sign up. Revalidated so the live counts
// (businesses hiring, open jobs) stay fresh without a rebuild.
export const revalidate = 600;

interface Props {
  params: Promise<{ country: string }>;
}

export async function generateStaticParams() {
  return EMPLOYER_MARKETS.map((m) => ({ country: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country } = await params;
  const m = getEmployerMarket(country);
  if (!m) return { title: "Hire Seasonal Staff" };
  // Root layout appends " | Mountain Connects" (~20 chars); keep title ≤ ~40.
  const title = `Hire Seasonal Staff in ${m.displayName}`;
  const description = `Post ski resort jobs in ${m.displayName} and reach workers actively looking for the ${m.season} season. First job post free — applicant tracking, messaging and interviews included.`;
  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/for-employers/${m.slug}` },
    openGraph: { title, description, url: `${BASE_URL}/for-employers/${m.slug}`, siteName: "Mountain Connects", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function EmployerCountryPage({ params }: Props) {
  const { country } = await params;
  const m = getEmployerMarket(country);
  if (!m) notFound();

  const supabase = createPublicClient();
  const countryResorts = staticResorts.filter((r) => r.country === m.country);
  const resortLegacyIds = countryResorts.map((r) => r.id);

  // Live social proof. Resort UUIDs first (static data uses legacy_id).
  const { data: resortRows } = await supabase.from("resorts").select("id, legacy_id, name").in("legacy_id", resortLegacyIds);
  const resortUuids = (resortRows ?? []).map((r) => r.id);

  const [{ count: businessCount }, { count: jobCount }, { data: townRows }] = await Promise.all([
    resortUuids.length
      ? supabase.from("business_profiles").select("id", { count: "exact", head: true }).in("resort_id", resortUuids)
      : Promise.resolve({ count: 0 }),
    resortUuids.length
      ? supabase.from("job_posts").select("id", { count: "exact", head: true }).eq("status", "active").in("resort_id", resortUuids)
      : Promise.resolve({ count: 0 }),
    resortUuids.length
      ? supabase.from("resort_nearby_towns").select("nearby_towns(name, slug)").in("resort_id", resortUuids)
      : Promise.resolve({ data: [] as { nearby_towns: unknown }[] }),
  ]);
  const towns = Array.from(
    new Map(
      (townRows ?? [])
        .map((r) => r.nearby_towns as unknown as { name: string; slug: string } | null)
        .filter((t): t is { name: string; slug: string } => !!t)
        .map((t) => [t.slug, t])
    ).values()
  );
  const townCount = towns.length;
  const townsToShow = towns.slice(0, 12);

  const founding = isFoundingPricingOpen();
  const std = PRICING.standard;
  const prm = PRICING.premium;
  const flag = flagForCountry(m.country);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Hire Seasonal Staff in ${m.displayName}`,
    url: `${BASE_URL}/for-employers/${m.slug}`,
    description: `Post ski resort jobs in ${m.displayName}. First job post free.`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "For Employers", item: `${BASE_URL}/for-employers` },
        { "@type": "ListItem", position: 2, name: m.displayName, item: `${BASE_URL}/for-employers/${m.slug}` },
      ],
    },
    mainEntity: {
      "@type": "Service",
      name: "Mountain Connects — seasonal ski resort staffing",
      areaServed: m.country,
      provider: { "@type": "Organization", name: "Mountain Connects", url: BASE_URL },
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD", description: "1 live job post, applicant tracking, messaging" },
        { "@type": "Offer", name: "Standard", price: String(founding ? std.founding.season : std.full.season), priceCurrency: "USD", description: `Up to 5 active listings, per ${SEASON_PASS_TERM} season pass` },
        { "@type": "Offer", name: "Premium", price: String(founding ? prm.founding.season : prm.full.season), priceCurrency: "USD", description: `Unlimited listings + featured placement, per ${SEASON_PASS_TERM} season pass` },
      ],
    },
  };

  const signup = "/signup?role=business";

  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-primary via-primary/95 to-secondary px-6 py-20 text-white">
        <div className="mx-auto max-w-5xl">
          <Link href="/for-employers" className="text-xs font-bold uppercase tracking-[0.4em] text-highlight hover:underline">
            ← For employers
          </Link>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Hire seasonal staff in {m.displayName} {flag}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/85">
            Reach workers who are actively looking for {m.season} roles at {m.adjective} ski resorts — chefs, lift ops,
            instructors, housekeepers, baristas and more. <strong className="text-white">Your first job post is free.</strong>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href={signup} className="rounded-xl bg-white px-6 py-3 text-base font-bold text-primary shadow-lg transition hover:bg-white/90">
              Post your first job free →
            </Link>
            <span className="text-sm text-white/70">No card needed · takes about 5 minutes</span>
          </div>
          {/* Stats — only show a number when it's a positive signal. A "0
              businesses" stat on a page meant to win businesses is worse than
              no stat, so business/job counts appear once they're meaningful;
              resort + town coverage is always a real, positive number. */}
          {(() => {
            const stats: { n: number; label: string }[] = [
              { n: countryResorts.length, label: `${m.adjective} resorts` },
              ...(townCount >= 3 ? [{ n: townCount, label: "worker towns covered" }] : []),
              ...((businessCount ?? 0) >= 5 ? [{ n: businessCount!, label: "businesses on board" }] : []),
              ...((jobCount ?? 0) >= 3 ? [{ n: jobCount!, label: "jobs live now" }] : []),
            ].slice(0, 3);
            return (
              <div className="mt-10 grid grid-cols-3 gap-6 border-t border-white/15 pt-8 sm:max-w-md">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-3xl font-black">{s.n}</div>
                    <div className="text-xs uppercase tracking-wider text-white/60">{s.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 py-14 space-y-16">
        {/* ── Why it works ── */}
        <section>
          <h2 className="text-2xl font-bold text-primary">Built for seasonal hiring, not a general job board</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-accent/60 bg-white p-6">
              <div className="text-2xl">🎿</div>
              <h3 className="mt-3 font-bold text-primary">Workers who want <em>your</em> season</h3>
              <p className="mt-2 text-sm text-foreground/70">
                Everyone here is looking for a ski-season job. {m.workforce}
              </p>
            </div>
            <div className="rounded-2xl border border-accent/60 bg-white p-6">
              <div className="text-2xl">🗂️</div>
              <h3 className="mt-3 font-bold text-primary">Everything in one place</h3>
              <p className="mt-2 text-sm text-foreground/70">
                Applicant tracking, in-app messaging, interview scheduling and job alerts to matching workers — included on every plan, including free.
              </p>
            </div>
            <div className="rounded-2xl border border-accent/60 bg-white p-6">
              <div className="text-2xl">✅</div>
              <h3 className="mt-3 font-bold text-primary">Trust built in</h3>
              <p className="mt-2 text-sm text-foreground/70">
                Get verified and earn a badge workers look for. Your business page, venues and open roles all live at one shareable link.
              </p>
            </div>
          </div>
        </section>

        {/* ── Timing ── */}
        <section className="rounded-2xl border border-highlight/30 bg-highlight/5 p-6 sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div>
            <h2 className="text-lg font-bold text-primary">Hiring for {m.season}?</h2>
            <p className="mt-1 text-sm text-foreground/70">
              Most {m.adjective} resort businesses do their seasonal hiring in <strong>{m.hiringWindow}</strong>. Workers start browsing well before that — post early and you&apos;re in front of them first.
            </p>
          </div>
          <Link href={signup} className="mt-4 inline-block shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary/90 sm:mt-0">
            Get started free
          </Link>
        </section>

        {/* ── Pricing ── */}
        <section>
          <h2 className="text-2xl font-bold text-primary">Simple, honest pricing</h2>
          <p className="mt-2 text-foreground/70">Priced in USD. Post one job free forever; choose a plan only when you need more. {SEASON_PASS_EXPLAINER}</p>
          {founding && (
            <p className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              🏔️ Founding-member pricing — locked in for as long as you stay subscribed
            </p>
          )}
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-accent bg-white p-6">
              <div className="text-sm font-bold uppercase tracking-wider text-foreground/50">Free</div>
              <div className="mt-2 text-3xl font-extrabold text-primary">$0</div>
              <p className="mt-1 text-xs text-foreground/50">Forever · no card</p>
              <ul className="mt-4 space-y-1.5 text-sm text-foreground/70">
                <li>✓ 1 live job post</li><li>✓ Applicant tracking</li><li>✓ Messaging</li>
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-secondary bg-white p-6">
              <div className="text-sm font-bold uppercase tracking-wider text-secondary">{TIER_FEATURES.standard.name}</div>
              <div className="mt-2 flex items-baseline gap-2">
                {founding && <span className="text-base text-foreground/35 line-through">${std.full.season}</span>}
                <span className="text-3xl font-extrabold text-primary">${founding ? std.founding.season : std.full.season}</span>
                <span className="text-sm text-foreground/50">/ season pass</span>
              </div>
              <p className="mt-1 text-xs text-foreground/50">or ${founding ? std.founding.month : std.full.month}/month · 30-day free trial</p>
              <ul className="mt-4 space-y-1.5 text-sm text-foreground/70">
                <li>✓ 5 active listings</li><li>✓ Verified badge</li><li>✓ Analytics + interviews</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-400 bg-white p-6">
              <div className="text-sm font-bold uppercase tracking-wider text-amber-600">{TIER_FEATURES.premium.name}</div>
              <div className="mt-2 flex items-baseline gap-2">
                {founding && <span className="text-base text-foreground/35 line-through">${prm.full.season}</span>}
                <span className="text-3xl font-extrabold text-primary">${founding ? prm.founding.season : prm.full.season}</span>
                <span className="text-sm text-foreground/50">/ season pass</span>
              </div>
              <p className="mt-1 text-xs text-foreground/50">or ${founding ? prm.founding.month : prm.full.month}/month · 30-day free trial</p>
              <ul className="mt-4 space-y-1.5 text-sm text-foreground/70">
                <li>✓ Unlimited listings</li><li>✓ Featured placement</li><li>✓ Full analytics + priority support</li>
              </ul>
            </div>
          </div>
        </section>

        {/* ── Local hook: resorts + towns (also what makes the page rank) ── */}
        <section>
          <h2 className="text-2xl font-bold text-primary">Hiring across {m.displayName}</h2>
          <p className="mt-2 text-foreground/70">
            Businesses at {m.highlights.slice(0, -1).join(", ")} and {m.highlights.at(-1)} — and the towns workers live in — are already on Mountain Connects.
          </p>
          <div className="mt-6 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50">Resorts</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {countryResorts.map((r) => (
                  <li key={r.id}>
                    <Link href={`/resorts/${r.id}`} className="inline-block rounded-full border border-accent/60 bg-white px-3 py-1 text-sm text-primary transition hover:border-secondary hover:text-secondary">
                      {r.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            {townsToShow.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground/50">Worker towns</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {townsToShow.map((t) => (
                    <li key={t.slug}>
                      <Link href={`/towns/${t.slug}`} className="inline-block rounded-full border border-accent/60 bg-white px-3 py-1 text-sm text-primary transition hover:border-secondary hover:text-secondary">
                        {t.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="rounded-2xl bg-primary px-6 py-10 text-center text-white">
          <h2 className="text-2xl font-bold">Post your first job in {m.displayName} — free</h2>
          <p className="mt-2 text-white/75">Sign up, pick your resort, and your listing is live in minutes.</p>
          <Link href={signup} className="mt-6 inline-block rounded-xl bg-white px-6 py-3 font-bold text-primary transition hover:bg-white/90">
            Get started →
          </Link>
          <p className="mt-4 text-xs text-white/50">
            Looking for work instead? <Link href={`/ski-resort-jobs/${m.slug}`} className="underline hover:text-white">See ski resort jobs in {m.displayName}</Link>
          </p>
        </section>
      </div>
    </main>
  );
}

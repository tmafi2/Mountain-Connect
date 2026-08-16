import Link from "next/link";
import type { Metadata } from "next";
import { EMPLOYER_MARKETS } from "@/lib/data/employer-markets";
import { PRICING, isFoundingPricingOpen, SEASON_PASS_TERM } from "@/lib/tier";
import { flagForCountry } from "@/lib/resort-banner";
import LocationRequestForm from "@/components/ui/LocationRequestForm";

const BASE_URL = "https://www.mountainconnects.com";

// Hub for the business-facing landing pages. Short by design: the real
// selling happens on the per-country pages, this just routes there.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Hire Seasonal Ski Resort Staff",
  description:
    "Post ski resort jobs and reach workers actively looking for the season — in Canada, Japan, the USA and Australia. First job post free. Applicant tracking, messaging and interviews included.",
  alternates: { canonical: `${BASE_URL}/for-employers` },
  openGraph: {
    title: "Hire Seasonal Ski Resort Staff | Mountain Connects",
    description: "Post ski resort jobs and reach seasonal workers. First job post free.",
    url: `${BASE_URL}/for-employers`,
    siteName: "Mountain Connects",
    type: "website",
  },
};

export default function ForEmployersHub() {
  const founding = isFoundingPricingOpen();
  const std = PRICING.standard;
  const signup = "/signup?role=business";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Hire Seasonal Ski Resort Staff",
    url: `${BASE_URL}/for-employers`,
    hasPart: EMPLOYER_MARKETS.map((m) => ({ "@type": "WebPage", name: `Hire Seasonal Staff in ${m.inSentence}`, url: `${BASE_URL}/for-employers/${m.slug}` })),
  };

  return (
    <main className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="bg-gradient-to-br from-primary via-primary/95 to-secondary px-6 py-20 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-highlight">For employers</p>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Hire seasonal staff for your ski-resort business
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-white/85">
            Mountain Connects is where seasonal workers go to find their next winter. Post a job and it&apos;s in front of
            people who are actively looking — not buried in a general job board.{" "}
            <strong className="text-white">Your first job post is free.</strong>
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href={signup} className="rounded-xl bg-white px-6 py-3 text-base font-bold text-primary shadow-lg transition hover:bg-white/90">
              Post your first job free →
            </Link>
            <span className="text-sm text-white/70">
              Then from ${founding ? std.founding.month : std.full.month}/mo or ${founding ? std.founding.season : std.full.season} per {SEASON_PASS_TERM} season pass · 30-day free trial
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-6 py-14">
        <h2 className="text-2xl font-bold text-primary">Where we&apos;re live</h2>
        <p className="mt-2 text-foreground/70">Pick your market for season dates, the workers we reach there, and local resorts.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {EMPLOYER_MARKETS.map((m) => (
            <Link
              key={m.slug}
              href={`/for-employers/${m.slug}`}
              className="group rounded-2xl border border-accent/60 bg-white p-6 transition hover:border-secondary hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold text-primary group-hover:text-secondary">
                    {flagForCountry(m.country)} {m.displayName}
                  </h3>
                  <p className="mt-1 text-sm text-foreground/60">
                    {m.season} season · hire {m.hiringWindow}
                  </p>
                </div>
                <span className="text-secondary opacity-0 transition group-hover:opacity-100">→</span>
              </div>
              <p className="mt-3 text-sm text-foreground/70">{m.highlights.slice(0, 5).join(" · ")}</p>
            </Link>
          ))}
        </div>

        <div className="mx-auto mt-10 max-w-xl">
          <p className="mb-3 text-center text-sm text-foreground/50">Somewhere else? We open new regions based on where businesses ask.</p>
          <LocationRequestForm variant="card" initialKind="either" initialRequester="business" />
        </div>
      </div>
    </main>
  );
}

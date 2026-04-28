import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { resorts as staticResorts } from "@/lib/data/resorts";
import type { Metadata } from "next";

const BASE_URL = "https://www.mountainconnects.com";

// Anchor page for the head term "ski resort jobs". The whole page is
// designed for SEO weight on that exact phrase: H1 matches the URL slug
// matches the title tag matches the meta description. Live job counts
// keep the content fresh between Search Console crawls.
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Ski Resort Jobs — Hiring Now at 80+ Resorts Worldwide",
  description:
    "Find ski resort jobs hiring for the upcoming winter season. Browse instructor, lift operator, hospitality, and chalet roles at ski resorts in Australia, New Zealand, Canada, Japan, the US, and Europe — all on Mountain Connects.",
  alternates: { canonical: `${BASE_URL}/ski-resort-jobs` },
  openGraph: {
    title: "Ski Resort Jobs — Hiring Now at 80+ Resorts Worldwide",
    description:
      "Find ski resort jobs hiring for the upcoming winter season at 80+ resorts worldwide.",
    url: `${BASE_URL}/ski-resort-jobs`,
    siteName: "Mountain Connects",
    type: "website",
  },
};

interface CountryGroup {
  country: string;
  jobCount: number;
  resorts: { name: string; legacyId: string; jobCount: number }[];
}

const COUNTRY_BLURB: Record<string, string> = {
  Australia:
    "Australian ski resorts hire from May to October. Most workers are based in Jindabyne (for Thredbo & Perisher) or Mount Beauty (Falls Creek). Working holiday visas welcome.",
  "New Zealand":
    "New Zealand's ski season runs June through October. Queenstown, Wakatipu, and Methven host the bulk of seasonal hiring across both islands.",
  Canada:
    "Canadian ski resorts run November through April. Whistler, Banff, and Revelstoke see thousands of seasonal workers each year — IEC working holiday visas are common.",
  Japan:
    "Japan's powder belt (Hakuba, Niseko, Furano) hires English-speaking workers for the December–March season. Working visa or holiday visa required.",
  USA:
    "The US ski season runs December through April. J-1 visas, H-2B visas, and seasonal exchange programmes power the workforce across Colorado, Utah, Vermont, and California.",
  France:
    "French alpine resorts run December through April. Chalet hosts, ski instructors, and ski-tech roles dominate. EU citizens have unrestricted access; others need a working visa.",
  Switzerland:
    "Swiss resorts (Verbier, Zermatt, St. Moritz) hire for the December–April season. Strong English required; pay among the highest in the alps.",
  Austria:
    "Austrian resorts hire for the December–April season. Fluent German is often expected for guest-facing roles; back-of-house roles more flexible.",
  Italy:
    "Italian resorts run from late November to early April. Hospitality, chalet, and instructor roles dominate. Italian language is a plus.",
  Andorra:
    "Andorra's resorts run a mid-November to mid-April season. Soldeu and Pas de la Casa lead hiring. Spanish or French language often required.",
  Argentina:
    "Argentine resorts hire June–October — counter-season to the northern hemisphere, perfect for back-to-back ski seasons. Bariloche and Las Leñas dominate.",
  Chile:
    "Chilean resorts run June through October. Most international hiring is in Portillo, Valle Nevado, and Termas de Chillán.",
  Georgia:
    "Gudauri and Bakuriani run December through April. English-speaking instructor roles are increasing each year.",
};

export default async function SkiResortJobsPage() {
  const supabase = createPublicClient();

  const { data: jobs, count: totalJobs } = await supabase
    .from("job_posts")
    .select("id, resort_id", { count: "exact" })
    .eq("status", "active");

  // Group active job counts by resort, then resorts by country, using
  // the static resort data for names + countries (consistent labels).
  const resortMap = new Map(staticResorts.map((r) => [r.id, r]));
  const jobsByResort = new Map<string, number>();
  for (const j of jobs ?? []) {
    if (!j.resort_id) continue;
    jobsByResort.set(j.resort_id, (jobsByResort.get(j.resort_id) ?? 0) + 1);
  }

  const countryGroups = new Map<string, CountryGroup>();
  for (const r of staticResorts) {
    const jobCount = jobsByResort.get(r.id) ?? 0;
    if (!countryGroups.has(r.country)) {
      countryGroups.set(r.country, { country: r.country, jobCount: 0, resorts: [] });
    }
    const group = countryGroups.get(r.country)!;
    group.jobCount += jobCount;
    group.resorts.push({ name: r.name, legacyId: r.id, jobCount });
  }
  const sortedCountries = [...countryGroups.values()]
    .sort((a, b) => b.jobCount - a.jobCount || a.country.localeCompare(b.country));

  // JSON-LD: declare this page as the collection / aggregator of ski
  // resort jobs so Google can pick it up for the JobPosting carousel.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Ski Resort Jobs",
    description:
      "Aggregate of all open ski resort jobs across the Mountain Connects platform.",
    url: `${BASE_URL}/ski-resort-jobs`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: totalJobs ?? 0,
      itemListElement: sortedCountries.slice(0, 6).map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/ski-resort-jobs/${slugifyCountry(c.country)}`,
        name: `Ski Resort Jobs in ${c.country}`,
      })),
    },
  };

  // FAQ schema — captures the high-volume question searches that
  // accompany "ski resort jobs". Helps win featured snippets.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How do I get a ski resort job with no experience?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Most resorts hire entry-level roles in lift operations, food and beverage, housekeeping, and rentals — none require previous ski experience. Apply early (3–6 months before season start) and highlight customer service or hospitality experience.",
        },
      },
      {
        "@type": "Question",
        name: "When do ski resorts hire for the season?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Northern hemisphere resorts (Canada, US, Japan, Europe) hire for a December–April season, with most hiring done August–October. Southern hemisphere resorts (Australia, New Zealand, South America) hire for a June–October season, with hiring done March–May.",
        },
      },
      {
        "@type": "Question",
        name: "Do ski resort jobs include accommodation?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Many do — staff housing is a standard perk at most major resorts and a common deciding factor for seasonal workers. Filter listings on Mountain Connects by 'accommodation included' to see only roles with housing.",
        },
      },
      {
        "@type": "Question",
        name: "What visa do I need for a ski resort job overseas?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Working Holiday visas are the most common path for under-30s targeting Australia, New Zealand, Canada, or Japan. Some larger resorts offer visa sponsorship for specialist roles. Always confirm visa eligibility with the employer before applying.",
        },
      },
      {
        "@type": "Question",
        name: "How much do ski resort jobs pay?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Entry-level roles typically pay AUD/NZD/CAD $20–$30 per hour. Ski instructors, ski patrol, and senior hospitality roles pay $25–$50 per hour. Many roles include accommodation, ski pass, and meals on top of the hourly rate.",
        },
      },
    ],
  };

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ───────── Hero ───────── */}
      <section className="bg-gradient-to-br from-primary via-primary/95 to-secondary px-6 py-20 text-white">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-secondary">
            Mountain Connects · Hiring Now
          </p>
          <h1 className="mt-3 text-5xl font-black leading-tight tracking-tight sm:text-6xl">
            Ski Resort Jobs
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            Browse {totalJobs ?? 0}+ open roles at {staticResorts.length}+ ski resorts across
            Australia, New Zealand, Canada, Japan, the US, and Europe — instructor, lift
            operator, hospitality, chalet host, and more.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/jobs"
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-primary shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Browse all open jobs →
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Create a free profile
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── By country ───────── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            Ski resort jobs by country
          </h2>
          <p className="mt-2 max-w-2xl text-foreground/65">
            Northern hemisphere season runs December–April; southern hemisphere June–October.
            Pick a destination to see open roles, working visa info, and resort guides.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedCountries.map((c) => (
              <Link
                key={c.country}
                href={`/ski-resort-jobs/${slugifyCountry(c.country)}`}
                className="group rounded-2xl border border-accent bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-secondary hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider text-secondary">
                      {c.country}
                    </p>
                    <p className="mt-1 text-lg font-bold text-primary group-hover:text-secondary transition-colors">
                      {c.jobCount} open {c.jobCount === 1 ? "role" : "roles"}
                    </p>
                    <p className="mt-0.5 text-xs text-foreground/50">
                      {c.resorts.length} {c.resorts.length === 1 ? "resort" : "resorts"}
                    </p>
                  </div>
                  <span className="text-foreground/30 group-hover:text-secondary transition-colors">→</span>
                </div>
                {COUNTRY_BLURB[c.country] && (
                  <p className="mt-3 text-xs leading-snug text-foreground/55">
                    {COUNTRY_BLURB[c.country]}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── FAQ — for SEO + readers ───────── */}
      <section className="border-t border-accent/40 bg-accent/10 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            Common questions about ski resort jobs
          </h2>
          <div className="mt-8 space-y-6">
            <Faq q="How do I get a ski resort job with no experience?">
              Most resorts hire entry-level roles in <strong>lift operations</strong>, <strong>food and beverage</strong>, <strong>housekeeping</strong>, and <strong>rentals</strong> — none require previous ski experience. Apply early (3–6 months before season start) and highlight any customer service or hospitality background.
            </Faq>
            <Faq q="When do ski resorts hire for the season?">
              Northern hemisphere resorts (Canada, US, Japan, Europe) hire for a <strong>December–April</strong> season; most hiring happens August–October. Southern hemisphere resorts (Australia, New Zealand, South America) hire for a <strong>June–October</strong> season; most hiring March–May.
            </Faq>
            <Faq q="Do ski resort jobs include accommodation?">
              Many do — staff housing is a standard perk at most major resorts and a common deciding factor for seasonal workers. Use the <Link href="/jobs" className="text-secondary underline">listings filter</Link> to see only roles with accommodation included.
            </Faq>
            <Faq q="What visa do I need for a ski resort job overseas?">
              <strong>Working Holiday visas</strong> are the most common path for under-30s targeting Australia, New Zealand, Canada, or Japan. Some resorts offer visa sponsorship for specialist roles like ski instructors and patrol. Confirm visa eligibility with the employer before applying.
            </Faq>
            <Faq q="How much do ski resort jobs pay?">
              Entry-level roles typically pay <strong>$20–$30/hour</strong> (AUD/NZD/CAD). Ski instructors, ski patrol, and senior hospitality roles pay <strong>$25–$50/hour</strong>. Many roles also include accommodation, a season ski pass, and staff meals on top of the wage.
            </Faq>
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl bg-primary p-10 text-center text-white">
          <h2 className="text-3xl font-bold tracking-tight">Ready to find your season?</h2>
          <p className="mt-3 text-white/80">
            Create a free worker profile and get matched with ski resort jobs that fit your visa,
            experience, and dates.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/jobs"
              className="rounded-full bg-secondary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-secondary/90"
            >
              Browse open jobs
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20"
            >
              Create a profile
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-bold text-primary">{q}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-foreground/75">{children}</p>
    </div>
  );
}

function slugifyCountry(country: string): string {
  return country
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

import Link from "next/link";
import { defaultOgImage } from "@/lib/seo";
import RelatedGuides from "@/components/ui/RelatedGuides";
import { getRelatedGuides } from "@/lib/blog/related-guides.server";
import { summarise, canQuoteShares, listRoles } from "@/lib/stats/hiring-by-resort";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { resorts as staticResorts } from "@/lib/data/resorts";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

const BASE_URL = "https://www.mountainconnects.com";

// Country landing pages: each one is a long-tail variant of "ski resort
// jobs" — e.g. "ski resort jobs Australia". They re-use the hub's
// structure but scoped to a single country and link out to that
// country's resort guides and jobs.
export const revalidate = 600;

// ⚠️ The guide list is looked up at render. On an SSG prerender the
// Supabase key is withheld, so the first build of a deploy returns none
// and this section is absent until the first revalidation ten minutes
// later — it then stays. That is the trade for not hard-coding titles
// that would go stale the moment a post is renamed.

interface CountryConfig {
  slug: string;
  country: string;
  hemisphere: "Northern" | "Southern";
  season: string;
  visaNote: string;
  intro: string;
}

const COUNTRIES: CountryConfig[] = [
  {
    slug: "australia",
    country: "Australia",
    hemisphere: "Southern",
    season: "June – October",
    visaNote: "Working Holiday Visa (subclass 417 / 462) is the most common path for under-35s.",
    intro:
      "Australian ski resort jobs are concentrated in the Snowy Mountains (Thredbo, Perisher) and the Victorian Alps (Falls Creek, Mt Buller, Mt Hotham). Most seasonal workers live in Jindabyne (NSW) or Mount Beauty (VIC). The 2026 winter season runs late June through early October.",
  },
  {
    slug: "new-zealand",
    country: "New Zealand",
    hemisphere: "Southern",
    season: "June – October",
    visaNote: "Working Holiday Visa available for under-35s from many countries. Some resort employer-sponsored work visas also exist.",
    intro:
      "New Zealand's ski jobs span both islands — Queenstown and Wakatipu (Coronet Peak, The Remarkables, Cardrona) on the South Island, and Mt Ruapehu on the North. The country has some of the most international ski crews in the world.",
  },
  {
    slug: "canada",
    country: "Canada",
    hemisphere: "Northern",
    season: "November – April",
    visaNote: "International Experience Canada (IEC) Working Holiday is the standard path for under-35s.",
    intro:
      "Canadian ski resort jobs run from late November to mid-April. Whistler Blackcomb, the Banff trio of Mount Norquay, Sunshine Village and Lake Louise, and Revelstoke see thousands of seasonal workers each year. Big resort operators sponsor specialist roles.",
  },
  {
    slug: "japan",
    country: "Japan",
    hemisphere: "Northern",
    season: "December – March",
    visaNote: "Working Holiday Visa available for citizens of select countries. Some specialist roles offer Designated Activities visas.",
    intro:
      "Japan's powder belt — Hakuba, Niseko, Furano, Nozawa Onsen — hires English-speaking workers for the December through March season. Roles concentrate in chalet hosting, ski school, and lift operations.",
  },
  {
    slug: "usa",
    country: "USA",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "J-1 Cultural Exchange and H-2B Seasonal Worker visas dominate. Some specialist roles offer H-2A or O-1.",
    intro:
      "US ski resort jobs span Colorado (Vail, Breckenridge, Aspen, Telluride), Utah (Park City), Vermont (Stowe), California (Mammoth, Tahoe), and Wyoming (Jackson Hole). The season runs December through April, with most hiring done August–October.",
  },
  {
    slug: "france",
    country: "France",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "EU/EEA citizens can work without a visa. Non-EU workers need a working visa or chalet operator sponsorship.",
    intro:
      "French alpine resorts — Chamonix, Val d'Isère, Méribel, Val Thorens, Courchevel — run their season from mid-December to late April. Chalet hosts, ski instructors, and ski-tech roles dominate the British and Australian-staffed operators.",
  },
  {
    slug: "switzerland",
    country: "Switzerland",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "EU/EEA citizens can work freely. Non-EU workers need an employer-sponsored work permit.",
    intro:
      "Swiss ski resort jobs (Verbier, Zermatt, St. Moritz, Sölden, Verbier) run mid-December through April. Pay rates are among the highest in the alps but the cost of living matches.",
  },
  {
    slug: "austria",
    country: "Austria",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "EU/EEA citizens work freely. Non-EU workers need a Red-White-Red Card or sponsored work permit.",
    intro:
      "Austrian ski resort jobs (St. Anton, Kitzbühel, Mayrhofen, Ischgl, Sölden) run early December to mid-April. Conversational German is often required for guest-facing roles.",
  },
  {
    slug: "italy",
    country: "Italy",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "EU/EEA citizens work freely. Non-EU workers need an Italian work visa.",
    intro:
      "Italian Dolomites resorts (Cortina d'Ampezzo, Madonna di Campiglio, Livigno) run from late November through early April. Hospitality and chalet roles dominate; Italian language is a plus but not always essential.",
  },
  {
    slug: "andorra",
    country: "Andorra",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "EU citizens preferred. Non-EU workers need an Andorran working permit.",
    intro:
      "Andorran resorts (Soldeu, Pas de la Casa, Grandvalira) run from early December through mid-April. Spanish, French, or Catalan language is often required.",
  },
  {
    slug: "argentina",
    country: "Argentina",
    hemisphere: "Southern",
    season: "June – October",
    visaNote: "Working Holiday Visa available for citizens of select countries.",
    intro:
      "Argentine ski jobs (Bariloche / Cerro Catedral, Las Leñas, Cerro Bayo) run June through October — perfect for back-to-back ski seasons with the northern hemisphere.",
  },
  {
    slug: "chile",
    country: "Chile",
    hemisphere: "Southern",
    season: "June – October",
    visaNote: "Working Holiday Visa available for select nationalities. Sponsored work permits common at large resorts.",
    intro:
      "Chilean resorts (Portillo, Valle Nevado, La Parva, Termas de Chillán) run June through October. International instructor and hospitality programs are common.",
  },
  {
    slug: "georgia",
    country: "Georgia",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "Many nationalities can stay 365 days visa-free and work without restriction.",
    intro:
      "Gudauri and Bakuriani run December through April. Georgian ski jobs are increasingly popular thanks to long visa-free stays for most passports.",
  },
  {
    slug: "sweden",
    country: "Sweden",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "EU/EEA citizens work freely. Non-EU workers need a Swedish work permit.",
    intro:
      "Swedish ski resorts (Åre, Sälen, Riksgränsen) run December through April, with the northern resorts staying open later into May. English is widely spoken.",
  },
];

interface CountryPageProps {
  params: Promise<{ country: string }>;
}

export async function generateStaticParams() {
  return COUNTRIES.map((c) => ({ country: c.slug }));
}

export async function generateMetadata({ params }: CountryPageProps): Promise<Metadata> {
  const { country } = await params;
  const cfg = COUNTRIES.find((c) => c.slug === country);
  if (!cfg) return { title: "Ski Resort Jobs" };

  // Google shows ~60 chars of title and ~155 of description. The root layout
  // appends " | Mountain Connects" (~20 chars), so keep the title itself short
  // and put the season detail in the description instead.
  return {
    title: `Ski Resort Jobs in ${cfg.country}`,
    description: `Ski resort jobs in ${cfg.country} for the ${cfg.season} season — instructor, lift op, hospitality and chalet roles at top resorts. Apply free.`,
    alternates: { canonical: `${BASE_URL}/ski-resort-jobs/${cfg.slug}` },
    openGraph: {
      title: `Ski Resort Jobs in ${cfg.country}`,
      description: `Open ski resort jobs in ${cfg.country} for the ${cfg.season} season.`,
      url: `${BASE_URL}/ski-resort-jobs/${cfg.slug}`,
      siteName: "Mountain Connects",
      type: "website",
      // ⚠️ Was missing: these 14 pages shared with no image at all, which on
      // Facebook and WhatsApp renders a bare grey card. They are the country
      // landing pages, so they are the ones most likely to be shared.
      images: [defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title: `Ski Resort Jobs in ${cfg.country}`,
      description: `Open ski resort jobs in ${cfg.country} for the ${cfg.season} season.`,
      images: [defaultOgImage.url],
    },
  };
}

export default async function SkiResortJobsCountryPage({ params }: CountryPageProps) {
  const { country: slug } = await params;
  const cfg = COUNTRIES.find((c) => c.slug === slug);
  if (!cfg) notFound();

  const guides = await getRelatedGuides({ kind: "country", country: cfg.country });

  const supabase = createPublicClient();
  const countryResorts = staticResorts.filter((r) => r.country === cfg.country);

  /**
   * ⚠️ TWO KINDS OF RESORT ID, AND THEY ARE NOT INTERCHANGEABLE.
   *
   * `lib/data/resorts.ts` is keyed on **legacy_id** ("1", "2"), which is what
   * /resorts/[id] renders from and what the markup below asks for. But
   * `job_posts.resort_id` is the database **UUID**.
   *
   * This page used to build `resortIds` from the static array and hand them
   * to `.in("resort_id", …)`. A UUID column never matches "1", so the filter
   * returned nothing and EVERY country page said "Open roles: 0" — while
   * Canada alone had 182. Proven: `resort_id::text in ('1','2','3')` matches
   * 0 rows; the same jobs joined through `resorts` give 182.
   *
   * So the country filter happens in the DATABASE, through the join, and the
   * rows come back carrying `legacy_id` — the key the render actually uses.
   * Nothing in this file converts between the two by hand.
   *
   * "Open" means published and not expired: `status='active'` (the expiry
   * sweep moves lapsed posts to 'paused', and a filled role is 'closed'),
   * plus an explicit expires_at guard so a post that is past its date but
   * not yet swept is not counted as open.
   */
  // ⚠️ Paged. A plain select stops at 1000 rows with no error, which on this
  // page would understate the country's open roles AND drop listings from it.
  // See lib/supabase/fetch-all.ts.
  // ⚠️ These columns were fetched and then thrown away: the page showed a
  // count and a resort list and never a single job. A country page with 198
  // real listings that shows none of them is competing against Indeed with
  // its one advantage hidden.
  type JobRow = {
    id: string;
    title: string;
    salary_range: string | null;
    accommodation_included: boolean | null;
    ski_pass_included: boolean | null;
    category: string | null;
    business_id: string | null;
    published_at: string | null;
    created_at: string | null;
    resorts: unknown;
    business_profiles: unknown;
  };
  let jobs: JobRow[] = [];
  try {
    jobs = await fetchAllRows<JobRow>(
      (from, to) =>
        supabase
          .from("job_posts")
          .select(
            "id, title, salary_range, pay_amount, pay_currency, position_type, accommodation_included, ski_pass_included, category, business_id, published_at, created_at, resorts!inner(legacy_id, name, country), business_profiles!inner(business_name)"
          )
          .eq("status", "active")
          .eq("resorts.country", cfg.country)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .range(from, to),
      `ski-resort-jobs/${slug}`
    );
  } catch (err) {
    // The old code discarded the error. A silently empty result is exactly how
    // "Open roles: 0" survived on every country page.
    console.error(`ski-resort-jobs/${slug}: job count query failed:`, err);
  }

  type ResortRef = { legacy_id: string | null } | null;
  const legacyIdOf = (v: ResortRef | ResortRef[]): string | null =>
    (Array.isArray(v) ? v[0] : v)?.legacy_id ?? null;

  const jobCount = jobs?.length ?? 0;
  const jobsByResort = new Map<string, NonNullable<typeof jobs>>();
  for (const j of jobs ?? []) {
    // PostgREST types a many-to-one join as an array without generated types.
    const key = legacyIdOf((j as unknown as { resorts: ResortRef | ResortRef[] }).resorts);
    if (!key) continue;
    const list = jobsByResort.get(key) ?? [];
    list.push(j);
    jobsByResort.set(key, list);
  }

  const nameOf = (v: unknown): string | null => {
    const o = Array.isArray(v) ? v[0] : v;
    return (o as { name?: string; business_name?: string } | null)?.name
      ?? (o as { business_name?: string } | null)?.business_name
      ?? null;
  };

  // ⚠️ RESORTS WITH OPEN ROLES FIRST, AND THE EMPTY ONES BEHIND A SUMMARY.
  // Canada lists 24 resorts and 15 of them had "0 open roles", so two thirds
  // of the page's main block told a searcher there was nothing here. The
  // empty ones still render — they are real resorts and the links are worth
  // having — but they no longer lead.
  const resortsWithRoles = countryResorts
    .map((r) => ({ r, count: jobsByResort.get(r.id)?.length ?? 0 }))
    .sort((a, b) => b.count - a.count || a.r.name.localeCompare(b.r.name));
  const hiringResorts = resortsWithRoles.filter((x) => x.count > 0);
  const quietResorts = resortsWithRoles.filter((x) => x.count === 0);

  /**
   * The newest listings, spread across resorts.
   *
   * ⚠️ STRAIGHT RECENCY GAVE EIGHTEEN WHISTLER JOBS. Whistler holds 128 of
   * Canada's 198 and dominates every recent scrape, so a plain sort made a
   * page about a whole country look like a page about one mountain — and
   * buried Revelstoke, Big White and Fernie entirely. One round per resort,
   * newest first within each, repeated until the list is full: the busiest
   * resorts still lead and still appear most, but the breadth is visible.
   */
  const newestFirst = (a: JobRow, b: JobRow) =>
    String(b.published_at ?? b.created_at ?? "").localeCompare(String(a.published_at ?? a.created_at ?? ""));

  const queues = [...jobsByResort.values()]
    .map((list) => [...list].sort(newestFirst))
    .sort((a, b) => b.length - a.length);

  const recentJobs: JobRow[] = [];
  for (let round = 0; recentJobs.length < 18; round++) {
    const before = recentJobs.length;
    for (const q of queues) {
      if (round < q.length && recentJobs.length < 18) recentJobs.push(q[round]);
    }
    if (recentJobs.length === before) break; // every queue exhausted
  }

  // ⚠️ Counted, never typed, and the shares respect the five-listing floor —
  // the same rule the data pages keep. See lib/stats/hiring-by-resort.
  const hiring = summarise(cfg.country, jobs.map((j) => ({
    category: j.category,
    business_id: j.business_id,
    accommodation_included: j.accommodation_included,
    ski_pass_included: j.ski_pass_included,
    salary_range: j.salary_range,
  })));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Ski Resort Jobs in ${cfg.country}`,
    description: `Aggregate of ski resort jobs across ${countryResorts.length} resorts in ${cfg.country}.`,
    url: `${BASE_URL}/ski-resort-jobs/${cfg.slug}`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ski Resort Jobs", item: `${BASE_URL}/ski-resort-jobs` },
        { "@type": "ListItem", position: 2, name: cfg.country, item: `${BASE_URL}/ski-resort-jobs/${cfg.slug}` },
      ],
    },
  };

  /**
   * ⚠️ AN ItemList OF URLS, NOT A PILE OF JobPostings.
   *
   * Google wants JobPosting on the job's OWN page, which /jobs/[id] already
   * emits. Repeating twenty full JobPostings here would duplicate that markup
   * on a page that is not the posting, which is the kind of thing that gets a
   * site's job markup distrusted rather than rewarded. An ItemList pointing at
   * the detail pages is the documented shape for a list page and adds no claim
   * the detail page does not already make.
   */
  const listJsonLd = recentJobs.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `Open ski resort jobs in ${cfg.country}`,
        numberOfItems: recentJobs.length,
        itemListElement: recentJobs.map((j, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${BASE_URL}/jobs/${j.id}`,
          name: j.title,
        })),
      }
    : null;

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {listJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }}
        />
      )}

      {/* ───────── Hero ───────── */}
      <section className="bg-gradient-to-br from-primary via-primary/95 to-secondary px-6 py-20 text-white">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/ski-resort-jobs"
            className="text-xs font-bold uppercase tracking-[0.4em] text-secondary hover:underline"
          >
            ← All ski resort jobs
          </Link>
          <h1 className="mt-3 text-5xl font-black leading-tight tracking-tight sm:text-6xl">
            Ski Resort Jobs in {cfg.country}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">
            {cfg.intro}
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
            <span><strong className="text-white">Season:</strong> {cfg.season}</span>
            <span><strong className="text-white">Hemisphere:</strong> {cfg.hemisphere}</span>
            <span><strong className="text-white">Open roles:</strong> {jobCount}</span>
          </div>
          <div className="mt-8">
            <Link
              href={`/jobs?country=${encodeURIComponent(cfg.country)}`}
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-primary shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Browse all {cfg.country} jobs →
            </Link>
          </div>
        </div>
      </section>

      {/* ───────── Visa note ───────── */}
      <section className="border-b border-accent/40 bg-amber-50/50 px-6 py-6">
        <div className="mx-auto max-w-5xl">
          <p className="text-sm text-foreground/80">
            <strong className="text-amber-800">Working visa:</strong> {cfg.visaNote}
          </p>
        </div>
      </section>

      {/* ───────── What is open, which is why anyone is here ───────── */}
      {recentJobs.length > 0 && (
        <section className="px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold tracking-tight text-primary">
              Open roles in {cfg.country}
            </h2>
            <p className="mt-2 max-w-2xl text-foreground/65">
              The {recentJobs.length} most recently posted of {jobCount}, counted from live
              listings.
            </p>

            <ul className="mt-8 divide-y divide-accent/40 overflow-hidden rounded-2xl border border-accent bg-white">
              {recentJobs.map((j) => (
                <li key={j.id}>
                  <Link
                    href={`/jobs/${j.id}`}
                    className="group flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4 transition-colors hover:bg-accent/10"
                  >
                    <span className="font-semibold text-primary group-hover:text-secondary">
                      {j.title}
                    </span>
                    <span className="text-sm text-foreground/60">
                      {nameOf(j.business_profiles) ?? "—"}
                      {nameOf(j.resorts) && <> · {nameOf(j.resorts)}</>}
                      {j.salary_range && <> · {j.salary_range}</>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href={`/jobs?country=${encodeURIComponent(cfg.country)}`}
              className="mt-6 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              See all {jobCount} {cfg.country} roles
            </Link>

            {/* ⚠️ Counts always; shares only above the floor, and the silence
                is never turned into a negative — these columns are tri-state
                and NULL is most of the board. */}
            <p className="mt-8 leading-relaxed text-foreground/75">
              <strong className="text-primary">{hiring.employerCount}</strong>{" "}
              {hiring.employerCount === 1 ? "employer is" : "employers are"} hiring
              {listRoles(hiring.topRoles) && <> — mostly {listRoles(hiring.topRoles)}</>}.
              {hiring.pricedCount > 0 && (
                <> {hiring.pricedCount} of the {jobCount} state an hourly rate.</>
              )}
              {canQuoteShares(hiring) && hiring.saysHousing > 0 && (
                <>
                  {" "}
                  <strong className="text-primary">{hiring.saysHousing}</strong>{" "}
                  {hiring.saysHousing === 1 ? "advertises" : "advertise"} staff accommodation;
                  the rest do not say either way.
                </>
              )}
            </p>
          </div>
        </section>
      )}

      {/* ───────── Resorts ───────── */}
      <section className="border-t border-accent/40 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            Resorts hiring in {cfg.country}
          </h2>
          <p className="mt-2 max-w-2xl text-foreground/65">
            {hiringResorts.length > 0
              ? `${hiringResorts.length} of our ${countryResorts.length} ${cfg.country} resorts have something open right now.`
              : `${countryResorts.length} resorts on Mountain Connects. Nothing is open at any of them today.`}
          </p>

          {hiringResorts.length > 0 && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hiringResorts.map(({ r, count }) => (
                <Link
                  key={r.id}
                  href={`/resorts/${r.id}`}
                  className="group rounded-2xl border border-accent bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-secondary hover:shadow-md"
                >
                  <p className="text-lg font-bold text-primary transition-colors group-hover:text-secondary">
                    {r.name}
                  </p>
                  <p className="mt-1 text-xs font-medium text-secondary">
                    {count} open {count === 1 ? "role" : "roles"}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {/* ⚠️ The quiet resorts stay — they are real places and the links are
              worth having — but as a list rather than 15 cards each announcing
              that there is nothing here. */}
          {quietResorts.length > 0 && (
            <details className="mt-8 rounded-2xl border border-accent/50 bg-white p-5">
              <summary className="cursor-pointer text-sm font-semibold text-primary">
                {quietResorts.length} more {cfg.country}{" "}
                {quietResorts.length === 1 ? "resort" : "resorts"} with nothing open today
              </summary>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                {quietResorts.map(({ r }) => (
                  <Link
                    key={r.id}
                    href={`/resorts/${r.id}`}
                    className="text-sm text-secondary hover:underline"
                  >
                    {r.name}
                  </Link>
                ))}
              </div>
            </details>
          )}
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <RelatedGuides
        guides={guides}
        heading={`Before you go to ${cfg.country}`}
        intro="Written for seasonal workers, and counted from the listings open right now."
      />

      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-3xl bg-primary p-10 text-center text-white">
          <h2 className="text-3xl font-bold tracking-tight">
            Apply for ski resort jobs in {cfg.country}
          </h2>
          <p className="mt-3 text-white/80">
            Create a free worker profile and we&apos;ll match you with {cfg.country} resorts hiring
            for the {cfg.season} season.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/jobs?country=${encodeURIComponent(cfg.country)}`}
              className="rounded-full bg-secondary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-secondary/90"
            >
              Browse {cfg.country} jobs
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

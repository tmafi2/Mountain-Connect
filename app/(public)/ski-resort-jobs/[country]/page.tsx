import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createPublicClient } from "@/lib/supabase/public";
import { resorts as staticResorts } from "@/lib/data/resorts";

const BASE_URL = "https://www.mountainconnects.com";

// Country landing pages: each one is a long-tail variant of "ski resort
// jobs" — e.g. "ski resort jobs Australia". They re-use the hub's
// structure but scoped to a single country and link out to that
// country's resort guides and jobs.
export const revalidate = 600;

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
      "Canadian ski resort jobs run from late November to mid-April. Whistler-Blackcomb, Banff/Lake Louise, and Revelstoke see thousands of seasonal workers each year. Big resort operators sponsor specialist roles.",
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

  return {
    title: `Ski Resort Jobs in ${cfg.country} — ${cfg.season} ${cfg.hemisphere} Season`,
    description: `Find ski resort jobs in ${cfg.country} hiring for the ${cfg.season} winter season. Browse open instructor, lift operator, hospitality, and chalet roles at ${cfg.country}'s top ski resorts on Mountain Connects.`,
    alternates: { canonical: `${BASE_URL}/ski-resort-jobs/${cfg.slug}` },
    openGraph: {
      title: `Ski Resort Jobs in ${cfg.country}`,
      description: `Open ski resort jobs in ${cfg.country} for the ${cfg.season} season.`,
      url: `${BASE_URL}/ski-resort-jobs/${cfg.slug}`,
      siteName: "Mountain Connects",
      type: "website",
    },
  };
}

export default async function SkiResortJobsCountryPage({ params }: CountryPageProps) {
  const { country: slug } = await params;
  const cfg = COUNTRIES.find((c) => c.slug === slug);
  if (!cfg) notFound();

  const supabase = createPublicClient();
  const countryResorts = staticResorts.filter((r) => r.country === cfg.country);
  const resortIds = countryResorts.map((r) => r.id);

  const { data: jobs } = await supabase
    .from("job_posts")
    .select("id, title, resort_id, salary_range, pay_amount, pay_currency, position_type, accommodation_included, business_profiles!inner(business_name)")
    .eq("status", "active")
    .in("resort_id", resortIds);

  const jobCount = jobs?.length ?? 0;
  const jobsByResort = new Map<string, typeof jobs>();
  for (const j of jobs ?? []) {
    const list = jobsByResort.get(j.resort_id) ?? [];
    list.push(j);
    jobsByResort.set(j.resort_id, list);
  }

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

  return (
    <main className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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

      {/* ───────── Resorts ───────── */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold tracking-tight text-primary">
            Resorts hiring in {cfg.country}
          </h2>
          <p className="mt-2 max-w-2xl text-foreground/65">
            {countryResorts.length} resorts on Mountain Connects, with {jobCount} open
            {jobCount === 1 ? " role" : " roles"} right now.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {countryResorts.map((r) => {
              const count = jobsByResort.get(r.id)?.length ?? 0;
              return (
                <Link
                  key={r.id}
                  href={`/resorts/${r.id}`}
                  className="group rounded-2xl border border-accent bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-secondary hover:shadow-md"
                >
                  <p className="text-lg font-bold text-primary group-hover:text-secondary transition-colors">
                    {r.name}
                  </p>
                  <p className="mt-1 text-xs text-foreground/50">
                    {count} open {count === 1 ? "role" : "roles"}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
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

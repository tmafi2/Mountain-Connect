import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { defaultOgImage } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import { getPlatformStats } from "@/lib/stats/platform-stats.server";
import { formatStat } from "@/lib/stats/platform-stats";

/* Client components — only the interactive bits */
import HeroSection from "./home/HeroSection";
import ParticleGlobe from "./home/ParticleGlobe";
import AnimatedCounter from "./home/AnimatedCounter";
import CtaButtons from "./home/CtaButtons";
/* The scrollmation itself, and the layout rhythm it runs inside.
   ⚠️ ScrollAnimationInit is deliberately gone: it drove the old
   `animate-on-scroll` CSS classes, and every element that used them now
   reveals through SplitLines/RiseIn instead. Leaving it in would mean two
   independent observers racing over the same page. */
import SplitLines, { RiseIn } from "./home/SplitLines";
import { Band, Column, Statement, Eyebrow } from "./home/Beats";

const TITLE = "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide";

/**
 * The counts below must be queried per request, not baked in at build time
 * where Vercel withholds the Sensitive Supabase keys and they come back
 * empty. This page was already dynamic by accident — it calls createClient()
 * for the session — but that is a side effect of an unrelated line, and
 * deleting that line would silently prerender the stats bar as "—".
 */
export const dynamic = "force-dynamic";

/**
 * The meta description is COUNTED, not remembered.
 *
 * It used to read "across 69+ resorts in 12 countries", typed in when those
 * were the figures. By October 2026 the real numbers were 111 and 14, and the
 * stale pair had been served to every crawler for months — Bing's AI answer
 * was repeating "over 50 ski resorts across 12 countries" back to searchers,
 * sourced from this tag. Exactly the /about failure (see
 * lib/stats/platform-stats.ts), except /about's JSX was fixed in September and
 * this was missed, because nobody reads the metadata.
 *
 * generateMetadata can await, and this page is ALREADY dynamic — it calls
 * createClient() for the session, so there is no caching to give up.
 *
 * ⚠️ IT FALLS BACK TO NO NUMBER AT ALL, never to a remembered one. If the
 * count is unavailable (a build-time render has no Supabase keys) the sentence
 * simply omits the figures rather than inventing or recalling them. A vaguer
 * true line beats a precise false one, which is the whole lesson here.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { resorts, countries } = await getPlatformStats();
  const scale =
    resorts > 0 && countries > 0 ? ` across ${resorts} resorts in ${countries} countries` : "";
  const description = `Find seasonal work at ski resorts worldwide. Browse jobs in hospitality, ski instruction, food & beverage, retail, and more${scale}.`;
  const short = `Find seasonal work at ski resorts worldwide. Browse jobs${scale}.`;

  return {
    // `absolute` because TITLE already names the brand and the root layout's
    // template appends " | Mountain Connects" to anything else — this page
    // shipped as "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide
    // | Mountain Connects". The same doubling was on eight other pages that
    // wrote the suffix into their own title.
    title: { absolute: TITLE },
    description,
    alternates: { canonical: "https://www.mountainconnects.com" },
    openGraph: {
      title: TITLE,
      description: short,
      url: "https://www.mountainconnects.com",
      siteName: "Mountain Connects",
      type: "website",
      images: [defaultOgImage],
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE,
      description: short,
      images: [defaultOgImage.url],
    },
  };
}

/* ⚠️ NO Organization OR WebSite NODE HERE. app/layout.tsx emits both on
   every page, so this file's copies made the home page carry TWO of each —
   and they disagreed: the layout's Organization lists our social profiles
   while this one declared `sameAs: []`, an explicit claim to have none, on
   the single page most likely to be read as authoritative. Two nodes for one
   organisation is worse than either node alone. Only the FAQ below is
   page-specific, so only the FAQ stays. */

/* ─── FAQ content — also emitted as FAQPage JSON-LD ────────
   Each entry targets a real search query we want to rank for. */
const faqItems: { q: string; a: string }[] = [
  {
    q: "How much do seasonal ski resort jobs pay?",
    a: "Pay varies by role and country but most seasonal ski resort jobs range from entry-level minimum wage up to experienced-instructor rates. Many positions include accommodation, a ski or lift pass, and meals as additional perks, which significantly reduces your cost of living for the season. Each listing on Mountain Connects shows the pay range, currency, and what perks are included up front.",
  },
  {
    q: "When does hiring start for ski season?",
    a: "Northern Hemisphere resorts (North America, Europe, Japan) typically start hiring in July–September for the December–April season. Southern Hemisphere resorts (Australia, New Zealand, Chile, Argentina) hire from February–April for the June–October season. Applying early gives you the best shot at staff accommodation and first-choice roles.",
  },
  {
    q: "Do I need a working holiday visa to work at a ski resort?",
    a: "In most cases, yes. If you're not a citizen or permanent resident of the country you want to work in, you'll usually need a working holiday visa or equivalent work permit. Requirements, age limits, and application timelines differ by country — Australia, New Zealand, Canada, and several European countries run generous WHV schemes for eligible applicants. Some resorts also offer visa sponsorship for specialist roles.",
  },
  {
    q: "What types of jobs are available at ski resorts?",
    a: "Common roles include ski and snowboard instruction, lift operations, hospitality (front desk, housekeeping, reservations), food and beverage (chefs, bartenders, servers), retail, rental shop technicians, ski patrol, childcare, and resort operations. Mountain Connects lists roles across all of these categories, so you can filter by what matches your skills.",
  },
  {
    q: "Can I get staff accommodation with a ski resort job?",
    a: "Many seasonal roles include staff accommodation, and most of the rest point you toward subsidised or partnered housing in nearby mountain towns. Look for listings with the Accommodation perk flagged — these include on-mountain staff housing, shared apartments, or rent stipends. Housing availability is tight in most ski towns, so securing a job with housing included is one of the biggest advantages.",
  },
  {
    q: "Is it free to use Mountain Connects?",
    a: "For workers, always. Create a profile, browse every listing, and apply to jobs completely free — no catches. For businesses, your first job post is free forever, with applicant tracking and messaging included. If you need to post more, plans start at $39/month or $149 for a whole season, and every plan comes with a 30-day free trial.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

/* ─── Feature Card (pure server component) ──────────────── */
/* ─── Small pieces used inside the narrow columns ────────
   ⚠️ NOT CARDS. The old page put everything in a bordered, blurred panel,
   which on a page built around one object behind the content means a wall in
   front of it every time. Inside a 400px column a rule and some space
   separate things perfectly well, and the field stays visible. */

function Numbered({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5 border-t border-white/10 pt-5">
      <span className="mt-0.5 shrink-0 text-xs font-semibold tabular-nums tracking-widest text-highlight">
        {n}
      </span>
      <div>
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        <p className="mt-1.5 text-[14px] font-light leading-relaxed text-white/70">{children}</p>
      </div>
    </div>
  );
}

function Listed({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 border-t border-white/10 pt-5">
      <span className="mt-0.5 shrink-0 text-secondary-light">{icon}</span>
      <div>
        <h3 className="text-[15px] font-semibold text-white">{title}</h3>
        <p className="mt-1.5 text-[14px] font-light leading-relaxed text-white/70">{children}</p>
      </div>
    </div>
  );
}

function Arrow() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  HOMEPAGE — Server Component                                */
/* ═══════════════════════════════════════════════════════════ */

export default async function HomePage() {
  // The same counts the metadata uses. This page is already dynamic for the
  // session lookup below, so there is no caching to give up — and the stats
  // bar underneath used to be three numbers typed in by hand.
  const stats = await getPlatformStats();

  // Fetch user role server-side — no client Supabase call needed
  let userRole: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: userData } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      userRole = userData?.role || null;
    }
  } catch {
    // Not logged in — that's fine
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* One particle globe, fixed behind the whole page, driven by scroll.
          Everything below renders over it. */}
      <ParticleGlobe />

      <HeroSection userRole={userRole} />

      {/* ═══ THE FIGURES ═══════════════════════════════════
          ⚠️ COUNTED, NOT TYPED. These read 69 / 12 / 50+ for months while
          the real figures were 111 / 14 / 90 — the same failure /about had,
          on a page with far more traffic. A zero means the query failed and
          renders "—" rather than animating to nought. See
          lib/stats/platform-stats.ts. */}
      <section className="relative flex min-h-[70vh] items-center px-6 py-24 md:px-12">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="grid grid-cols-2 gap-y-16 md:grid-cols-4">
            {[
              { value: stats.resorts, label: "Ski Resorts" },
              { value: stats.countries, label: "Countries" },
              { value: stats.towns, label: "Mountain Towns" },
              { value: null, text: "Free", label: "To Join" },
            ].map((stat) => (
              <RiseIn key={stat.label} className="text-center">
                <p className="text-5xl font-semibold tracking-tight text-white md:text-7xl">
                  {stat.value === null ? (
                    stat.text
                  ) : stat.value > 0 ? (
                    <AnimatedCounter target={stat.value} suffix="" />
                  ) : (
                    formatStat(stat.value)
                  )}
                </p>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-highlight/80">
                  {stat.label}
                </p>
              </RiseIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ THE ARGUMENT — three half-screen statements ════
          This is the shape Dala uses between its narrow columns, and the
          reason it works is that each one is short enough to take in at a
          glance and then gets a whole half-screen to itself.

          ⚠️ EVERY ONE OF THESE IS CHECKABLE. The first describes where the
          listings on this board actually come from — scripts/fb-monitor
          scrapes mountain-town Facebook groups nightly, which is precisely
          "advertised in Facebook groups". The third says "what each advert
          says about" pay, housing and a pass rather than claiming the board
          has those fields filled in: as of migration 00114/00115 a ski pass
          is stated on 47 of 355 listings and housing on 148, so a promise
          that every listing states them would be false on most of the board.
          See CLAUDE.md. */}
      {/* ⚠️ ALL THREE ARE <p>, NOT HEADINGS. The first was briefly an h2,
          which took the page's heading count from 7 to 8 and put a sentence
          with no section under it into the document outline. These three are
          one continuous thought that happens to be set large — the size is
          typographic, and the outline should not pretend otherwise. */}
      <Statement>
        <SplitLines
          as="p"
          text="Seasonal work gets advertised in Facebook groups, on noticeboards, and by word of mouth."
          className="text-[28px] font-normal leading-[1.2] tracking-tight text-white md:text-[44px]"
        />
      </Statement>

      <Statement>
        <SplitLines
          as="p"
          text="Scattered across a hundred mountain towns, in a dozen countries, on the other side of the world from the people who want them."
          className="text-[28px] font-normal leading-[1.2] tracking-tight text-white/85 md:text-[44px]"
        />
      </Statement>

      <Statement>
        <SplitLines
          as="p"
          text="We gather them into one place — with what each advert actually says about pay, housing and a pass."
          className="text-[28px] font-normal leading-[1.2] tracking-tight text-white md:text-[44px]"
        />
      </Statement>

      {/* ═══ HOW IT WORKS — narrow column, RIGHT ═══════════ */}
      <Column side="right">
        <Eyebrow>How It Works</Eyebrow>
        <SplitLines
          as="h2"
          text="Your journey to the mountains"
          highlight="mountains"
          className="mt-4 text-[34px] font-semibold leading-[1.15] tracking-tight text-white md:text-[42px]"
        />
        <SplitLines
          as="p"
          text="Three simple steps to finding your next seasonal adventure."
          delayMs={120}
          className="mt-5 text-[17px] font-light leading-relaxed text-white/75"
        />

        <div className="mt-10 space-y-6">
          <RiseIn delayMs={0}>
            <Numbered n="01" title="Build Your Profile">
              Create a standout work profile showcasing your experience, skills, and availability
              for the season.
            </Numbered>
          </RiseIn>
          {/* NOT "verified jobs": no live listing belongs to a verified business
              (0 of 341 on 2026-10-10), so the word was false on the busiest page
              on the site, and Bing's AI was quoting it. NOT "apply instantly"
              either — 335 of 341 listings are unclaimed imports that take an
              anonymous form. */}
          <RiseIn delayMs={90}>
            <Numbered n="02" title="Discover & Apply">
              Browse seasonal jobs at resorts worldwide. Filter by location, role and perks, and
              apply straight from the listing.
            </Numbered>
          </RiseIn>
          <RiseIn delayMs={180}>
            <Numbered n="03" title="Start Your Season">
              Get hired, schedule interviews, and prepare for your mountain adventure.
            </Numbered>
          </RiseIn>
        </div>
      </Column>

      {/* ═══ DISCOVER RESORTS — narrow column, LEFT ════════
          ⚠️ THE TWO STOCK MOUNTAIN PHOTOS THAT USED TO SIT HERE ARE GONE ON
          DESKTOP, and that is the point rather than a saving. They were two
          opaque panels directly over the particle field, so the one beat
          where the cloud becomes a mountain range was covered by a picture of
          a mountain range. The mobile stack below keeps its image, since
          there is no particle field there. */}
      <Column side="left">
        <Eyebrow>Discover Resorts</Eyebrow>
        <SplitLines
          as="h2"
          text="World-class resorts, one platform"
          highlight="one platform"
          className="mt-4 text-[34px] font-semibold leading-[1.15] tracking-tight text-white md:text-[42px]"
        />
        <SplitLines
          as="p"
          text="From the powdery slopes of Niseko to the legendary runs of Chamonix — explore detailed resort profiles, staff information, and live job openings all in one place."
          delayMs={120}
          className="mt-5 text-[17px] font-light leading-relaxed text-white/75"
        />

        <RiseIn delayMs={60}>
          <div className="mt-9 space-y-3.5">
            {[
              "Detailed resort profiles with terrain stats",
              "Staff housing & living cost information",
              "Direct links to the businesses hiring",
              "Interactive 3D globe explorer",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <svg
                  className="h-3.5 w-3.5 shrink-0 text-secondary-light"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[14px] font-light text-white/75">{item}</span>
              </div>
            ))}
          </div>

          <Link
            href="/explore"
            className="mt-9 inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3 text-[13px] font-semibold text-white transition-all hover:bg-white hover:text-primary"
          >
            Explore All Resorts
            <Arrow />
          </Link>
        </RiseIn>

        {/* Mobile keeps one real photograph: there is no particle field on a
            phone for it to cover. */}
        <RiseIn delayMs={120}>
          <div className="relative mt-12 block md:hidden">
            <div className="relative h-56 w-full overflow-hidden rounded-2xl shadow-xl">
              <Image
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"
                alt="Mountain panorama"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
            </div>
            <div className="absolute -bottom-4 left-4 z-20 rounded-xl bg-white p-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10">
                  <span className="text-base">🏔️</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">
                    {formatStat(stats.resorts)} Resorts
                  </p>
                  <p className="text-xs text-foreground/50">
                    {formatStat(stats.countries)} Countries
                  </p>
                </div>
              </div>
            </div>
          </div>
        </RiseIn>
      </Column>

      {/* ═══ PLATFORM FEATURES — narrow column, RIGHT ══════ */}
      <Column side="right">
        <Eyebrow>Platform Features</Eyebrow>
        <SplitLines
          as="h2"
          text="Everything you need for seasonal success"
          highlight="seasonal success"
          className="mt-4 text-[34px] font-semibold leading-[1.15] tracking-tight text-white md:text-[42px]"
        />

        <div className="mt-10 space-y-6">
          {/* NOT "one profile, unlimited applications": that is true for the
              ~2% of listings with a claimed business behind them. The same
              claim was stripped from /go-for-a-season and /signup before
              launch; the homepage was missed. */}
          <RiseIn delayMs={0}>
            <Listed
              title="Smart Profiles"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            >
              Keep every job you save in one place, with your skills, certifications and seasonal
              experience ready to go.
            </Listed>
          </RiseIn>

          {/* No figure here on purpose: this is static JSX and cannot await
              the live count, and a number typed in is a number that goes
              stale. See generateMetadata above. */}
          <RiseIn delayMs={80}>
            <Listed
              title="Global Resorts"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              Explore ski resorts around the world with our interactive 3D globe.
            </Listed>
          </RiseIn>

          {/* NOT "Verified Jobs" / "Every listing from verified businesses":
              ZERO of 341 live listings belong to a verified business.
              Verification is a trust signal a business can earn, never a gate
              anything passes through — see CLAUDE.md, "Business Registration
              Flow". What IS true is that the board shows you which is which. */}
          <RiseIn delayMs={160}>
            <Listed
              title="Clear Listings"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            >
              Accommodation, pay and perks upfront — and you can see which businesses are verified
              and which aren&apos;t yet.
            </Listed>
          </RiseIn>

          <RiseIn delayMs={240}>
            <Listed
              title="Video Interviews"
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
            >
              Built-in video calls for interviews. No extra apps needed — just click and connect.
            </Listed>
          </RiseIn>
        </div>
      </Column>

      {/* ═══ FOR BUSINESSES — narrow column, LEFT ══════════ */}
      <Column side="left">
        <Eyebrow>For Businesses</Eyebrow>
        <SplitLines
          as="h2"
          text="Hire seasonal staff with confidence"
          highlight="with confidence"
          className="mt-4 text-[34px] font-semibold leading-[1.15] tracking-tight text-white md:text-[42px]"
        />
        <SplitLines
          as="p"
          text="Post jobs, get verified, and connect with qualified seasonal workers from around the world. Streamline your hiring with video interviews and applicant tracking."
          delayMs={120}
          className="mt-5 text-[17px] font-light leading-relaxed text-white/75"
        />

        <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6">
          {[
            { icon: "📋", title: "Post Jobs", desc: "Create detailed listings in minutes" },
            { icon: "✅", title: "Get Verified", desc: "Build trust with job seekers" },
            { icon: "📊", title: "Track Applicants", desc: "Manage your hiring pipeline" },
            { icon: "🎥", title: "Video Interviews", desc: "Interview candidates remotely" },
          ].map((item, i) => (
            <RiseIn key={item.title} delayMs={i * 70}>
              <div className="border-t border-white/10 pt-4">
                <span className="text-xl">{item.icon}</span>
                <h3 className="mt-2 text-[14px] font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-[13px] font-light text-white/65">{item.desc}</p>
              </div>
            </RiseIn>
          ))}
        </div>

        <RiseIn delayMs={280}>
          <Link
            href="/signup"
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13px] font-semibold text-primary transition-all hover:shadow-lg hover:shadow-white/10"
          >
            Register Your Business
            <Arrow />
          </Link>
        </RiseIn>
      </Column>

      {/* ═══ WHY — a wide breather between the columns ═════ */}
      {/* A Band, not a plain section: this is where the chairlift formation
          lands, and a full-width card row needs ground under it that a side
          scrim cannot give. See app/(public)/home/Beats.tsx. */}
      <Band>
        <div className="contents">
          <div className="text-center">
            <Eyebrow>Why Mountain Connects</Eyebrow>
            <SplitLines
              as="h2"
              text="Built for the mountain community"
              highlight="mountain community"
              className="mx-auto mt-4 max-w-2xl text-[30px] font-semibold leading-[1.15] tracking-tight text-white md:text-[44px]"
            />
            <SplitLines
              as="p"
              text="Everything you need to find your next season or hire your next team."
              delayMs={140}
              className="mx-auto mt-5 max-w-xl text-[17px] font-light leading-relaxed text-white/75"
            />
          </div>

          <div className="mt-16 grid gap-10 md:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-5 w-5 text-secondary-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: "Global Resort Network",
                description:
                  "Browse jobs at ski resorts worldwide — from the Alps to the Rockies to Japan.",
              },
              {
                icon: (
                  <svg className="h-5 w-5 text-secondary-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                // NOT "Every business is reviewed before going live" — the
                // opposite is true by design: a business can publish
                // immediately and verification is a badge it earns afterwards.
                title: "Know Who's Hiring",
                description:
                  "Verified businesses carry a badge, and the ones that aren't yet are marked so you know. Positions show housing, ski passes and perks.",
              },
              {
                icon: (
                  <svg className="h-5 w-5 text-secondary-light" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                ),
                title: "Smart Job Alerts",
                description:
                  "Set up job alerts and get notified the moment new roles match your skills and preferred resorts.",
              },
            ].map((card, i) => (
              <RiseIn key={card.title} delayMs={i * 90}>
                <div className="border-t border-white/15 pt-6">
                  {card.icon}
                  <h3 className="mt-4 text-[16px] font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-[14px] font-light leading-relaxed text-white/70">
                    {card.description}
                  </p>
                </div>
              </RiseIn>
            ))}
          </div>
        </div>
      </Band>

      {/* ═══ FAQ ═══════════════════════════════════════════ */}
      <section className="relative px-6 py-28 md:px-12">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <Eyebrow>Common Questions</Eyebrow>
            <SplitLines
              as="h2"
              text="Seasonal ski work, answered"
              highlight="answered"
              className="mt-4 text-[30px] font-semibold leading-[1.15] tracking-tight text-white md:text-[44px]"
            />
            <SplitLines
              as="p"
              text="Everything you need to know before applying for a seasonal role — or posting one."
              delayMs={140}
              className="mx-auto mt-5 max-w-xl text-[17px] font-light leading-relaxed text-white/75"
            />
          </div>

          <div className="mt-14 divide-y divide-white/10 border-y border-white/10">
            {faqItems.map(({ q, a }, i) => (
              <RiseIn key={i} delayMs={Math.min(i, 3) * 60}>
                <details className="group py-6">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                    <h3 className="text-[16px] font-semibold text-white">{q}</h3>
                    <svg
                      className="mt-0.5 h-5 w-5 shrink-0 text-white/40 transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-3 max-w-2xl text-[14px] font-light leading-relaxed text-white/72">
                    {a}
                  </p>
                </details>
              </RiseIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA — the closing ask ═════════════════════════ */}
      <section className="relative flex min-h-screen items-center justify-center px-6 py-28">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Ready?</Eyebrow>
          <SplitLines
            as="h2"
            text="Your mountain adventure starts now"
            highlight="starts now"
            className="mt-4 text-[38px] font-semibold leading-[1.1] tracking-tight text-white md:text-[64px]"
          />
          <SplitLines
            as="p"
            text="Join the community of seasonal workers and mountain businesses already on Mountain Connects."
            delayMs={160}
            className="mx-auto mt-6 max-w-lg text-[17px] font-light leading-relaxed text-white/75"
          />
          <RiseIn delayMs={240}>
            <CtaButtons userRole={userRole} variant="bottom" />
          </RiseIn>
        </div>
      </section>
    </>
  );
}

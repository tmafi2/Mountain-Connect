import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { defaultOgImage } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";

/* Client components — only the interactive bits */
import HeroSection from "./home/HeroSection";
import AnimatedCounter from "./home/AnimatedCounter";
import ParallaxImages from "./home/ParallaxImages";
import ScrollAnimationInit from "./home/ScrollAnimationInit";
import CtaButtons from "./home/CtaButtons";

export const metadata: Metadata = {
  title: "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide",
  description:
    "Find seasonal work at ski resorts worldwide. Browse jobs in hospitality, ski instruction, food & beverage, retail, and more across 69+ resorts in 12 countries.",
  alternates: { canonical: "https://www.mountainconnects.com" },
  openGraph: {
    title: "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide",
    description:
      "Find seasonal work at ski resorts worldwide. Browse jobs across 69+ resorts in 12 countries.",
    url: "https://www.mountainconnects.com",
    siteName: "Mountain Connects",
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide",
    description:
      "Find seasonal work at ski resorts worldwide. Browse jobs across 69+ resorts in 12 countries.",
    images: [defaultOgImage.url],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Mountain Connects",
  url: "https://www.mountainconnects.com",
  description:
    "Mountain Connects is a seasonal worker platform connecting workers with ski resort businesses worldwide.",
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    email: "notifications@mountainconnects.com",
    contactType: "customer support",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Mountain Connects",
  url: "https://www.mountainconnects.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://www.mountainconnects.com/jobs?search={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

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
    a: "Yes. Workers can create a profile, browse every listing, and apply to jobs completely free. Businesses can post listings and manage applicants without any subscription fees. We're focused on making seasonal hiring frictionless for both sides.",
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
function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: string;
}) {
  return (
    <div className={`animate-on-scroll ${delay} group relative overflow-hidden rounded-2xl border border-accent/50 bg-white p-8 hover-lift`}>
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-highlight/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/10 to-highlight/10 text-secondary transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-secondary/20">
          {icon}
        </div>
        <h3 className="mt-5 text-lg font-bold text-primary">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground/70">{description}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  HOMEPAGE — Server Component                                */
/* ═══════════════════════════════════════════════════════════ */

export default async function HomePage() {
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Initialise scroll-triggered CSS animations */}
      <ScrollAnimationInit />

      {/* ═══ HERO — Client component (needs scroll + mount state) ═══ */}
      <HeroSection userRole={userRole} />

      {/* ═══ STATS BAR ═════════════════════════════════════ */}
      <section className="relative -mt-16 z-20 mx-auto max-w-6xl px-6">
        <div className="animate-on-scroll-scale rounded-2xl border border-accent/30 bg-white p-8 shadow-xl shadow-primary/5">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: 69, suffix: "", label: "Ski Resorts" },
              { value: 12, suffix: "", label: "Countries" },
              { value: 50, suffix: "+", label: "Mountain Towns" },
              { value: null, text: "Free", label: "To Join" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold text-primary md:text-4xl">
                  {stat.value !== null ? (
                    <AnimatedCounter target={stat.value} suffix={stat.suffix || ""} />
                  ) : (
                    stat.text
                  )}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground/50">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ══════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-6 py-28">
        <div className="animate-on-scroll text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-secondary">How It Works</span>
          <h2 className="mt-3 text-4xl font-extrabold text-primary md:text-5xl">
            Your journey to the
            <span className="text-gradient"> mountains</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-foreground/60">
            Three simple steps to finding your next seasonal adventure.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Build Your Profile",
              desc: "Create a standout work profile showcasing your experience, skills, and availability for the season.",
              color: "from-secondary to-secondary-light",
            },
            {
              step: "02",
              title: "Discover & Apply",
              desc: "Browse verified jobs at world-class resorts. Filter by location, role, perks, and apply instantly.",
              color: "from-highlight to-cyan-300",
            },
            {
              step: "03",
              title: "Start Your Season",
              desc: "Get hired, schedule interviews, and prepare for your mountain adventure.",
              color: "from-warm to-orange-400",
            },
          ].map((item, i) => (
            <div
              key={item.step}
              className={`animate-on-scroll delay-${(i + 1) * 200} group relative`}
            >
              {i < 2 && (
                <div className="absolute top-12 left-[calc(50%+60px)] hidden h-[2px] w-[calc(100%-120px)] bg-gradient-to-r from-accent to-transparent md:block" />
              )}
              <div className="relative rounded-2xl border border-accent/30 bg-white p-8 text-center transition-all hover-lift">
                <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-white shadow-lg`}>
                  <span className="text-3xl font-extrabold">{item.step}</span>
                </div>
                <h3 className="mt-6 text-xl font-bold text-primary">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground/60">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FEATURES ══════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-primary py-28">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-secondary/5 blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-highlight/5 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="animate-on-scroll text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-secondary">Platform Features</span>
            <h2 className="mt-3 text-4xl font-extrabold text-white md:text-5xl">
              Everything you need for
              <br />
              <span className="text-gradient">seasonal success</span>
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              delay="delay-100"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              title="Smart Profiles"
              description="One profile, unlimited applications. Showcase your skills, certifications, and seasonal experience."
            />
            <FeatureCard
              delay="delay-200"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Global Resorts"
              description="Explore 50+ ski resorts across 12 countries with our interactive 3D globe."
            />
            <FeatureCard
              delay="delay-300"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
              title="Verified Jobs"
              description="Every listing from verified businesses. Accommodation, pay, perks — all upfront."
            />
            <FeatureCard
              delay="delay-400"
              icon={
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
              title="Video Interviews"
              description="Built-in video calls for interviews. No extra apps needed — just click and connect."
            />
          </div>
        </div>
      </section>

      {/* ═══ RESORT SHOWCASE — Parallax image strip ════════ */}
      <section className="relative overflow-hidden py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* Left — Text */}
            <div className="animate-on-scroll-left">
              <span className="text-sm font-bold uppercase tracking-widest text-secondary">Discover Resorts</span>
              <h2 className="mt-3 text-4xl font-extrabold text-primary md:text-5xl">
                World-class resorts,
                <br />
                <span className="text-gradient">one platform</span>
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-foreground/60">
                From the powdery slopes of Niseko to the legendary runs of Chamonix — explore detailed resort profiles, staff information, and live job openings all in one place.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  "Detailed resort profiles with terrain stats",
                  "Staff housing & living cost information",
                  "Direct links to verified employers",
                  "Interactive 3D globe explorer",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/10">
                      <svg className="h-3.5 w-3.5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-foreground/70">{item}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/explore"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-primary/20"
              >
                Explore All Resorts
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Right — Image stack */}
            <div className="animate-on-scroll-right relative">
              <div className="relative mx-auto max-w-md">
                {/* Mobile: Single clean image */}
                <div className="block lg:hidden">
                  <div className="relative h-64 w-full overflow-hidden rounded-2xl shadow-xl sm:h-72">
                    <Image
                      src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"
                      alt="Mountain panorama"
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent" />
                  </div>
                  <div className="absolute -bottom-4 left-4 z-20 rounded-xl bg-white p-3 shadow-xl sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/10 sm:h-10 sm:w-10">
                        <span className="text-base sm:text-lg">🏔️</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">50+ Resorts</p>
                        <p className="text-xs text-foreground/50">12 Countries</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop: Parallax stacked cards (client component) */}
                <div className="hidden lg:block">
                  <ParallaxImages />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOR BUSINESSES ════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-light to-primary py-28">
        <div className="absolute inset-0 shimmer" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* Left — Cards */}
            <div className="animate-on-scroll-left order-2 lg:order-1">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { icon: "📋", title: "Post Jobs", desc: "Create detailed listings in minutes" },
                  { icon: "✅", title: "Get Verified", desc: "Build trust with job seekers" },
                  { icon: "📊", title: "Track Applicants", desc: "Manage your hiring pipeline" },
                  { icon: "🎥", title: "Video Interviews", desc: "Interview candidates remotely" },
                ].map((item, i) => (
                  <div
                    key={item.title}
                    className={`animate-on-scroll delay-${(i + 1) * 100} glass rounded-xl p-5 transition-all hover:bg-white/10`}
                  >
                    <span className="text-2xl">{item.icon}</span>
                    <h4 className="mt-3 text-sm font-bold text-white">{item.title}</h4>
                    <p className="mt-1 text-xs text-white/50">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Text */}
            <div className="animate-on-scroll-right order-1 lg:order-2">
              <span className="text-sm font-bold uppercase tracking-widest text-secondary">For Businesses</span>
              <h2 className="mt-3 text-4xl font-extrabold text-white md:text-5xl">
                Hire seasonal staff
                <br />
                <span className="text-gradient">with confidence</span>
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-white/50">
                Post jobs, get verified, and connect with qualified seasonal workers from around the world. Streamline your hiring with video interviews and applicant tracking.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary transition-all hover:shadow-lg hover:shadow-white/10"
              >
                Register Your Business
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Why Mountain Connects ═══════════════════════════ */}
      <section className="relative py-24 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center animate-on-scroll">
            <span className="text-sm font-bold uppercase tracking-widest text-secondary">Why Mountain Connects</span>
            <h2 className="mt-3 text-4xl font-extrabold text-primary md:text-5xl">
              Built for the mountain community
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-foreground/60">
              Everything you need to find your next season or hire your next team
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-6 w-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: "Global Resort Network",
                description: "Browse jobs at 69 ski resorts across 12 countries — from the Alps to the Rockies to Japan.",
              },
              {
                icon: (
                  <svg className="h-6 w-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: "Verified Businesses",
                description: "Every business is reviewed before going live. See real positions with details on housing, ski passes, and perks.",
              },
              {
                icon: (
                  <svg className="h-6 w-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                ),
                title: "Smart Job Alerts",
                description: "Set up job alerts and get notified the moment new roles match your skills and preferred resorts.",
              },
            ].map((card, i) => (
              <div
                key={i}
                className="animate-on-scroll rounded-2xl border border-accent/30 bg-gradient-to-b from-white to-background/50 p-6 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                  {card.icon}
                </div>
                <h3 className="mt-4 text-lg font-bold text-primary">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/60">
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FAQ ═══════════════════════════════════════════ */}
      <section className="relative border-t border-accent/30 bg-background py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="animate-on-scroll text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-secondary">
              Common Questions
            </span>
            <h2 className="mt-3 text-4xl font-extrabold text-primary md:text-5xl">
              Seasonal ski work, answered
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-foreground/60">
              Everything you need to know before applying for a seasonal role — or posting one.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {faqItems.map(({ q, a }, i) => (
              <details
                key={i}
                className="animate-on-scroll group rounded-2xl border border-accent/40 bg-white p-6 shadow-sm transition-all open:shadow-md"
              >
                <summary className="flex cursor-pointer items-start justify-between gap-3 list-none">
                  <h3 className="text-base font-bold text-primary">{q}</h3>
                  <svg
                    className="h-5 w-5 shrink-0 text-foreground/40 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-foreground/70">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA — Final section ═══════════════════════════ */}
      <section className="relative overflow-hidden py-28">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="animate-on-scroll-scale">
            <span className="text-sm font-bold uppercase tracking-widest text-secondary">Ready?</span>
            <h2 className="mt-3 text-4xl font-extrabold text-primary md:text-6xl">
              Your mountain adventure
              <br />
              <span className="text-gradient">starts now</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-foreground/60">
              Join the community of seasonal workers and mountain businesses already on Mountain Connects.
            </p>
            <CtaButtons userRole={userRole} variant="bottom" />
          </div>
        </div>
      </section>
    </>
  );
}

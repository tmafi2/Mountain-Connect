"use client";

import Link from "next/link";
import Image from "next/image";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const values = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Global Reach",
    desc: "Connecting workers and businesses across 50+ resorts in 12 countries worldwide.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: "Trust & Verification",
    desc: "Every business is verified. Every listing is real. No scams, no spam — just genuine opportunities.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Seamless Experience",
    desc: "One profile, instant applications, built-in video interviews — everything in one place.",
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    title: "Community First",
    desc: "Built by people who love the mountains. We understand the seasonal lifestyle because we live it.",
  },
];

const workerFeatures = [
  { title: "Smart Profile", desc: "One reusable profile showcasing your skills, experience, and certifications" },
  { title: "Instant Apply", desc: "Apply to multiple jobs across different resorts with a single click" },
  { title: "Global Discovery", desc: "Explore resorts and regions you haven't considered — from the Alps to the Andes" },
  { title: "Track Everything", desc: "Applications, interviews, and offers — all managed in one dashboard" },
];

const businessFeatures = [
  { title: "Verified Listings", desc: "Post jobs visible to qualified workers worldwide with full transparency" },
  { title: "Applicant Pipeline", desc: "Review profiles, shortlist candidates, and manage your hiring funnel" },
  { title: "Video Interviews", desc: "Interview candidates remotely with built-in video calls — no extra tools" },
  { title: "Brand Presence", desc: "Build your employer brand with a verified public profile and photo gallery" },
];

export default function AboutPage() {
  useScrollAnimation();

  return (
    <>
      {/* ═══ HERO ══════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-primary py-28">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-secondary/5 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-highlight/5 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 text-center">
          <span className="inline-block text-sm font-bold uppercase tracking-widest text-secondary">About Us</span>
          <h1 className="mt-4 text-5xl font-extrabold leading-tight text-white md:text-6xl">
            Connecting people with
            <br />
            <span className="text-gradient">mountain adventures</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/50">
            Mountain Connect is the premium platform bridging the gap between seasonal workers seeking their next adventure and ski resort businesses looking for reliable staff.
          </p>
        </div>
      </section>

      {/* ═══ MISSION — Split layout ════════════════════════ */}
      <section className="mx-auto max-w-7xl px-6 py-28">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Image */}
          <div className="animate-on-scroll-left relative">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&q=80"
                alt="Mountain village in winter"
                width={800}
                height={500}
                className="h-[400px] w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
            </div>
            {/* Floating stat */}
            <div className="absolute -bottom-6 -right-6 rounded-xl bg-white p-5 shadow-xl animate-float">
              <p className="text-3xl font-extrabold text-primary">69</p>
              <p className="text-sm text-foreground/50">Ski Resorts</p>
            </div>
          </div>

          {/* Text */}
          <div className="animate-on-scroll-right">
            <span className="text-sm font-bold uppercase tracking-widest text-secondary">Our Mission</span>
            <h2 className="mt-3 text-4xl font-extrabold text-primary">
              Making seasonal work
              <br />
              <span className="text-gradient">simple and accessible</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-foreground/60">
              Every ski season, thousands of businesses need reliable staff, and thousands of workers are searching for their next mountain adventure. Mountain Connect bridges this gap with a streamlined platform that saves time for both sides.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-foreground/60">
              We believe everyone deserves the chance to experience life in the mountains — whether it&apos;s your first season or your tenth. Our platform removes the barriers and connects you directly with verified opportunities.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ VALUES ════════════════════════════════════════ */}
      <section className="bg-background py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="animate-on-scroll text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-secondary">What Drives Us</span>
            <h2 className="mt-3 text-4xl font-extrabold text-primary">
              Built on values that
              <span className="text-gradient"> matter</span>
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <div
                key={v.title}
                className={`animate-on-scroll delay-${(i + 1) * 100} group rounded-2xl border border-accent/30 bg-white p-7 hover-lift`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/10 to-highlight/10 text-secondary transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-secondary/20">
                  {v.icon}
                </div>
                <h3 className="mt-5 text-lg font-bold text-primary">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/60">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOR WORKERS ══════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-6 py-28">
        <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
          {/* Text */}
          <div className="animate-on-scroll-left">
            <span className="text-sm font-bold uppercase tracking-widest text-secondary">For Workers</span>
            <h2 className="mt-3 text-4xl font-extrabold text-primary">
              Your season,
              <span className="text-gradient"> your way</span>
            </h2>
            <p className="mt-4 text-foreground/60">
              Whether you&apos;re chasing powder in Japan or sunshine in New Zealand, we make finding seasonal work effortless.
            </p>

            <div className="mt-8 space-y-5">
              {workerFeatures.map((f, i) => (
                <div key={f.title} className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-sm font-bold text-secondary">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h4 className="font-bold text-primary">{f.title}</h4>
                    <p className="mt-1 text-sm text-foreground/50">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-primary/20"
            >
              Create Your Profile
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Image */}
          <div className="animate-on-scroll-right relative">
            <div className="overflow-hidden rounded-2xl shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=800&q=80"
                alt="Skier on mountain"
                width={800}
                height={500}
                className="h-[400px] w-full object-cover"
              />
            </div>
            {/* Floating badge */}
            <div className="absolute -left-6 top-8 rounded-xl bg-white p-4 shadow-xl animate-float">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                  <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">50+ Towns</p>
                  <p className="text-xs text-foreground/50">Mountain communities</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOR BUSINESSES ═══════════════════════════════ */}
      <section className="relative overflow-hidden bg-primary py-28">
        <div className="absolute inset-0 shimmer" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 h-96 w-96 rounded-full bg-secondary/5 blur-[100px]" />
          <div className="absolute bottom-0 right-1/3 h-96 w-96 rounded-full bg-highlight/5 blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6" id="business">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
            {/* Cards */}
            <div className="animate-on-scroll-left order-2 lg:order-1">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {businessFeatures.map((f, i) => (
                  <div
                    key={f.title}
                    className={`animate-on-scroll delay-${(i + 1) * 100} glass rounded-xl p-6 transition-all hover:bg-white/10`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-secondary">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <h4 className="mt-4 font-bold text-white">{f.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-white/40">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Text */}
            <div className="animate-on-scroll-right order-1 lg:order-2">
              <span className="text-sm font-bold uppercase tracking-widest text-secondary">For Businesses</span>
              <h2 className="mt-3 text-4xl font-extrabold text-white">
                Hire with
                <span className="text-gradient"> confidence</span>
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-white/50">
                Stop spending hours on job boards and recruitment agencies. Mountain Connect gives you direct access to a global pool of experienced seasonal workers — all verified and ready to go.
              </p>
              <p className="mt-4 text-lg leading-relaxed text-white/50">
                From posting your first listing to making your final hire, our platform handles every step of the process.
              </p>
              <Link
                href="/signup?role=business"
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

      {/* ═══ STATS STRIP ═════════════════════════════════ */}
      <section className="border-y border-accent/30 bg-white py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="animate-on-scroll-scale grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { value: "69", label: "Ski Resorts" },
              { value: "12", label: "Countries" },
              { value: "50+", label: "Mountain Towns" },
              { value: "Free", label: "To Join" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-4xl font-extrabold text-primary">{s.value}</p>
                <p className="mt-1 text-sm font-medium text-foreground/40">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CONTACT ═════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-6 py-28" id="contact">
        <div className="animate-on-scroll-scale mx-auto max-w-2xl text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-secondary">Get In Touch</span>
          <h2 className="mt-3 text-4xl font-extrabold text-primary">
            Questions? Let&apos;s
            <span className="text-gradient"> talk</span>
          </h2>
          <p className="mt-4 text-foreground/60">
            Whether you&apos;re a worker, a business, or interested in partnering with us — we&apos;d love to hear from you.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <a
              href="mailto:hello@mountainconnects.com"
              className="group flex items-center gap-4 rounded-2xl border border-accent/30 bg-white p-6 transition-all hover-lift"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary transition-all group-hover:scale-110">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-primary">Email Us</p>
                <p className="text-sm text-foreground/50">hello@mountainconnects.com</p>
              </div>
            </a>

            <Link
              href="/signup"
              className="group flex items-center gap-4 rounded-2xl border border-accent/30 bg-white p-6 transition-all hover-lift"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-highlight/10 text-highlight transition-all group-hover:scale-110">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-primary">Join Us</p>
                <p className="text-sm text-foreground/50">Create a free account</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═════════════════════════════════════════ */}
      <section className="bg-gradient-to-br from-primary via-primary-light to-primary py-28">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-4xl font-extrabold text-white md:text-5xl">
            Ready for your next
            <br />
            <span className="text-gradient">mountain chapter?</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/50">
            Join the growing community of seasonal workers and mountain businesses on Mountain Connect.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="group relative overflow-hidden rounded-xl bg-white px-10 py-4 text-sm font-bold text-primary shadow-xl transition-all hover:shadow-2xl"
            >
              <span className="relative z-10">Get Started Free</span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-secondary/20 to-highlight/20 transition-transform duration-500 group-hover:translate-x-0" />
            </Link>
            <Link
              href="/jobs"
              className="rounded-xl border border-white/20 bg-white/5 px-10 py-4 text-sm font-bold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10"
            >
              Browse Jobs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

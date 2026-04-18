"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AnimatedCounter from "../home/AnimatedCounter";

type View = "business" | "worker";

interface WelcomeClientProps {
  initialView: View;
}

export default function WelcomeClient({ initialView }: WelcomeClientProps) {
  const router = useRouter();
  const [view, setView] = useState<View>(initialView);

  const handleToggle = (next: View) => {
    if (next === view) return;
    setView(next);
    // Reflect state in the URL so it's shareable/bookmarkable, without adding
    // a history entry on every toggle press.
    router.replace(`/welcome?view=${next}`, { scroll: false });
  };

  const isBusiness = view === "business";

  return (
    <div className="min-h-screen bg-background">
      {/* ────────────────────────────────────────────────────────── */}
      {/*  Sticky Toggle Bar                                          */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 border-b border-accent/40 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-bold text-primary hover:text-secondary transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l5-10 5 7 3-5 5 8H3z" />
            </svg>
            <span className="hidden sm:inline">Mountain Connects</span>
          </Link>

          {/* Toggle */}
          <div
            role="tablist"
            aria-label="Switch audience"
            className="flex items-center rounded-xl border border-accent/60 bg-accent/20 p-1"
          >
            <button
              role="tab"
              aria-selected={isBusiness}
              onClick={() => handleToggle("business")}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all sm:text-sm sm:px-5 sm:py-2 ${
                isBusiness
                  ? "bg-white text-primary shadow-sm"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              For Businesses
            </button>
            <button
              role="tab"
              aria-selected={!isBusiness}
              onClick={() => handleToggle("worker")}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all sm:text-sm sm:px-5 sm:py-2 ${
                !isBusiness
                  ? "bg-white text-primary shadow-sm"
                  : "text-foreground/60 hover:text-foreground"
              }`}
            >
              For Workers
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/*  Hero                                                       */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-light to-primary" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-secondary/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-72 w-72 rounded-full bg-highlight/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/3 top-1/4 h-52 w-52 rounded-full bg-secondary-light/8 blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse" />
            {isBusiness ? "For Ski Resort Businesses" : "For Seasonal Workers"}
          </span>

          {isBusiness ? (
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl">
              Hire better seasonal staff,
              <br />
              <span className="text-gradient">faster.</span>
            </h1>
          ) : (
            <h1 className="text-4xl font-extrabold text-white sm:text-5xl md:text-6xl">
              Find your season
              <br />
              <span className="text-gradient">on the slopes.</span>
            </h1>
          )}

          <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
            {isBusiness
              ? "Post jobs, screen applicants, run interviews, and sign contracts — all in one place. Built for ski-resort businesses."
              : "One profile. Unlimited applications to seasonal jobs at 69 ski resorts across 12 countries."}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href={isBusiness ? "/signup?role=business" : "/signup"}
              className="group relative overflow-hidden rounded-xl bg-white px-8 py-4 text-sm font-bold text-primary shadow-2xl shadow-black/30 transition-all hover:-translate-y-0.5 sm:text-base"
            >
              <span className="relative z-10 flex items-center gap-2">
                {isBusiness ? "Post your first job" : "Build your profile"}
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </Link>
            <Link
              href={isBusiness ? "/employers" : "/jobs"}
              className="rounded-xl border-2 border-white/20 px-8 py-4 text-sm font-bold text-white/90 transition-all hover:border-white/40 hover:bg-white/5 sm:text-base"
            >
              {isBusiness ? "See verified employers" : "Browse jobs"}
            </Link>
          </div>

          <p className="mt-6 text-xs text-white/50">
            Free to get started · No credit card required
          </p>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/*  Stats                                                      */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <StatBlock target={69} suffix="+" label="Ski Resorts" />
            <StatBlock target={12} suffix="" label="Countries" />
            <StatBlock target={50} suffix="+" label="Resort Towns" />
            <StatBlock target={100} suffix="%" label="Free to start" />
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/*  Features                                                   */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
              Everything you need
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-primary sm:text-4xl">
              {isBusiness ? "Built for how you actually hire" : "Built for how you actually find work"}
            </h2>
            <p className="mt-3 text-sm text-foreground/60 sm:text-base">
              {isBusiness
                ? "Stop juggling spreadsheets, email threads, and random Zoom links. Your whole seasonal hiring workflow — in one place."
                : "No more emailing 20 resorts. No more lost applications. Everything you need to land a season, in one place."}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(isBusiness ? BUSINESS_FEATURES : WORKER_FEATURES).map((feat) => (
              <FeatureCard key={feat.title} {...feat} />
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/*  How It Works                                               */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="bg-primary py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary-light/80">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
              Up and running in minutes
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-4">
            {(isBusiness ? BUSINESS_STEPS : WORKER_STEPS).map((step, i) => (
              <Step key={step.title} number={i + 1} title={step.title} description={step.description} />
            ))}
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/*  Final CTA                                                  */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-extrabold text-primary sm:text-4xl">
            {isBusiness ? "Ready to fill your seasonal roster?" : "Ready for your next season?"}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-foreground/60 sm:text-base">
            {isBusiness
              ? "Join ski resort businesses around the world already hiring on Mountain Connects."
              : "Join thousands of seasonal workers finding their next mountain adventure."}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href={isBusiness ? "/signup?role=business" : "/signup"}
              className="group rounded-xl bg-primary px-10 py-4 text-sm font-bold text-white shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/30 sm:text-base"
            >
              <span className="flex items-center gap-2">
                {isBusiness ? "Create your business account" : "Create your free account"}
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </span>
            </Link>
            <button
              onClick={() => handleToggle(isBusiness ? "worker" : "business")}
              className="rounded-xl border-2 border-primary/10 px-8 py-4 text-sm font-bold text-primary/80 transition-all hover:border-primary/30 hover:bg-primary/5 sm:text-base"
            >
              {isBusiness ? "I'm a worker instead →" : "I'm a business instead →"}
            </button>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────────── */}
      {/*  Trust footer                                               */}
      {/* ────────────────────────────────────────────────────────── */}
      <section className="bg-white border-t border-accent/40 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-6 text-center sm:grid-cols-3 sm:text-left">
            <TrustBlock
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Verified businesses only"
              description="Every employer is manually vetted before going live."
            />
            <TrustBlock
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Free to get started"
              description="No credit card. Upgrade only if you outgrow the free tier."
            />
            <TrustBlock
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Global reach"
              description="Resorts and workers across Australia, NZ, Canada, USA, Japan, Europe & more."
            />
          </div>
          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-accent/30 pt-6 sm:flex-row">
            <p className="text-xs text-foreground/50">
              © {new Date().getFullYear()} Mountain Connects. Seasonal jobs, simplified.
            </p>
            <div className="flex items-center gap-4 text-xs text-foreground/50">
              <Link href="/" className="hover:text-primary transition-colors">Home</Link>
              <Link href="/jobs" className="hover:text-primary transition-colors">Jobs</Link>
              <Link href="/employers" className="hover:text-primary transition-colors">Employers</Link>
              <Link href="/about" className="hover:text-primary transition-colors">About</Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */
/*  Sub-components                                                */
/* ───────────────────────────────────────────────────────────── */

function StatBlock({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-4xl font-extrabold text-primary sm:text-5xl">
        <AnimatedCounter target={target} suffix={suffix} />
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-foreground/50 sm:text-sm">
        {label}
      </p>
    </div>
  );
}

function FeatureCard({ icon, title, description, accent }: FeatureItem) {
  const accentClass =
    accent === "secondary"
      ? "bg-secondary/10 text-secondary"
      : accent === "highlight"
      ? "bg-highlight/15 text-highlight"
      : accent === "warm"
      ? "bg-warm/15 text-warm"
      : "bg-primary/10 text-primary";

  return (
    <div className="group rounded-2xl border border-accent/50 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-secondary/40 hover:shadow-lg hover:shadow-secondary/5">
      <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${accentClass} transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <h3 className="text-base font-bold text-primary sm:text-lg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/60">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-highlight text-sm font-extrabold text-white shadow-lg shadow-secondary/30">
        {number}
      </div>
      <h3 className="text-base font-bold text-white sm:text-lg">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{description}</p>
    </div>
  );
}

function TrustBlock({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 sm:flex-col sm:text-left">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
        {icon}
      </div>
      <div className="flex-1 text-left">
        <p className="text-sm font-bold text-primary">{title}</p>
        <p className="mt-0.5 text-xs text-foreground/60 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────── */
/*  Feature content                                               */
/* ───────────────────────────────────────────────────────────── */

interface FeatureItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: "secondary" | "highlight" | "warm" | "primary";
}

const BUSINESS_FEATURES: FeatureItem[] = [
  {
    accent: "secondary",
    title: "Post jobs in minutes",
    description: "Rich job listings with pay, housing, perks, and visa options. Save templates to reuse next season with one click.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    accent: "highlight",
    title: "Applicant tracking",
    description: "Every application in one dashboard. Filter, sort, tag, and move candidates through your pipeline.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198A5.971 5.971 0 0112 21a5.971 5.971 0 01-5.999-.281m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    accent: "warm",
    title: "Interviews, built in",
    description: "Schedule interviews, set availability, and run video calls right in the browser. No Zoom link required.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    accent: "secondary",
    title: "Instant live interviews",
    description: "See a candidate you love? Start a live video interview right now — they get a popup to accept or decline.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    accent: "highlight",
    title: "E-signed contracts",
    description: "Upload your PDF contract, worker signs on the platform, and you get a signed copy back. No DocuSign subscription needed.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
  },
  {
    accent: "warm",
    title: "Verified badge + branded profile",
    description: "Stand out with a verified badge. Upload your logo, cover photo, perks, and social links — show workers who you are.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
];

const WORKER_FEATURES: FeatureItem[] = [
  {
    accent: "secondary",
    title: "One profile, unlimited applications",
    description: "Add your skills, certifications, work history, and visa status once. Apply to as many roles as you like.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    accent: "highlight",
    title: "Jobs at 69 resorts worldwide",
    description: "From Thredbo to Whistler to Niseko. Every listing is from a verified business — no scams, no ghost jobs.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
      </svg>
    ),
  },
  {
    accent: "warm",
    title: "Town guides, before you commit",
    description: "50+ resort-town guides with cost of living, housing, transport, and seasonal vibes. Know where you're going.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
  },
  {
    accent: "secondary",
    title: "Track everything in one place",
    description: "Applications, interviews, offers, and contracts — all on your dashboard. Never lose track of a role again.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
  },
  {
    accent: "highlight",
    title: "Video interviews, no downloads",
    description: "Your interviewer sends a link, you click, you're in. Works in any browser. No Zoom, no awkward setup.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    accent: "warm",
    title: "Job alerts + saved jobs",
    description: "Get notified the moment a matching role is posted. Save jobs for later so you never lose a good one.",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
];

const BUSINESS_STEPS = [
  { title: "Sign up and get verified", description: "Create your business account. Our team verifies you within 48 hours so workers trust your listings." },
  { title: "Post a listing", description: "Use a template or start fresh. Publish in minutes — your job goes live to thousands of seasonal workers." },
  { title: "Interview, hire, onboard", description: "Review applicants, run interviews in-browser, send an e-signed contract. Done." },
];

const WORKER_STEPS = [
  { title: "Build your profile", description: "Five minutes. Add your skills, work history, certifications, and what seasons you're available." },
  { title: "Browse and apply", description: "Filter by resort, country, role, housing, pay. Apply with one tap to as many jobs as you like." },
  { title: "Interview → sign → ski", description: "Interview in-browser, sign your contract online, pack your bag. Your season starts here." },
];

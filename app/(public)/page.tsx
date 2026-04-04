"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { createClient } from "@/lib/supabase/client";

/* ─── Animated Counter ───────────────────────────────────── */
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

/* ─── Feature Card ───────────────────────────────────────── */
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
      {/* Hover gradient */}
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
/*  HOMEPAGE                                                   */
/* ═══════════════════════════════════════════════════════════ */

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ role?: string } | null>(null);

  useScrollAnimation();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Check auth state for CTA buttons
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from("users")
          .select("role")
          .eq("id", data.user.id)
          .single()
          .then(({ data: userData }) => {
            setUser({ role: userData?.role || undefined });
          });
      }
    });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const dashboardHref =
    user?.role === "business_owner" ? "/business/dashboard" : "/dashboard";

  return (
    <>
      {/* ═══ HERO — Full-screen video background ═══════════ */}
      <section className="relative h-screen min-h-[700px] overflow-hidden">
        {/* Video background */}
        <div className="absolute inset-0">
          <video
            autoPlay
            muted
            loop
            playsInline
            poster="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80"
            className="h-full w-full object-cover"
            style={{
              transform: `scale(${1 + scrollY * 0.0003}) translateY(${scrollY * 0.2}px)`,
            }}
          >
            <source
              src="https://cdn.coverr.co/videos/coverr-skiing-on-a-snowy-mountain-slope-1711/1080p.mp4"
              type="video/mp4"
            />
          </video>
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/50 to-primary/90" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/60 via-transparent to-transparent" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <div
            className={`transition-all duration-[1500ms] ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-highlight opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-highlight" />
              </span>
              <span className="text-sm font-medium text-white/90">Now connecting resorts worldwide</span>
            </div>
          </div>

          <h1
            className={`max-w-4xl text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-7xl lg:text-8xl transition-all duration-[1500ms] delay-200 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            Find Your Season
            <br />
            <span className="text-gradient">On The Slopes</span>
          </h1>

          <p
            className={`mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70 md:text-xl transition-all duration-[1500ms] delay-400 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            The premium platform connecting seasonal workers with ski resorts and mountain businesses worldwide.
          </p>

          <div
            className={`mt-10 flex flex-wrap items-center justify-center gap-4 transition-all duration-[1500ms] delay-600 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            <Link
              href={user ? dashboardHref : "/signup"}
              className="group relative overflow-hidden rounded-xl bg-white px-8 py-4 text-sm font-bold text-primary shadow-2xl shadow-white/10 transition-all hover:shadow-white/20"
            >
              <span className="relative z-10">{user ? "Go to Dashboard" : "Get Started Free"}</span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-secondary/20 to-highlight/20 transition-transform duration-500 group-hover:translate-x-0" />
            </Link>
            <Link
              href="/explore"
              className="group flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-8 py-4 text-sm font-bold text-white backdrop-blur-sm transition-all hover:border-white/40 hover:bg-white/10"
            >
              Explore Resorts
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Scroll indicator */}
          <div
            className={`absolute bottom-10 left-1/2 -translate-x-1/2 transition-all duration-[2000ms] delay-[1200ms] ${mounted ? "opacity-100" : "opacity-0"}`}
          >
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-widest text-white/40">Scroll</span>
              <div className="h-10 w-[1px] bg-gradient-to-b from-white/40 to-transparent animate-pulse" />
            </div>
          </div>
        </div>
      </section>

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
              {/* Connector line */}
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
        {/* Background effects */}
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
                  {/* Floating badge — mobile */}
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

                {/* Desktop: Parallax stacked cards */}
                <div className="hidden lg:block">
                  {/* Back card */}
                  <div
                    className="absolute -right-4 -top-4 h-72 w-full rounded-2xl shadow-xl overflow-hidden"
                    style={{ transform: `translateY(${scrollY * 0.02}px)` }}
                  >
                    <Image
                      src="https://images.unsplash.com/photo-1551524559-8af4e6624178?w=600&q=80"
                      alt="Ski resort village"
                      fill
                      className="object-cover"
                    />
                  </div>
                  {/* Front card */}
                  <div
                    className="relative z-10 mt-8 ml-4 h-72 w-full rounded-2xl shadow-2xl overflow-hidden"
                    style={{ transform: `translateY(${scrollY * -0.02}px)` }}
                  >
                    <Image
                      src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80"
                      alt="Mountain panorama"
                      fill
                      className="object-cover"
                    />
                  </div>
                  {/* Floating badge — desktop */}
                  <div className="absolute -left-6 bottom-4 z-20 rounded-xl bg-white p-4 shadow-xl animate-float">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                        <span className="text-lg">🏔️</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary">50+ Resorts</p>
                        <p className="text-xs text-foreground/50">12 Countries</p>
                      </div>
                    </div>
                  </div>
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

      {/* ═══ Why Mountain Connect ═══════════════════════════ */}
      <section className="relative py-24 bg-white">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center animate-on-scroll">
            <span className="text-sm font-bold uppercase tracking-widest text-secondary">Why Mountain Connect</span>
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
              Join the community of seasonal workers and mountain businesses already on Mountain Connect.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={user ? dashboardHref : "/signup"}
                className="group relative overflow-hidden rounded-xl bg-primary px-10 py-4 text-sm font-bold text-white shadow-xl shadow-primary/20 transition-all hover:shadow-2xl hover:shadow-primary/30"
              >
                <span className="relative z-10">{user ? "Go to Dashboard" : "Create Free Account"}</span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-secondary/30 to-highlight/30 transition-transform duration-500 group-hover:translate-x-0" />
              </Link>
              <Link
                href="/jobs"
                className="rounded-xl border-2 border-primary/10 px-10 py-4 text-sm font-bold text-primary transition-all hover:border-primary/30 hover:bg-primary/5"
              >
                Browse Jobs
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface HeroSectionProps {
  userRole?: string | null;
}

export default function HeroSection({ userRole }: HeroSectionProps) {
  const [scrollY, setScrollY] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const dashboardHref =
    userRole === "business_owner" ? "/business/dashboard" : "/dashboard";

  return (
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
            href={userRole ? dashboardHref : "/signup"}
            className="group relative overflow-hidden rounded-xl bg-white px-8 py-4 text-sm font-bold text-primary shadow-2xl shadow-white/10 transition-all hover:shadow-white/20"
          >
            <span className="relative z-10">{userRole ? "Go to Dashboard" : "Get Started Free"}</span>
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
  );
}

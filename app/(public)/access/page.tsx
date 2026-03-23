"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AccessPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Invalid access code");
        setCode("");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0e2439] px-4">
      {/* Animated background */}
      <div className="pointer-events-none absolute inset-0">
        {/* Mountain silhouettes */}
        <svg
          className="absolute bottom-0 left-0 w-full"
          viewBox="0 0 1440 500"
          preserveAspectRatio="none"
          style={{ height: "60%" }}
        >
          {/* Far mountains */}
          <path
            d="M0,500 L0,300 L120,200 L200,260 L320,140 L400,220 L480,100 L560,180 L680,60 L760,160 L880,80 L960,200 L1040,120 L1120,220 L1200,140 L1280,200 L1360,160 L1440,240 L1440,500 Z"
            fill="#152d45"
            className={`transition-all duration-[2000ms] ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          />
          {/* Mid mountains */}
          <path
            d="M0,500 L0,350 L100,280 L180,320 L280,220 L380,300 L440,200 L540,280 L640,180 L720,260 L820,200 L920,300 L1000,240 L1100,320 L1180,260 L1280,340 L1360,280 L1440,320 L1440,500 Z"
            fill="#1a3a5c"
            className={`transition-all duration-[2500ms] delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          />
          {/* Near mountains */}
          <path
            d="M0,500 L0,400 L80,360 L160,390 L260,320 L360,380 L440,340 L540,370 L640,300 L720,360 L800,330 L900,380 L980,350 L1080,400 L1160,360 L1260,390 L1340,370 L1440,400 L1440,500 Z"
            fill="#1e4470"
            className={`transition-all duration-[3000ms] delay-500 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          />
          {/* Snow caps on far mountains */}
          <path
            d="M460,100 L480,100 L490,110 L470,110 Z M660,60 L680,60 L695,75 L665,75 Z M860,80 L880,80 L895,95 L865,95 Z M1020,120 L1040,120 L1055,135 L1025,135 Z"
            fill="white"
            opacity="0.3"
            className={`transition-all duration-[2000ms] delay-700 ${mounted ? "opacity-30" : "opacity-0"}`}
          />
        </svg>

        {/* Stars */}
        <div className={`transition-all duration-[3000ms] delay-500 ${mounted ? "opacity-100" : "opacity-0"}`}>
          {[...Array(40)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: `${Math.random() * 2 + 1}px`,
                height: `${Math.random() * 2 + 1}px`,
                top: `${Math.random() * 40}%`,
                left: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.6 + 0.2,
                animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        {/* Aurora / glow effects */}
        <div className={`absolute top-0 left-1/4 h-64 w-96 rounded-full bg-[#a9cbe3]/8 blur-[100px] transition-all duration-[4000ms] ${mounted ? "opacity-100" : "opacity-0"}`} />
        <div className={`absolute top-20 right-1/4 h-48 w-72 rounded-full bg-[#7eb8d8]/6 blur-[80px] transition-all duration-[4000ms] delay-500 ${mounted ? "opacity-100" : "opacity-0"}`} />
      </div>

      {/* Content */}
      <div className={`relative z-10 w-full max-w-lg transition-all duration-[1500ms] ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/images/Logo.jpeg"
            alt="Mountain Connect"
            width={72}
            height={72}
            className="rounded-2xl shadow-2xl ring-2 ring-white/10"
          />
        </div>

        {/* Heading */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#a9cbe3]/70">
            Coming Soon
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-white md:text-5xl">
            Your Next Adventure
            <br />
            <span className="bg-gradient-to-r from-[#a9cbe3] to-[#7eb8d8] bg-clip-text text-transparent">
              Awaits
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/50">
            Mountain Connect is the platform connecting seasonal workers with ski resorts worldwide. We&apos;re putting the finishing touches on something special.
          </p>
        </div>

        {/* Access card */}
        <div className={`mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-sm transition-all duration-[2000ms] delay-300 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#a9cbe3]/10">
              <svg className="h-4 w-4 text-[#a9cbe3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">Early Access</p>
              <p className="text-xs text-white/40">Enter your code to preview the platform</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
                placeholder="Enter access code"
                autoComplete="off"
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder:text-white/25 focus:border-[#a9cbe3]/40 focus:outline-none focus:ring-2 focus:ring-[#a9cbe3]/15 transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2">
                <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="group w-full rounded-xl bg-gradient-to-r from-[#a9cbe3] to-[#8bb8d4] px-4 py-3.5 text-sm font-semibold text-[#0e2439] shadow-lg shadow-[#a9cbe3]/10 transition-all hover:shadow-xl hover:shadow-[#a9cbe3]/20 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Unlock Preview
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Footer tagline */}
        <div className={`mt-8 text-center transition-all duration-[2500ms] delay-700 ${mounted ? "opacity-100" : "opacity-0"}`}>
          <div className="flex items-center justify-center gap-3 text-xs text-white/25">
            <span className="h-px w-8 bg-white/10" />
            Find your season. Find your mountain.
            <span className="h-px w-8 bg-white/10" />
          </div>
        </div>
      </div>

      {/* Twinkle animation */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

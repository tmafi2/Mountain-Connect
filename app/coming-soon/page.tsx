"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import Image from "next/image";

/* ── Waitlist Counter Hook ─────────────────────────────────── */
function useWaitlistCounter(start = 1247) {
  const [count, setCount] = useState(start);

  useEffect(() => {
    const stored = localStorage.getItem("mc-waitlist-count");
    if (stored) setCount(parseInt(stored, 10));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const next = prev + Math.floor(Math.random() * 3) + 1;
        localStorage.setItem("mc-waitlist-count", String(next));
        return next;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return count;
}

/* ── Intersection Observer Hook ────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

/* ── Animated Counter ──────────────────────────────────────── */
function AnimatedStat({ value, label }: { value: string; label: string }) {
  const ref = useReveal();
  return (
    <div ref={ref} className="animate-on-scroll text-center">
      <p className="text-4xl font-extrabold text-white md:text-5xl">{value}</p>
      <p className="mt-2 text-sm font-medium uppercase tracking-widest text-white/50">
        {label}
      </p>
    </div>
  );
}

/* ── Shared input styles ───────────────────────────────────── */
const inputClassHero =
  "w-full rounded-xl border border-white/15 bg-white/[0.07] px-4 py-3 text-sm text-white outline-none placeholder:text-white/40 transition-all focus:border-white/30 focus:bg-white/10 focus:ring-2 focus:ring-white/10 backdrop-blur-sm";
const inputClassCard =
  "w-full rounded-xl border border-gray-200/80 bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400 transition-all focus:border-[#3b9ede] focus:ring-2 focus:ring-[#3b9ede]/20";

/* ── Success Message ───────────────────────────────────────── */
function SuccessMessage({ variant }: { variant: "hero" | "card" }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-6 py-4 ${
        variant === "hero"
          ? "border-white/20 bg-white/10 backdrop-blur-lg"
          : "border-green-200 bg-green-50"
      }`}
    >
      <span className="text-2xl">🏔️</span>
      <p
        className={`text-sm font-medium ${
          variant === "hero" ? "text-white" : "text-green-800"
        }`}
      >
        You&apos;re on the list! We&apos;ll be in touch before launch.
      </p>
    </div>
  );
}

/* ── Hero Signup Form (with Worker / Business toggle) ──────── */
function HeroSignupForm() {
  const [role, setRole] = useState<"worker" | "business">("worker");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("");
  const [resort, setResort] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mc-waitlist-email");
    if (stored) setSubmitted(true);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (role === "business") {
      if (!businessName.trim()) { setError("Please enter your business name"); return; }
      if (!country.trim()) { setError("Please enter your country"); return; }
      if (!resort.trim()) { setError("Please enter your resort"); return; }
    }

    const entry = role === "worker"
      ? { type: "worker", email, timestamp: new Date().toISOString() }
      : { type: "business", email, businessName, country, resort, timestamp: new Date().toISOString() };

    const key = role === "worker" ? "mc-waitlist-workers" : "mc-waitlist-businesses";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push(entry);
    localStorage.setItem(key, JSON.stringify(existing));
    localStorage.setItem("mc-waitlist-email", email);

    setSubmitted(true);
  };

  if (submitted) return <SuccessMessage variant="hero" />;

  return (
    <div className="w-full max-w-lg">
      {/* Role Toggle */}
      <div className="mb-5 flex justify-center">
        <div className="inline-flex rounded-full border border-white/15 bg-white/[0.05] p-1 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => { setRole("worker"); setError(""); }}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              role === "worker"
                ? "bg-gradient-to-r from-[#3b9ede] to-[#22d3ee] text-white shadow-lg shadow-[#3b9ede]/25"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            I&apos;m a Worker
          </button>
          <button
            type="button"
            onClick={() => { setRole("business"); setError(""); }}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              role === "business"
                ? "bg-gradient-to-r from-[#3b9ede] to-[#22d3ee] text-white shadow-lg shadow-[#3b9ede]/25"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            I&apos;m a Business
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {role === "business" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={businessName}
              onChange={(e) => { setBusinessName(e.target.value); setError(""); }}
              placeholder="Business name"
              className={inputClassHero}
            />
            <input
              type="text"
              value={country}
              onChange={(e) => { setCountry(e.target.value); setError(""); }}
              placeholder="Country"
              className={inputClassHero}
            />
            <input
              type="text"
              value={resort}
              onChange={(e) => { setResort(e.target.value); setError(""); }}
              placeholder="Resort"
              className={`${inputClassHero} sm:col-span-2`}
            />
          </div>
        )}

        {/* Email + Submit row */}
        <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 p-1.5 backdrop-blur-lg transition-all focus-within:border-white/40 focus-within:ring-2 focus-within:ring-white/20">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="Enter your email"
            className="flex-1 rounded-xl border-0 bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-white/50"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-gradient-to-r from-[#3b9ede] to-[#22d3ee] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#3b9ede]/30 transition-all hover:shadow-xl hover:shadow-[#3b9ede]/40 hover:brightness-110 active:scale-[0.98]"
          >
            Join Waitlist
          </button>
        </div>

        {error && <p className="text-xs text-red-300">{error}</p>}
      </form>
    </div>
  );
}

/* ── Worker Card Form (email only) ─────────────────────────── */
function WorkerCardForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mc-waitlist-email");
    if (stored) setSubmitted(true);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Please enter a valid email address"); return; }

    const existing = JSON.parse(localStorage.getItem("mc-waitlist-workers") || "[]");
    existing.push({ type: "worker", email, timestamp: new Date().toISOString() });
    localStorage.setItem("mc-waitlist-workers", JSON.stringify(existing));
    localStorage.setItem("mc-waitlist-email", email);
    setSubmitted(true);
  };

  if (submitted) return <SuccessMessage variant="card" />;

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm transition-all focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="Enter your email"
          className="flex-1 rounded-xl border-0 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-gradient-to-r from-[#3b9ede] to-[#22d3ee] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#3b9ede]/30 transition-all hover:shadow-xl hover:shadow-[#3b9ede]/40 hover:brightness-110 active:scale-[0.98]"
        >
          Join Waitlist
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </form>
  );
}

/* ── Business Card Form (name, country, resort, email) ─────── */
function BusinessCardForm() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [country, setCountry] = useState("");
  const [resort, setResort] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("mc-waitlist-email");
    if (stored) setSubmitted(true);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!businessName.trim()) { setError("Please enter your business name"); return; }
    if (!country.trim()) { setError("Please enter your country"); return; }
    if (!resort.trim()) { setError("Please enter your resort"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Please enter a valid email address"); return; }

    const existing = JSON.parse(localStorage.getItem("mc-waitlist-businesses") || "[]");
    existing.push({ type: "business", email, businessName, country, resort, timestamp: new Date().toISOString() });
    localStorage.setItem("mc-waitlist-businesses", JSON.stringify(existing));
    localStorage.setItem("mc-waitlist-email", email);
    setSubmitted(true);
  };

  if (submitted) return <SuccessMessage variant="card" />;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          value={businessName}
          onChange={(e) => { setBusinessName(e.target.value); setError(""); }}
          placeholder="Business name"
          className={inputClassCard}
        />
        <input
          type="text"
          value={country}
          onChange={(e) => { setCountry(e.target.value); setError(""); }}
          placeholder="Country"
          className={inputClassCard}
        />
      </div>
      <input
        type="text"
        value={resort}
        onChange={(e) => { setResort(e.target.value); setError(""); }}
        placeholder="Resort you operate at"
        className={inputClassCard}
      />
      <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 shadow-sm transition-all focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          placeholder="Business email"
          className="flex-1 rounded-xl border-0 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-gradient-to-r from-[#3b9ede] to-[#22d3ee] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#3b9ede]/30 transition-all hover:shadow-xl hover:shadow-[#3b9ede]/40 hover:brightness-110 active:scale-[0.98]"
        >
          Join Waitlist
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}

/* ── Mountain Icon SVG ─────────────────────────────────────── */
function MountainIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M8 3l4 8 5-5 7 14H0L8 3z" />
    </svg>
  );
}

/* ── How It Works Card ─────────────────────────────────────── */
function HowItWorksCard({
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
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={`animate-on-scroll ${delay} group rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.06]`}
    >
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b9ede]/20 to-[#22d3ee]/20 text-[#22d3ee] transition-transform group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/50">{description}</p>
    </div>
  );
}

/* ── Social Icon ───────────────────────────────────────────── */
function SocialIcon({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/40 transition-all hover:border-white/30 hover:text-white hover:bg-white/10"
    >
      {children}
    </a>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
   ══════════════════════════════════════════════════════════════ */
export default function ComingSoonPage() {
  const [loaded, setLoaded] = useState(false);
  const waitlistCount = useWaitlistCounter();
  const howItWorksRef = useReveal();
  const ctaRef = useReveal();

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#060e18] text-white">
      {/* ─── HERO SECTION ─────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-20">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920&q=85"
            alt="Snowy mountain peaks at night"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#060e18]/70 via-[#060e18]/60 to-[#060e18]" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")" }} />
        </div>

        <div className="absolute top-1/3 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b9ede]/8 blur-[120px]" />

        {/* Content */}
        <div className="relative z-10 flex max-w-3xl flex-col items-center text-center">
          {/* Logo */}
          <div
            className={`flex items-center gap-3 transition-all duration-1000 ${
              loaded ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"
            }`}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#3b9ede] to-[#22d3ee] shadow-lg shadow-[#3b9ede]/30">
              <MountainIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              MountainConnects
            </span>
          </div>

          {/* Headline */}
          <h1
            className={`mt-10 text-5xl font-extrabold leading-[1.1] tracking-tight transition-all duration-1000 delay-200 sm:text-6xl md:text-7xl ${
              loaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            Your Next Season
            <br />
            <span className="bg-gradient-to-r from-[#3b9ede] via-[#22d3ee] to-[#3b9ede] bg-clip-text text-transparent">
              Starts Here
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className={`mt-6 max-w-xl text-lg leading-relaxed text-white/60 transition-all duration-1000 delay-300 md:text-xl ${
              loaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            The premium platform connecting seasonal workers with ski resorts and
            mountain businesses worldwide. Launching soon.
          </p>

          {/* Signup Form with Toggle */}
          <div
            className={`mt-10 w-full transition-all duration-1000 delay-500 ${
              loaded ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            <HeroSignupForm />
          </div>

          {/* Trust Line */}
          <p
            className={`mt-5 flex items-center gap-2 text-xs text-white/35 transition-all duration-1000 delay-700 ${
              loaded ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Join{" "}
            <span className="font-semibold text-white/50">
              {waitlistCount.toLocaleString()}+
            </span>{" "}
            workers &amp; resorts already on the waitlist. No spam, ever.
          </p>
        </div>

        {/* Scroll indicator */}
        <div
          className={`absolute bottom-10 left-1/2 -translate-x-1/2 transition-all duration-1000 delay-1000 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
              Scroll
            </span>
            <div className="h-8 w-[1px] bg-gradient-to-b from-white/30 to-transparent animate-pulse" />
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="relative px-6 py-28">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#060e18] to-transparent" />

        <div className="relative mx-auto max-w-6xl">
          <div ref={howItWorksRef} className="animate-on-scroll mb-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#22d3ee]">
              How It Works
            </p>
            <h2 className="mt-4 text-3xl font-extrabold text-white md:text-4xl">
              Built for the mountain lifestyle
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <HowItWorksCard
              delay="delay-100"
              icon={
                <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              }
              title="For Workers"
              description="Browse seasonal roles at top resorts worldwide. Find your dream mountain job with accommodation, ski passes, and adventure built in."
            />
            <HowItWorksCard
              delay="delay-200"
              icon={
                <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              }
              title="For Businesses"
              description="Post jobs and find vetted seasonal talent fast. Access a global pool of experienced mountain workers ready for next season."
            />
            <HowItWorksCard
              delay="delay-300"
              icon={
                <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664c.369.555.169 1.307-.427 1.605L9 13.125l.423 1.059a.956.956 0 01-1.652.928l-.679-.906a1.125 1.125 0 00-1.906.172L4.5 15.75l-.612.153M12.75 3.031a9 9 0 00-8.862 12.872M12.75 3.031a9 9 0 016.69 14.036m0 0l-.177-.529A2.25 2.25 0 0017.128 15H16.5l-.324-.324a1.453 1.453 0 00-2.328.377l-.036.073a1.586 1.586 0 01-.982.816l-.99.282c-.55.157-.894.702-.8 1.267l.073.438a2.25 2.25 0 01-1.228 2.446l-.009.004-.339.17" />
                </svg>
              }
              title="For Everyone"
              description="Built for the mountain lifestyle. Whether you're chasing powder or building a business, MountainConnects brings the community together."
            />
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-r from-[#3b9ede]/5 via-[#22d3ee]/5 to-[#3b9ede]/5" />
        <div className="absolute top-1/2 left-1/2 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3b9ede]/5 blur-[100px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <div className="relative mx-auto grid max-w-5xl grid-cols-1 gap-12 px-6 md:grid-cols-3">
          <AnimatedStat value="500+" label="Resorts" />
          <AnimatedStat value="10,000+" label="Jobs Posted" />
          <AnimatedStat value="Worldwide" label="Reach" />
        </div>
      </section>

      {/* ─── DUAL CTA SECTION ─────────────────────────────────── */}
      <section className="px-6 py-28">
        <div className="mx-auto max-w-5xl">
          <div ref={ctaRef} className="animate-on-scroll mb-16 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#22d3ee]">
              Get Early Access
            </p>
            <h2 className="mt-4 text-3xl font-extrabold text-white md:text-4xl">
              Which one are you?
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Worker Card */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.05]">
              <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[#3b9ede]/10 blur-[60px] transition-all group-hover:bg-[#3b9ede]/20" />

              <div className="relative">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3b9ede]/20 to-[#22d3ee]/10">
                  <svg className="h-8 w-8 text-[#3b9ede]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>

                <h3 className="text-2xl font-bold text-white">I&apos;m a Worker</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/50">
                  Ready for your next mountain adventure? Get first access to seasonal
                  jobs at the world&apos;s best ski resorts.
                </p>

                <div className="mt-8">
                  <WorkerCardForm />
                </div>
              </div>
            </div>

            {/* Business Card */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-10 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.05]">
              <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[#22d3ee]/10 blur-[60px] transition-all group-hover:bg-[#22d3ee]/20" />

              <div className="relative">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22d3ee]/20 to-[#3b9ede]/10">
                  <svg className="h-8 w-8 text-[#22d3ee]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                </div>

                <h3 className="text-2xl font-bold text-white">
                  I&apos;m a Resort / Business
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/50">
                  Find vetted seasonal talent before anyone else. Be among the first
                  resorts on the platform when we launch.
                </p>

                <div className="mt-8">
                  <BusinessCardForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 py-12">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#3b9ede] to-[#22d3ee]">
              <MountainIcon className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white/70">MountainConnects</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-white/30 transition-colors hover:text-white/60">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-white/30 transition-colors hover:text-white/60">
              Contact
            </a>
          </div>

          <div className="flex items-center gap-3">
            <SocialIcon href="#" label="Instagram">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </SocialIcon>
            <SocialIcon href="#" label="LinkedIn">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </SocialIcon>
            <SocialIcon href="#" label="Facebook">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </SocialIcon>
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] text-white/20">
          &copy; 2025 MountainConnects. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

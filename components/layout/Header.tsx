"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RegionsDropdown from "./RegionsDropdown";
import NotificationBell from "@/components/ui/NotificationBell";
import MessageNotificationBell from "@/components/ui/MessageNotificationBell";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/jobs", label: "Jobs" },
  { href: "/employers", label: "Employers" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ role?: string; name?: string } | null>(null);
  const [checked, setChecked] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    // Full page reload to clear all cached auth state
    window.location.href = "/login";
  };

  // Track scroll for transparent → solid header
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      setChecked(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from("users")
          .select("role")
          .eq("id", data.user.id)
          .single()
          .then(({ data: userData }) => {
            setUser({
              role: userData?.role || undefined,
              name: data.user!.user_metadata?.full_name,
            });
            setChecked(true);
          });
      } else {
        setChecked(true);
      }
    });
  }, []);

  const dashboardHref =
    user?.role === "business_owner" ? "/business/dashboard" : "/dashboard";

  const isHome = pathname === "/";
  const headerBg = isHome && !scrolled
    ? "bg-transparent border-transparent"
    : "bg-white/90 border-accent/30 shadow-sm";

  const textColor = isHome && !scrolled ? "text-white" : "text-foreground";
  const logoTextColor = isHome && !scrolled ? "text-white" : "text-primary";
  const hoverColor = isHome && !scrolled ? "hover:bg-white/10 hover:text-white" : "hover:bg-accent/30 hover:text-primary";
  const activeColor = isHome && !scrolled ? "bg-white/15 text-white" : "bg-secondary/15 text-primary";

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-all duration-300 ${headerBg}`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/Logo.jpeg"
              alt="Mountain Connects"
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg object-contain"
              priority
            />
            <span className={`text-lg font-bold tracking-tight transition-colors duration-300 ${logoTextColor}`}>
              Mountain Connects
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.slice(0, 2).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  pathname === link.href
                    ? activeColor
                    : `${textColor} ${hoverColor}`
                }`}
              >
                {link.label}
              </Link>
            ))}
            <RegionsDropdown textColor={textColor} hoverColor={hoverColor} activeColor={activeColor} />
            {navLinks.slice(2).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  pathname === link.href
                    ? activeColor
                    : `${textColor} ${hoverColor}`
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth area */}
          <div className="flex items-center gap-3">
            {checked && user ? (
              <>
                <div className={`hidden sm:flex items-center gap-1 ${isHome && !scrolled ? "[&_button]:text-white/80 [&_button]:hover:bg-white/10" : ""}`}>
                  <MessageNotificationBell
                    messagesHref={user.role === "business_owner" ? "/business/messages" : "/messages"}
                  />
                  <NotificationBell />
                </div>
                <Link
                  href={dashboardHref}
                  className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-secondary-light hover:shadow-lg hover:shadow-secondary/20"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="rounded-lg border border-accent bg-white px-3 py-2 text-sm font-medium text-foreground/60 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <svg className="h-4 w-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  <span className="hidden sm:inline">Log out</span>
                </button>
              </>
            ) : checked ? (
              <>
                <Link
                  href="/login"
                  className={`hidden text-sm font-medium transition-colors sm:block ${textColor} hover:opacity-80`}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-secondary-light hover:shadow-lg hover:shadow-secondary/20"
                >
                  Sign up
                </Link>
              </>
            ) : null}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`ml-2 rounded-lg p-2 md:hidden ${textColor} ${hoverColor}`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="border-t border-accent/20 bg-white/95 backdrop-blur-lg md:hidden">
            <nav className="mx-auto max-w-7xl space-y-1 px-6 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-lg px-4 py-2.5 text-sm font-medium ${
                    pathname === link.href
                      ? "bg-secondary/15 text-primary"
                      : "text-foreground hover:bg-accent/30"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Spacer — only on non-home pages where header is solid */}
      {!isHome && <div className="h-16" />}
    </>
  );
}

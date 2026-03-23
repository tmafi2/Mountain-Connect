"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import RegionsDropdown from "./RegionsDropdown";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/jobs", label: "Jobs" },
  { href: "/about", label: "About" },
];

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ role?: string; name?: string } | null>(
    null
  );
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Skip auth check if Supabase isn't configured
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
        // Try to get role from user metadata or default
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

  return (
    <header className="sticky top-0 z-50 border-b border-accent bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/Logo.jpeg"
            alt="Mountain Connect"
            width={40}
            height={40}
            className="h-10 w-10 rounded-lg object-contain"
            priority
          />
          <span className="text-lg font-semibold text-primary">
            Mountain Connect
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.slice(0, 2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-secondary/20 text-primary"
                  : "text-foreground hover:bg-accent/30 hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <RegionsDropdown />
          {navLinks.slice(2).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-secondary/20 text-primary"
                  : "text-foreground hover:bg-accent/30 hover:text-primary"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Auth area */}
        <div className="flex items-center gap-3">
          {checked && user ? (
            /* Logged-in state */
            <Link
              href={dashboardHref}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
            >
              Go to Dashboard
            </Link>
          ) : checked ? (
            /* Logged-out state */
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-foreground transition-colors hover:text-primary"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
              >
                Sign up
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import NotificationBell from "@/components/ui/NotificationBell";

interface PortalHeaderProps {
  portalType: "worker" | "business" | "admin";
  userName?: string;
}

export default function PortalHeader({
  portalType,
  userName,
}: PortalHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const dashboardHref =
    portalType === "admin" ? "/admin/dashboard" : portalType === "worker" ? "/dashboard" : "/business/dashboard";
  const profileHref =
    portalType === "admin" ? "/admin/dashboard" : portalType === "worker" ? "/profile" : "/company-profile";

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-accent bg-white/80 px-6 backdrop-blur-md">
      {/* Left — Logo + Home */}
      <div className="flex items-center gap-3">
        <Link
          href={dashboardHref}
          className="flex items-center gap-2 text-lg font-bold text-primary"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path d="M16 2L28 28H4L16 2Z" fill="#a9cbe3" />
            <path d="M16 10L24 28H8L16 10Z" fill="#0e2439" />
          </svg>
          Mountain Connect
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-foreground/60 transition-colors hover:bg-accent/30 hover:text-primary"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
          </svg>
          Home
        </Link>
      </div>

      {/* Right — notifications + account dropdown */}
      <div className="flex items-center gap-2">
        <NotificationBell />
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/30"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary/30 text-xs font-bold text-primary">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </span>
          <span className="hidden sm:inline">{userName || "Account"}</span>
          <svg
            className={`h-4 w-4 transition-transform ${menuOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-accent bg-white py-1 shadow-lg">
            <Link
              href={profileHref}
              className="block px-4 py-2 text-sm text-foreground hover:bg-accent/20"
              onClick={() => setMenuOpen(false)}
            >
              My Profile
            </Link>
            <Link
              href="/explore"
              className="block px-4 py-2 text-sm text-foreground hover:bg-accent/20"
              onClick={() => setMenuOpen(false)}
            >
              Explore Resorts
            </Link>
            <Link
              href="/jobs"
              className="block px-4 py-2 text-sm text-foreground hover:bg-accent/20"
              onClick={() => setMenuOpen(false)}
            >
              Browse Jobs
            </Link>
            <hr className="my-1 border-accent" />
            <button
              onClick={handleLogout}
              className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Log Out
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}

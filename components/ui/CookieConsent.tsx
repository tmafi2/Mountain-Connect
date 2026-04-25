"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Script from "next/script";

const COOKIE_KEY = "cookie-consent";

// Routes where the cookie banner shouldn't appear (printable / standalone
// surfaces). Anything matching one of these prefixes hides the banner
// regardless of consent state.
const HIDDEN_PREFIXES = ["/poster"];

export default function CookieConsent() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null);
  const [visible, setVisible] = useState(false);

  const hiddenForRoute = HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_KEY);
    if (stored === "granted" || stored === "denied") {
      setConsent(stored);
    } else {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_KEY, "granted");
    setConsent("granted");
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_KEY, "denied");
    setConsent("denied");
    setVisible(false);
  };

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <>
      {/* Load GA4 only if consent is granted */}
      {consent === "granted" && gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      )}

      {/* Banner */}
      {visible && !hiddenForRoute && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-accent/30 bg-white p-4 shadow-lg sm:p-5">
          <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground/70">
              We use cookies to analyse site usage and improve your experience. See our{" "}
              <Link href="/privacy" className="font-medium text-secondary underline">
                Privacy Policy
              </Link>{" "}
              for details.
            </p>
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={handleDecline}
                className="rounded-lg border border-accent/50 px-4 py-2 text-sm font-medium text-foreground/60 transition-colors hover:bg-accent/20"
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-secondary/90"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

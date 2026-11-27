import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { defaultOgImage } from "@/lib/seo";
import { Plus_Jakarta_Sans } from "next/font/google";
import CookieConsent from "@/components/ui/CookieConsent";
import ReferrerCapture from "@/components/ui/ReferrerCapture";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

/* ⚠️ NO FIGURE HERE ON PURPOSE. This is a static `metadata` export, which
   cannot await the live counts, and a number typed into metadata is a number
   that goes stale silently — nobody reads their own meta tags. This said
   "80+ resorts" / "69 resorts in 12 countries" while the real figures were
   111 and 14, and Bing's AI was quoting it back to searchers. A vaguer true
   line beats a precise false one. See lib/stats/platform-stats.ts. */
export const metadata: Metadata = {
  title: {
    default: "Ski Resort Jobs — Seasonal Winter Work Worldwide | Mountain Connects",
    template: "%s | Mountain Connects",
  },
  description:
    "Find ski resort jobs worldwide. Browse seasonal winter work — instructor, lift operator, hospitality, and more — with staff accommodation across Australia, New Zealand, Canada, Japan, and Europe.",
  applicationName: "Mountain Connects",
  authors: [{ name: "Mountain Connects" }],
  creator: "Mountain Connects",
  publisher: "Mountain Connects",
  metadataBase: new URL("https://www.mountainconnects.com"),
  alternates: {
    canonical: "https://www.mountainconnects.com",
  },
  openGraph: {
    title: "Ski Resort Jobs — Seasonal Winter Work Worldwide | Mountain Connects",
    description:
      "Find ski resort jobs worldwide. Seasonal winter work with staff accommodation.",
    url: "https://www.mountainconnects.com",
    siteName: "Mountain Connects",
    type: "website",
    locale: "en_US",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ski Resort Jobs — Seasonal Winter Work Worldwide | Mountain Connects",
    description:
      "Find ski resort jobs worldwide. Seasonal winter work with staff accommodation.",
    images: [defaultOgImage.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  // Meta domain verification for the Business portfolio that runs the ads and
  // owns the pixel (lib/analytics/meta-pixel.ts). Meta checks the home page;
  // mountainconnects.com redirects there. Invisible to visitors — leave it in.
  verification: {
    other: { "facebook-domain-verification": "m7c75nr6iew5ksidm73whhbmhgkdiq" },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  // A stable @id so other nodes on the site can reference this organisation
  // rather than restating it, and so the same entity is recognisable across
  // pages. The url is the identifier; the #organization fragment keeps it
  // distinct from the WebSite node at the same address.
  "@id": "https://www.mountainconnects.com/#organization",
  name: "Mountain Connects",
  alternateName: ["MountainConnects", "Mountain Connect"],
  url: "https://www.mountainconnects.com",
  logo: "https://www.mountainconnects.com/images/og-image-v2.jpg",
  description:
    "The seasonal worker platform for ski resorts. Find winter jobs at ski resorts worldwide.",
  // ⚠️ MUST MATCH THE FOOTER. sameAs is how a search engine confirms the
  // profiles belong to this organisation, so a url that is not the real
  // profile confirms nothing. The Facebook entry here was
  // facebook.com/MountainConnects, a vanity name we do not hold, while the
  // footer links the actual page by id. TikTok was in the footer and missing
  // here. Three profiles, three links, same as components/layout/Footer.tsx.
  sameAs: [
    "https://www.instagram.com/mountain.connects",
    "https://www.facebook.com/profile.php?id=61574305621437",
    "https://www.tiktok.com/@mountain.connects",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Mountain Connects",
  url: "https://www.mountainconnects.com",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://www.mountainconnects.com/jobs?search={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className={`${jakarta.variable} font-sans antialiased`}>
        {children}
        <CookieConsent />
        <ReferrerCapture />
        {/* Vercel Web Analytics — page views, referrers and countries for the
            WHOLE site, not just the campaign pages.

            ⚠️ DELIBERATELY OUTSIDE THE COOKIE GATE, unlike Google Analytics
            and the Meta Pixel. It sets no cookie and keeps no cross-day or
            cross-site identifier: a visitor is a hash of the request that
            Vercel resets every 24 hours. That is the whole reason it is here
            — the consent-gated tools measure only the ~6% who answer the
            banner, which is how GA4 reported 7 visitors on a day
            `campaign_visits` counted 117 (see migration 00105/00106). Those
            two tables stay: they are the honest denominator for
            /go-for-a-season specifically, and they are ours rather than a
            vendor's.

            ⚠️ NO PRODUCTION-HOST GUARD HERE, and that is not an oversight.
            `metaPixelAllowedOn` exists because a preview visit would count
            as an ad result and corrupt Meta's optimisation. Nothing like that
            applies here: the component no-ops on localhost (it logs to the
            console instead of sending) and Vercel tags preview traffic as its
            own environment in the dashboard, so it is filterable rather than
            mixed in. It does spend the shared monthly event allowance.

            ⚠️ TWO HALVES, AND THIS IS ONLY ONE. The script is served from
            the site's own origin under a per-build random path, so it needs
            no CSP change — but it 404s until Web Analytics is switched on at
            Vercel → the project → Analytics → Enable. With the toggle off,
            this component ships and silently collects nothing.

            Privacy policy: section 4 lists Vercel as hosting only, and
            sections 2 and 7 name Google Analytics and the Meta Pixel as the
            analytics that exist. Both need a line about this one. */}
        <Analytics />
        {/* Vercel Speed Insights — real-user Core Web Vitals, not traffic.

            ⚠️ THIS WAS SWITCHED ON AT VERCEL AND COLLECTING NOTHING. The
            dashboard half had been enabled long enough that
            /_vercel/speed-insights/script.js answered 200 in production,
            while no package was installed and no component rendered — the
            exact inverse of the Analytics problem, and invisible from either
            side alone. Check BOTH halves before concluding a Vercel feature
            works: a 200 on the script route proves only the toggle.

            ⚠️ Its script URL has a third branch the Analytics one does not:
            with a `dsn` prop it loads from va.vercel-scripts.com in
            PRODUCTION, which the CSP would block. We pass no dsn, so
            production stays on the first-party /_vercel path — but adding
            one later is a CSP change, not just a prop.

            Measures performance only. It records no page content and nothing
            about who the visitor is, so there is nothing here for the privacy
            policy that section 2 does not already cover. */}
        <SpeedInsights />
      </body>
    </html>
  );
}

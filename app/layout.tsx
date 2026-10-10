import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";
import { Plus_Jakarta_Sans } from "next/font/google";
import CookieConsent from "@/components/ui/CookieConsent";
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
      </body>
    </html>
  );
}

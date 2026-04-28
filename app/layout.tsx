import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";
import { Plus_Jakarta_Sans } from "next/font/google";
import CookieConsent from "@/components/ui/CookieConsent";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: {
    default: "Ski Resort Jobs — Seasonal Winter Work Worldwide | Mountain Connects",
    template: "%s | Mountain Connects",
  },
  description:
    "Find ski resort jobs at 80+ resorts worldwide. Browse seasonal winter work — instructor, lift operator, hospitality, and more — with staff accommodation across Australia, New Zealand, Canada, Japan, and Europe.",
  applicationName: "Mountain Connects",
  keywords: [
    "Mountain Connects",
    "MountainConnects",
    "ski resort jobs",
    "seasonal jobs",
    "winter jobs",
    "ski season work",
    "snow season jobs",
    "ski instructor jobs",
    "hospitality jobs ski resort",
    "seasonal worker platform",
    "ski resort recruitment",
    "winter season Australia",
    "ski jobs New Zealand",
    "ski jobs Canada",
    "ski jobs Japan",
    "gap year ski work",
    "working holiday ski resort",
  ],
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
      "Find ski resort jobs at 80+ resorts worldwide. Seasonal winter work with staff accommodation.",
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
      "Find ski resort jobs at 80+ resorts worldwide. Seasonal winter work with staff accommodation.",
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
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Mountain Connects",
  alternateName: ["MountainConnects", "Mountain Connect"],
  url: "https://www.mountainconnects.com",
  logo: "https://www.mountainconnects.com/images/og-image-v2.jpg",
  description:
    "The seasonal worker platform for ski resorts. Find winter jobs at ski resorts worldwide.",
  sameAs: [
    "https://www.facebook.com/MountainConnects",
    "https://www.instagram.com/mountain.connects/",
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

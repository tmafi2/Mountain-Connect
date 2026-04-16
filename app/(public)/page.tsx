import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";
import HomePageClient from "./HomePageClient";

export const metadata: Metadata = {
  title: "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide",
  description:
    "Find seasonal work at ski resorts worldwide. Browse jobs in hospitality, ski instruction, food & beverage, retail, and more across 69+ resorts in 12 countries.",
  alternates: { canonical: "https://www.mountainconnects.com" },
  openGraph: {
    title: "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide",
    description:
      "Find seasonal work at ski resorts worldwide. Browse jobs across 69+ resorts in 12 countries.",
    url: "https://www.mountainconnects.com",
    siteName: "Mountain Connects",
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide",
    description:
      "Find seasonal work at ski resorts worldwide. Browse jobs across 69+ resorts in 12 countries.",
    images: [defaultOgImage.url],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Mountain Connects",
  url: "https://www.mountainconnects.com",
  description:
    "Mountain Connects is a seasonal worker platform connecting workers with ski resort businesses worldwide.",
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    email: "notifications@mountainconnects.com",
    contactType: "customer support",
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Mountain Connects",
  url: "https://www.mountainconnects.com",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://www.mountainconnects.com/jobs?search={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <HomePageClient />
    </>
  );
}

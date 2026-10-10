import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";
import WelcomeClient from "./WelcomeClient";

/* ⚠️ NO FIGURE HERE ON PURPOSE. This is a static `metadata` export, which
   cannot await the live counts, and a number typed into metadata is a number
   that goes stale silently — nobody reads their own meta tags. This said
   "80+ resorts" / "69 resorts in 12 countries" while the real figures were
   111 and 14, and Bing's AI was quoting it back to searchers. A vaguer true
   line beats a precise false one. See lib/stats/platform-stats.ts. */
export const metadata: Metadata = {
    // The root layout appends " | Mountain Connects" to every title; this
  // one already names the brand, so it opts out rather than saying it twice.
  title: { absolute: "Welcome to Mountain Connects | Seasonal Jobs at Ski Resorts Worldwide" },
  description:
    "The all-in-one platform for ski resort hiring. Businesses post jobs and manage applicants; workers find seasonal roles at resorts worldwide.",
  alternates: { canonical: "https://www.mountainconnects.com/welcome" },
  openGraph: {
    title: "Welcome to Mountain Connects",
    description:
      "Seasonal jobs at ski resorts worldwide — hiring made simple, job hunting made easy.",
    url: "https://www.mountainconnects.com/welcome",
    siteName: "Mountain Connects",
    type: "website",
    locale: "en_US",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Welcome to Mountain Connects",
    description:
      "Seasonal jobs at ski resorts worldwide — hiring made simple, job hunting made easy.",
    images: [defaultOgImage.url],
  },
  robots: { index: true, follow: true },
};

interface WelcomePageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function WelcomePage({ searchParams }: WelcomePageProps) {
  const params = await searchParams;
  const initialView: "business" | "worker" =
    params.view === "worker" ? "worker" : "business";

  return <WelcomeClient initialView={initialView} />;
}

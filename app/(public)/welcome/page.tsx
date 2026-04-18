import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";
import WelcomeClient from "./WelcomeClient";

export const metadata: Metadata = {
  title: "Welcome to Mountain Connects | Seasonal Jobs at Ski Resorts Worldwide",
  description:
    "The all-in-one platform for ski resort hiring. Businesses post jobs and manage applicants; workers find seasonal roles at 69 resorts across 12 countries.",
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

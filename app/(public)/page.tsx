import type { Metadata } from "next";
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Mountain Connects — Seasonal Jobs at Ski Resorts Worldwide",
    description:
      "Find seasonal work at ski resorts worldwide. Browse jobs across 69+ resorts in 12 countries.",
  },
};

export default function HomePage() {
  return <HomePageClient />;
}

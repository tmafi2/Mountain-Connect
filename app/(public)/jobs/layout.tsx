import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Seasonal Jobs at Ski Resorts Worldwide | Mountain Connects",
  description:
    "Browse seasonal job listings at ski resorts around the world. Find roles in hospitality, ski instruction, food & beverage, retail, and more.",
  alternates: { canonical: "https://www.mountainconnects.com/jobs" },
  openGraph: {
    title: "Seasonal Jobs at Ski Resorts Worldwide",
    description:
      "Browse seasonal job listings at ski resorts around the world. Find roles in hospitality, ski instruction, food & beverage, retail, and more.",
    url: "https://www.mountainconnects.com/jobs",
    siteName: "Mountain Connects",
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Seasonal Jobs at Ski Resorts Worldwide | Mountain Connects",
    description:
      "Browse seasonal job listings at ski resorts around the world.",
    images: [defaultOgImage.url],
  },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

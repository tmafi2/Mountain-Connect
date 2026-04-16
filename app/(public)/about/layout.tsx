import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "About Mountain Connects — Connecting Seasonal Workers & Resorts",
  description:
    "Mountain Connects is the platform connecting seasonal workers with ski resort businesses worldwide. Learn about our mission, values, and how we help the mountain community.",
  alternates: { canonical: "https://www.mountainconnects.com/about" },
  openGraph: {
    title: "About Mountain Connects",
    description:
      "Mountain Connects connects seasonal workers with ski resort businesses worldwide. Learn about our mission and values.",
    url: "https://www.mountainconnects.com/about",
    siteName: "Mountain Connects",
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Mountain Connects",
    description:
      "Mountain Connects connects seasonal workers with ski resort businesses worldwide.",
    images: [defaultOgImage.url],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Mountain Connect — Connecting Seasonal Workers & Resorts",
  description:
    "Mountain Connect is the platform connecting seasonal workers with ski resort businesses worldwide. Learn about our mission, values, and how we help the mountain community.",
  alternates: { canonical: "https://www.mountainconnects.com/about" },
  openGraph: {
    title: "About Mountain Connect",
    description:
      "Mountain Connect connects seasonal workers with ski resort businesses worldwide. Learn about our mission and values.",
    url: "https://www.mountainconnects.com/about",
    siteName: "Mountain Connect",
    type: "website",
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}

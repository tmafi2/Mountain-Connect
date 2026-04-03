import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ski Regions — Browse Resorts by Region | Mountain Connect",
  description:
    "Explore ski regions around the world. Browse resorts by continent and country to find seasonal work opportunities in Europe, North America, Japan, and more.",
  alternates: { canonical: "https://www.mountainconnects.com/regions" },
  openGraph: {
    title: "Ski Regions — Browse Resorts by Region",
    description:
      "Explore ski regions worldwide. Browse resorts by continent and country to find seasonal work.",
    url: "https://www.mountainconnects.com/regions",
    siteName: "Mountain Connect",
    type: "website",
  },
};

export default function RegionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

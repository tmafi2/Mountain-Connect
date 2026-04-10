import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Ski Resorts — Interactive Globe & Resort Finder | Mountain Connects",
  description:
    "Explore 69+ ski resorts across 12 countries on our interactive globe. Compare resorts, discover seasonal work opportunities, and find your next mountain adventure.",
  alternates: { canonical: "https://www.mountainconnects.com/explore" },
  openGraph: {
    title: "Explore Ski Resorts — Interactive Globe & Resort Finder",
    description:
      "Explore 69+ ski resorts across 12 countries. Compare resorts and discover seasonal work opportunities.",
    url: "https://www.mountainconnects.com/explore",
    siteName: "Mountain Connects",
    type: "website",
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}

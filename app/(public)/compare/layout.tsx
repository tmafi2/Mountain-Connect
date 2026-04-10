import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Ski Resorts — Side-by-Side Resort Comparison | Mountain Connects",
  description:
    "Compare ski resorts side by side. Evaluate terrain, snowfall, staff housing, seasonal jobs, and living costs to find the best resort for your season.",
  alternates: { canonical: "https://www.mountainconnects.com/compare" },
  openGraph: {
    title: "Compare Ski Resorts — Side-by-Side Comparison",
    description:
      "Compare ski resorts side by side. Evaluate terrain, snowfall, staff housing, and seasonal jobs.",
    url: "https://www.mountainconnects.com/compare",
    siteName: "Mountain Connects",
    type: "website",
  },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}

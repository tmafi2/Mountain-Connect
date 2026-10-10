import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";

/* ⚠️ NO FIGURE HERE ON PURPOSE. This is a static `metadata` export, which
   cannot await the live counts, and a number typed into metadata is a number
   that goes stale silently — nobody reads their own meta tags. This said
   "80+ resorts" / "69 resorts in 12 countries" while the real figures were
   111 and 14, and Bing's AI was quoting it back to searchers. A vaguer true
   line beats a precise false one. See lib/stats/platform-stats.ts. */
export const metadata: Metadata = {
  title: "Explore Ski Resorts — Interactive Globe & Resort Finder | Mountain Connects",
  description:
    "Explore ski resorts worldwide on our interactive globe. Compare resorts, discover seasonal work opportunities, and find your next mountain adventure.",
  alternates: { canonical: "https://www.mountainconnects.com/explore" },
  openGraph: {
    title: "Explore Ski Resorts — Interactive Globe & Resort Finder",
    description:
      "Explore ski resorts worldwide. Compare resorts and discover seasonal work opportunities.",
    url: "https://www.mountainconnects.com/explore",
    siteName: "Mountain Connects",
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Ski Resorts — Interactive Globe & Resort Finder | Mountain Connects",
    description:
      "Explore ski resorts worldwide on our interactive globe.",
    images: [defaultOgImage.url],
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return children;
}

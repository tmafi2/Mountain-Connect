import type { Metadata } from "next";

/**
 * page.tsx is a client component, so it cannot export metadata itself — this
 * layout exists only to give the route a title. Without it the page inherits
 * the site-wide default from app/layout.tsx and a business looking at its own
 * billing sees a tab reading "Ski Resort Jobs — Seasonal Winter Work
 * Worldwide", which belongs to the public job search.
 *
 * `robots: noindex` because the page is only meaningful to a signed-in
 * business: it renders its plan state client-side, so a crawler sees an empty
 * shell. Public pricing already has a page built for that audience at
 * /for-employers, and that is the one that should rank.
 */
export const metadata: Metadata = {
  title: "Choose Your Plan",
  description: "Pick a Mountain Connects plan for your business.",
  robots: { index: false, follow: false },
};

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}

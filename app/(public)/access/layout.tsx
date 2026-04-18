import type { Metadata } from "next";

// The /access page is the legacy "coming soon" gate. It still exists but
// is no longer enforced by middleware. Tell Google not to index it so it
// doesn't get confused with the homepage or trigger duplicate-content flags.
export const metadata: Metadata = {
  title: "Access | Mountain Connects",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  alternates: {
    canonical: "https://www.mountainconnects.com/access",
  },
};

export default function AccessLayout({ children }: { children: React.ReactNode }) {
  return children;
}

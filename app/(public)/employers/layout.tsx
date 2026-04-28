import type { Metadata } from "next";
import { defaultOgImage } from "@/lib/seo";

export const metadata: Metadata = {
  title: "For Employers — Hire Seasonal Workers",
  description:
    "Find verified seasonal workers for your ski resort business. Post jobs, manage applicants, and connect with experienced mountain workers worldwide.",
  alternates: { canonical: "https://www.mountainconnects.com/employers" },
  openGraph: {
    title: "For Employers — Hire Seasonal Workers",
    description:
      "Find verified seasonal workers for your ski resort business. Post jobs and connect with experienced mountain workers.",
    url: "https://www.mountainconnects.com/employers",
    siteName: "Mountain Connects",
    type: "website",
    images: [defaultOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "For Employers — Hire Seasonal Workers | Mountain Connects",
    description:
      "Find verified seasonal workers for your ski resort business.",
    images: [defaultOgImage.url],
  },
};

export default function EmployersLayout({ children }: { children: React.ReactNode }) {
  return children;
}

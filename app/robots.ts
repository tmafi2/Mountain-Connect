import { MetadataRoute } from "next";
import { EMPLOYERS_DIRECTORY_ENABLED } from "@/lib/config/features";

/**
 * NO TRAILING SLASHES on these rules, deliberately.
 *
 * A robots.txt Disallow is a plain prefix match against the URL path, so
 * "/business/dashboard/" does NOT match "/business/dashboard" — the rule is
 * longer than the URL. This project runs with Next's default
 * trailingSlash: false, so every canonical portal URL is the bare form, and
 * the earlier slashed rules matched only sub-paths while leaving each page
 * itself crawlable. Dropping the slash covers the page and everything under
 * it.
 *
 * The lists below are kept in step with the three portals' route folders:
 * app/(worker)/*, app/(business)/business/* and app/(admin)/admin/*. Each
 * portal also emits `robots: noindex` from its layout, which is the stronger
 * signal — robots.txt only asks a crawler not to fetch, while the meta tag
 * keeps a page out of an index even when it is fetched anyway.
 */

// Worker portal — app/(worker)/*
const WORKER_PATHS = [
  "/applications",
  "/dashboard",
  "/following",
  "/interviews",
  "/job-alerts",
  "/messages",
  "/my-jobs",
  "/profile",
  "/referrals",
  "/reviews",
  "/saved-jobs",
  "/settings",
];

// Business portal — app/(business)/business/*
const BUSINESS_PATHS = [
  "/business/admin",
  "/business/analytics",
  "/business/applicants",
  "/business/availability",
  "/business/company-profile",
  "/business/dashboard",
  "/business/interviews",
  "/business/manage-listings",
  "/business/messages",
  "/business/post-job",
  "/business/referrals",
  "/business/settings",
  "/business/upgrade",
  "/business/venues",
  "/business/workers",
];

// Auth, onboarding and machine endpoints — nothing here belongs in an index.
const SYSTEM_PATHS = [
  "/access",
  "/api",
  "/auth",
  "/forgot-password",
  "/onboarding",
  "/reset-password",
  "/signup-confirmation",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Hidden feature, not a private area — drops off this list the
          // moment EMPLOYERS_DIRECTORY_ENABLED goes back to true. Covers the
          // worker portal's /employers/{slug} pages too.
          ...(EMPLOYERS_DIRECTORY_ENABLED ? [] : ["/employers"]),
          "/admin",
          ...WORKER_PATHS,
          ...BUSINESS_PATHS,
          ...SYSTEM_PATHS,
        ],
      },
    ],
    sitemap: "https://www.mountainconnects.com/sitemap.xml",
  };
}

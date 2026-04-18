import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/dashboard/",
          "/profile/",
          "/applications/",
          "/interviews/",
          "/saved-jobs/",
          "/job-alerts/",
          "/following/",
          "/messages/",
          "/business/dashboard/",
          "/business/manage-listings/",
          "/business/post-job/",
          "/business/applicants/",
          "/business/company-profile/",
          "/business/interviews/",
          "/business/messages/",
          "/business/availability/",
          "/business/analytics/",
          "/business/settings/",
          "/business/workers/",
          "/onboarding/",
          "/api/",
          "/access",
          "/auth/",
          "/reset-password",
          "/forgot-password",
          "/signup-confirmation",
        ],
      },
    ],
    sitemap: "https://www.mountainconnects.com/sitemap.xml",
  };
}

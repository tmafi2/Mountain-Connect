import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { resorts } from "@/lib/data/resorts";

const BASE_URL = "https://www.mountainconnects.com";

// Generate the sitemap on-demand instead of at build time. The four Supabase
// queries below were timing out the Vercel static-page generation step (60s
// limit) whenever Supabase was slow, breaking deploys. ISR re-generates after
// each request older than an hour, which is plenty for crawler traffic.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient();

  // Fetch dynamic content in parallel
  const [townsResult, jobsResult, blogResult, businessResult] = await Promise.all([
    admin.from("nearby_towns").select("slug, updated_at"),
    admin
      .from("job_posts")
      .select("id, updated_at")
      .eq("status", "active"),
    admin
      .from("blog_posts")
      .select("slug, updated_at")
      .eq("status", "published"),
    admin
      .from("business_profiles")
      .select("id, updated_at"),
  ]);

  const towns = townsResult.data || [];
  const jobs = jobsResult.data || [];
  const blogPosts = blogResult.data || [];
  const businesses = businessResult.data || [];

  // Get unique region IDs from static resort data
  const regionIds = [...new Set(resorts.map((r) => r.region_id))];

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/jobs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/ski-resort-jobs`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/resorts`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/welcome`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/towns`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/regions`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/employers`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/compare`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/signup`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/support`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  // Resort pages (static data, use legacy_id)
  const resortPages: MetadataRoute.Sitemap = resorts.map((resort) => ({
    url: `${BASE_URL}/resorts/${resort.id}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Country landing pages — long-tail variants of the head term
  // "ski resort jobs" (e.g. "ski resort jobs Australia").
  const skiJobCountrySlugs = [
    "australia",
    "new-zealand",
    "canada",
    "japan",
    "usa",
    "france",
    "switzerland",
    "austria",
    "italy",
    "andorra",
    "argentina",
    "chile",
    "georgia",
    "sweden",
  ];
  const skiJobCountryPages: MetadataRoute.Sitemap = skiJobCountrySlugs.map((slug) => ({
    url: `${BASE_URL}/ski-resort-jobs/${slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  // Region pages
  const regionPages: MetadataRoute.Sitemap = regionIds.map((id) => ({
    url: `${BASE_URL}/regions/${id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Town pages (from database)
  const townPages: MetadataRoute.Sitemap = towns.map((town) => ({
    url: `${BASE_URL}/towns/${town.slug}`,
    lastModified: town.updated_at ? new Date(town.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Job pages (from database)
  const jobPages: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `${BASE_URL}/jobs/${job.id}`,
    lastModified: job.updated_at ? new Date(job.updated_at) : new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  // Blog post pages (from database)
  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.updated_at ? new Date(post.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Business profile pages (from database)
  const businessPages: MetadataRoute.Sitemap = businesses.map((biz) => ({
    url: `${BASE_URL}/business/${biz.id}`,
    lastModified: biz.updated_at ? new Date(biz.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...resortPages,
    ...skiJobCountryPages,
    ...regionPages,
    ...townPages,
    ...jobPages,
    ...blogPages,
    ...businessPages,
  ];
}

import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { resorts } from "@/lib/data/resorts";
import { EMPLOYER_MARKETS } from "@/lib/data/employer-markets";
import { EMPLOYERS_DIRECTORY_ENABLED } from "@/lib/config/features";
import { businessBelongsInSitemap } from "@/lib/stats/sitemap-business";
// ⚠️ Paged, not a plain select. This project caps a select at 1000 rows with
// no error — and a sitemap silently missing urls is this file's own history
// (57fb081 shipped 150 instead of 628). 762 urls today, so job_posts is the
// one that reaches the cap first. See lib/supabase/fetch-all.ts.
import { fetchAllRows } from "@/lib/supabase/fetch-all";

const BASE_URL = "https://www.mountainconnects.com";

// Generated per request, never at build time — and `revalidate` alone did NOT
// achieve that, which hid a real fault for months.
//
// The deploy workflow builds with `vercel pull` + `vercel build`, and Vercel
// withholds env vars marked Sensitive from that step. So the build had no
// working SUPABASE_SERVICE_ROLE_KEY: all four queries below answered "Invalid
// API key", `|| []` turned each one into an empty table, and every deploy
// shipped a prerendered sitemap with no towns, jobs, businesses or blog posts
// in it — 150 URLs instead of 628. It only ever filled in if the page happened
// to be revalidated at runtime, where the key does work.
//
// Rendering on demand also answers the original reason for the ISR: at build
// time these queries could exceed the 60s static-generation limit and break
// the deploy. Crawlers fetch this a handful of times a day, so four queries
// per request costs nothing.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient();

  // Fetch dynamic content in parallel
  const notExpired = `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`;

  const [townsResult, jobsResult, blogResult, businessResult] = await Promise.allSettled([
    fetchAllRows<{ slug: string; updated_at: string | null }>(
      (from, to) => admin.from("nearby_towns").select("slug, updated_at").range(from, to),
      "nearby_towns"
    ),
    fetchAllRows<{ id: string; published_at: string | null; created_at: string; business_id: string | null }>(
      (from, to) =>
        admin
          // ⚠️ job_posts has no updated_at. Asking for one made PostgREST answer
          // with an error, `|| []` turned that into "no jobs", and every listing
          // silently vanished from the sitemap — on a job board. business_id is
          // here for the business-page filter below, not for the job pages.
          .from("job_posts")
          .select("id, published_at, created_at, business_id")
          .eq("status", "active")
          // ⚠️ Must agree with lib/jobs/expired-gone.ts. The expiry sweep runs once
          // a day, so there is always a window where a listing is past its date and
          // the row still says active — and in that window /jobs/<id> answers 410.
          // Advertising a url in the sitemap that answers Gone is the kind of
          // contradiction that costs crawl trust.
          .or(notExpired)
          .range(from, to),
      "job_posts"
    ),
    fetchAllRows<{ slug: string; updated_at: string | null }>(
      (from, to) => admin.from("blog_posts").select("slug, updated_at").eq("status", "published").range(from, to),
      "blog_posts"
    ),
    fetchAllRows<{ id: string; created_at: string; is_claimed: boolean | null; description: string | null }>(
      (from, to) =>
        admin
          // business_profiles has no updated_at either — same silent loss.
          .from("business_profiles")
          // description is here to judge whether a claimed business has a page
          // worth offering Google, not to render anything.
          .select("id, created_at, is_claimed, description")
          .range(from, to),
      "business_profiles"
    ),
  ]);

  const failures = ([
    ["nearby_towns", townsResult],
    ["job_posts", jobsResult],
    ["blog_posts", blogResult],
    ["business_profiles", businessResult],
  ] as const).filter(([, result]) => result.status === "rejected");

  if (failures.length > 0) {
    for (const [table, result] of failures) {
      console.error(
        `sitemap: ${table} query failed:`,
        result.status === "rejected" ? result.reason : undefined
      );
    }
    // Throw rather than publish a short sitemap. A failed query used to look
    // exactly like an empty table, so a single bad moment cached a sitemap
    // missing hundreds of URLs for a full hour — which is precisely what
    // Supabase's JWT-rejection incident did on 2026-09-19. When regeneration
    // throws, ISR keeps serving the last good copy instead.
    throw new Error(
      `sitemap: query failed for ${failures.map(([table]) => table).join(", ")}`
    );
  }

  // Safe after the throw above: every settled result here is fulfilled.
  const towns = townsResult.status === "fulfilled" ? townsResult.value : [];
  const jobs = jobsResult.status === "fulfilled" ? jobsResult.value : [];
  const blogPosts = blogResult.status === "fulfilled" ? blogResult.value : [];
  const businesses = businessResult.status === "fulfilled" ? businessResult.value : [];

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
      url: `${BASE_URL}/for-employers`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
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
      // The first of the AEO data pages. High priority because it answers the
      // question the ad traffic and the search traffic are both asking.
      url: `${BASE_URL}/ski-season-pay`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/ski-pass-and-meals`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${BASE_URL}/staff-housing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
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
    // Omitted while the directory is hidden — submitting a URL that answers
    // 404 is a crawl error, not a neutral no-op.
    ...(EMPLOYERS_DIRECTORY_ENABLED
      ? [
          {
            url: `${BASE_URL}/employers`,
            lastModified: new Date(),
            changeFrequency: "monthly" as const,
            priority: 0.7,
          },
        ]
      : []),
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

  // Employer landing pages — one per live market (business-facing mirror of
  // the ski-resort-jobs country pages).
  const employerPages: MetadataRoute.Sitemap = EMPLOYER_MARKETS.map((m) => ({
    url: `${BASE_URL}/for-employers/${m.slug}`,
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
    lastModified: new Date(job.published_at ?? job.created_at),
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

  // Business profile pages — only the ones with something on them: a live
  // listing, or an owner who claimed the account. Every row used to be listed,
  // and on 2026-09-19 that was 64 of 191 pages with neither: import shells
  // that were never claimed, plus the retired duplicates of migrations 00095,
  // 00097 and 00101. Empty pages offered to Google compete with the real ones,
  // and the retired shells share their names.
  const businessesWithLiveJobs = new Set(
    jobs.map((job) => job.business_id).filter((id): id is string => Boolean(id))
  );

  /**
   * A business page earns a sitemap entry when it has something on it.
   *
   * A LIVE JOB IS CONTENT. 163 of the 164 businesses with live listings have
   * no description and no logo, and they are not thin pages — the listings are
   * what the page is for. Judging them on profile fields alone would drop the
   * most useful business pages on the site.
   *
   * Claiming is not content. It used to be enough on its own, which let in 13
   * claimed businesses with no live listing — 8 of them with no description
   * either, so the page is a name and nothing else. A claimed business between
   * seasons keeps its entry if it has actually written something.
   */
  const businessPages: MetadataRoute.Sitemap = businesses
    .filter((biz) => businessBelongsInSitemap(biz, businessesWithLiveJobs))
    .map((biz) => ({
      url: `${BASE_URL}/business/${biz.id}`,
      lastModified: new Date(biz.created_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return [
    ...staticPages,
    ...resortPages,
    ...skiJobCountryPages,
    ...employerPages,
    ...regionPages,
    ...townPages,
    ...jobPages,
    ...blogPages,
    ...businessPages,
  ];
}

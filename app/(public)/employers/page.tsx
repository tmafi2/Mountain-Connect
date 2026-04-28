import { createPublicClient } from "@/lib/supabase/public";
import EmployersClient from "./EmployersClient";
import type { Business } from "./EmployersClient";

// Cache for 5 minutes — businesses change less often than jobs.
export const revalidate = 300;

export const metadata = {
  title: "Employers | Mountain Connects",
  description:
    "Discover ski resort businesses hiring seasonal workers worldwide. Browse by resort, country, or industry.",
};

export default async function EmployersPage() {
  let businesses: Business[] = [];
  let allResorts: { id: string; name: string }[] = [];
  let legacyResortMap: Record<string, string> = {};

  try {
    const supabase = createPublicClient();

    // Run all independent queries in parallel
    const [bpsResult, allResortsResult] = await Promise.all([
      supabase
        .from("business_profiles")
        .select("id, business_name, logo_url, description, location, country, industries, verification_status, resort_id, operates_in_town, nearby_town_id, tier")
        .order("verification_status", { ascending: true })
        .order("business_name", { ascending: true }),
      supabase
        .from("resorts")
        .select("id, name, legacy_id")
        .order("name", { ascending: true }),
    ]);

    const bps = bpsResult.data;
    const allResortsData = allResortsResult.data;

    // Build resort lookup from single query (replaces 4 separate resort queries)
    const resortNameMap: Record<string, string> = {};
    if (allResortsData) {
      allResorts = allResortsData.map((r) => ({ id: r.id, name: r.name }));
      for (const r of allResortsData) {
        resortNameMap[r.id] = r.name;
        if (r.legacy_id) legacyResortMap[r.legacy_id] = r.id;
      }
    }

    if (bps && bps.length > 0) {
      const bizIds = bps.map((b) => b.id);

      // Run dependent queries in parallel
      const [jobsResult, bizResortsResult, reviewsResult] = await Promise.all([
        supabase
          .from("job_posts")
          .select("business_id, resort_id")
          .in("business_id", bizIds)
          .eq("status", "active"),
        supabase
          .from("business_resorts")
          .select("business_id, resort_id")
          .in("business_id", bizIds),
        supabase
          .from("business_reviews")
          .select("business_id, rating")
          .in("business_id", bizIds),
      ]);

      // Count active listings per business + collect job resort links
      const jobCounts: Record<string, number> = {};
      const jobResortLinks: { business_id: string; resort_id: string }[] = [];
      if (jobsResult.data) {
        for (const j of jobsResult.data) {
          jobCounts[j.business_id] = (jobCounts[j.business_id] || 0) + 1;
          if (j.resort_id) {
            jobResortLinks.push({ business_id: j.business_id, resort_id: j.resort_id });
          }
        }
      }

      // Build resort mappings per business from business_resorts
      const resortMap: Record<string, string[]> = {};
      const resortIdMap: Record<string, string[]> = {};

      if (bizResortsResult.data) {
        for (const br of bizResortsResult.data) {
          if (!resortMap[br.business_id]) resortMap[br.business_id] = [];
          if (!resortIdMap[br.business_id]) resortIdMap[br.business_id] = [];
          const name = resortNameMap[br.resort_id];
          if (name && !resortMap[br.business_id].includes(name)) {
            resortMap[br.business_id].push(name);
            resortIdMap[br.business_id].push(br.resort_id);
          }
        }
      }

      // Add direct resort_id from business_profiles
      for (const b of bps) {
        if (b.resort_id && resortNameMap[b.resort_id]) {
          if (!resortMap[b.id]) resortMap[b.id] = [];
          if (!resortIdMap[b.id]) resortIdMap[b.id] = [];
          if (!resortIdMap[b.id].includes(b.resort_id)) {
            resortMap[b.id].push(resortNameMap[b.resort_id]);
            resortIdMap[b.id].push(b.resort_id);
          }
        }
      }

      // Add resort links from active job posts
      for (const jrl of jobResortLinks) {
        if (resortNameMap[jrl.resort_id]) {
          if (!resortMap[jrl.business_id]) resortMap[jrl.business_id] = [];
          if (!resortIdMap[jrl.business_id]) resortIdMap[jrl.business_id] = [];
          if (!resortIdMap[jrl.business_id].includes(jrl.resort_id)) {
            resortMap[jrl.business_id].push(resortNameMap[jrl.resort_id]);
            resortIdMap[jrl.business_id].push(jrl.resort_id);
          }
        }
      }

      // Build review stats
      const reviewStats: Record<string, { total: number; sum: number }> = {};
      if (reviewsResult.data) {
        for (const r of reviewsResult.data) {
          if (!reviewStats[r.business_id]) reviewStats[r.business_id] = { total: 0, sum: 0 };
          reviewStats[r.business_id].total++;
          reviewStats[r.business_id].sum += r.rating;
        }
      }

      // Map to Business type
      businesses = bps.map((b) => ({
        id: b.id,
        business_name: b.business_name,
        logo_url: b.logo_url,
        description: b.description,
        location: b.location,
        country: b.country,
        industries: b.industries,
        verification_status: b.verification_status,
        resort_names: resortMap[b.id] || [],
        resort_ids: resortIdMap[b.id] || [],
        active_listings: jobCounts[b.id] || 0,
        operates_in_town: b.operates_in_town ?? false,
        nearby_town_id: b.nearby_town_id ?? null,
        tier: ((b as Record<string, unknown>).tier as Business["tier"]) || "free",
        avg_rating: reviewStats[b.id] ? reviewStats[b.id].sum / reviewStats[b.id].total : 0,
        review_count: reviewStats[b.id]?.total || 0,
      }));
    }
  } catch (err) {
    console.error("Failed to fetch employers:", err);
  }

  return (
    <EmployersClient
      initialBusinesses={businesses}
      initialResorts={allResorts}
      initialLegacyResortMap={legacyResortMap}
    />
  );
}

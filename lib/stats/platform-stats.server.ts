import { createClient } from "@/lib/supabase/server";
import { EMPTY_STATS, type PlatformStats } from "./platform-stats";

/**
 * The query half, kept apart from the types and the formatter because
 * AboutClient is a client component: importing this file from one pulls
 * `next/headers` into the browser bundle and the route 500s. Typecheck does
 * not catch it — only rendering the page does.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    const supabase = await createClient();

    const [resortRows, townCount, jobCount] = await Promise.all([
      supabase.from("resorts").select("country"),
      supabase.from("nearby_towns").select("id", { count: "exact", head: true }),
      supabase.from("job_posts").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

    if (resortRows.error || townCount.error || jobCount.error) {
      console.error(
        "platform-stats: query failed:",
        resortRows.error?.message ?? townCount.error?.message ?? jobCount.error?.message
      );
      return EMPTY_STATS;
    }

    const rows = (resortRows.data ?? []) as { country: string | null }[];
    const countries = new Set(rows.map((r) => (r.country ?? "").trim()).filter(Boolean));

    return {
      resorts: rows.length,
      countries: countries.size,
      towns: townCount.count ?? 0,
      liveJobs: jobCount.count ?? 0,
    };
  } catch (err) {
    console.error("platform-stats: unavailable:", err);
    return EMPTY_STATS;
  }
}

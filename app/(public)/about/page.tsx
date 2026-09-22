import AboutClient from "./AboutClient";
import { getPlatformStats } from "@/lib/stats/platform-stats.server";

/**
 * Server shell around the (client) About page, so the numbers it quotes come
 * from the database instead of from literals typed in April — see
 * lib/stats/platform-stats.ts for what that cost.
 *
 * force-dynamic, not revalidate: `revalidate` still lets Next prerender at
 * build time, where the Sensitive Supabase keys are withheld and every query
 * fails. That is how sitemap.xml shipped empty (57fb081). This page is not
 * hot enough for the per-request query to matter.
 */
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const stats = await getPlatformStats();
  return <AboutClient stats={stats} />;
}

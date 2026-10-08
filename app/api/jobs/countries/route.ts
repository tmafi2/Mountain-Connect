import { NextResponse } from "next/server";
import { countriesWithLiveJobs } from "@/lib/jobs/live-countries";

/**
 * GET /api/jobs/countries → ["Canada", "France", "Japan"]
 *
 * Exists for worker onboarding, which is a client component and so cannot run
 * the query itself, but must not send a new worker to a country-filtered board
 * that turns out to be empty. Public, because the job board it describes is.
 *
 * `force-dynamic` for the reason in 57fb081: `revalidate` still prerenders at
 * build time, where the Sensitive Supabase keys are withheld, so the list
 * would be baked empty.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ countries: await countriesWithLiveJobs() });
}

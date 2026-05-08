import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyFollowersNewJob } from "@/lib/notifications/notify-followers";
import { rateLimit } from "@/lib/rate-limit";
import { formatPay } from "@/lib/utils/format-pay";

/**
 * POST /api/jobs/notify-followers
 * Called from the post-job flow after a new active job is inserted.
 * Looks up the job, business, and venue, then fans out an in-app
 * notification + email to every business follower.
 *
 * Body: { jobId: string }
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "email" });
  if (rateLimited) return rateLimited;

  let body: { jobId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const jobId = body.jobId?.trim();
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ ok: false, reason: "Supabase not configured" });
  }

  const { data: jobRaw, error: jobErr } = await admin
    .from("job_posts")
    .select(
      "id, title, business_id, pay_amount, pay_currency, salary_range, " +
        "business_profiles(business_name), " +
        "business_venues(name, is_primary), " +
        "resorts(name, country), " +
        "nearby_towns(name)"
    )
    .eq("id", jobId)
    .maybeSingle();

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 });
  if (!jobRaw) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // Supabase's inferred type for embedded selects fights us when the
  // relation column shares a name with the table; cast through unknown
  // and pull the fields we need into a typed view.
  const job = jobRaw as unknown as {
    id: string;
    title: string;
    business_id: string;
    pay_amount: string | null;
    pay_currency: string | null;
    salary_range: string | null;
    business_profiles: { business_name: string } | null;
    business_venues: { name: string; is_primary: boolean } | null;
    resorts: { name: string; country: string } | null;
    nearby_towns: { name: string } | null;
  };

  if (!job.business_profiles) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const location = [job.nearby_towns?.name, job.resorts?.name, job.resorts?.country]
    .filter(Boolean)
    .join(", ");
  const pay = formatPay(job.pay_amount, job.pay_currency, job.salary_range) || "";
  const jobUrl = `https://www.mountainconnects.com/jobs?open=${job.id}`;

  await notifyFollowersNewJob({
    businessId: job.business_id,
    businessName: job.business_profiles.business_name,
    venueName:
      job.business_venues && !job.business_venues.is_primary
        ? job.business_venues.name
        : null,
    jobTitle: job.title,
    jobUrl,
    location,
    pay,
  });

  return NextResponse.json({ ok: true });
}

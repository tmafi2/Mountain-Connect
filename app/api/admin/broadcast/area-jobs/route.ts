import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { rateLimit } from "@/lib/rate-limit";
import { sendAreaJobsUpdateEmail } from "@/lib/email/send";
import { findBroadcastArea } from "@/lib/broadcast-areas";
import { formatPay } from "@/lib/utils/format-pay";

const BASE_URL = "https://www.mountainconnects.com";
const MAX_JOBS_IN_EMAIL = 5;
const SEND_BATCH_SIZE = 25; // chunk parallel sends to stay under Resend rate limits

interface SendOutcome {
  email: string;
  status: "sent" | "failed";
  message?: string;
}

interface JobRow {
  id: string;
  title: string;
  pay_amount: string | null;
  pay_currency: string | null;
  resorts: { name: string; country: string } | null;
  nearby_towns: { name: string } | null;
  business_profiles: { business_name: string } | null;
}

interface WorkerRow {
  id: string;
  email: string;
  worker_profiles: { first_name: string | null } | null;
}

/**
 * POST /api/admin/broadcast/area-jobs
 * Body: { areaKey: string, testOnly?: boolean }
 *
 * Blasts an "X new jobs are live in {area}" email to all worker users
 * (or just the calling admin's own email when testOnly is true).
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { admin, user } = auth;

  let body: { areaKey?: string; testOnly?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const areaKey = body.areaKey?.trim();
  const testOnly = !!body.testOnly;
  if (!areaKey) {
    return NextResponse.json({ error: "Missing areaKey" }, { status: 400 });
  }

  const area = findBroadcastArea(areaKey);
  if (!area) {
    return NextResponse.json(
      { error: `Unknown area "${areaKey}"` },
      { status: 400 }
    );
  }

  // Resolve legacy resort IDs to live UUIDs.
  const { data: resortRows, error: resortErr } = await admin
    .from("resorts")
    .select("id, legacy_id")
    .in("legacy_id", area.resortLegacyIds);

  if (resortErr) {
    return NextResponse.json({ error: resortErr.message }, { status: 500 });
  }

  const resortUuids = (resortRows ?? []).map((r) => r.id);
  if (resortUuids.length === 0) {
    return NextResponse.json(
      { error: "No resorts found for this area" },
      { status: 500 }
    );
  }

  // Pull the newest 5 active jobs in the area.
  const { data: jobs, error: jobsErr } = await admin
    .from("job_posts")
    .select(
      "id, title, pay_amount, pay_currency, " +
        "resorts(name, country), nearby_towns(name), " +
        "business_profiles(business_name)"
    )
    .in("resort_id", resortUuids)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(MAX_JOBS_IN_EMAIL);

  if (jobsErr) {
    return NextResponse.json({ error: jobsErr.message }, { status: 500 });
  }

  const typedJobs = (jobs ?? []) as unknown as JobRow[];
  if (typedJobs.length === 0) {
    return NextResponse.json(
      { error: "No active jobs found in this area to broadcast" },
      { status: 400 }
    );
  }

  const emailJobs = typedJobs.map((j) => ({
    title: j.title,
    businessName: j.business_profiles?.business_name ?? "An employer",
    location: [j.nearby_towns?.name, j.resorts?.country].filter(Boolean).join(", "),
    pay: formatPay(j.pay_amount, j.pay_currency) ?? "",
    jobUrl: `${BASE_URL}/jobs?open=${j.id}`,
  }));

  const browseUrl = `${BASE_URL}${area.browseUrlPath}`;

  // Resolve recipients — either just the admin (test mode) or every
  // worker user.
  let recipients: WorkerRow[] = [];

  if (testOnly) {
    if (!user.email) {
      return NextResponse.json(
        { error: "Admin user has no email on file" },
        { status: 500 }
      );
    }
    recipients = [
      {
        id: user.id,
        email: user.email,
        worker_profiles: { first_name: "there" },
      },
    ];
  } else {
    const { data: workers, error: workersErr } = await admin
      .from("users")
      .select("id, email, worker_profiles(first_name)")
      .eq("role", "worker");

    if (workersErr) {
      return NextResponse.json({ error: workersErr.message }, { status: 500 });
    }

    recipients = (workers ?? []).filter(
      (w) => typeof w.email === "string" && w.email.length > 0
    ) as unknown as WorkerRow[];

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No worker recipients found" },
        { status: 400 }
      );
    }
  }

  // Send in chunks so we don't hammer Resend.
  const outcomes: SendOutcome[] = [];

  for (let i = 0; i < recipients.length; i += SEND_BATCH_SIZE) {
    const batch = recipients.slice(i, i + SEND_BATCH_SIZE);
    const settled = await Promise.allSettled(
      batch.map(async (worker) => {
        const firstName = worker.worker_profiles?.first_name?.trim() || "there";
        await sendAreaJobsUpdateEmail({
          to: worker.email,
          workerName: firstName,
          areaName: area.displayName,
          jobs: emailJobs,
          browseUrl,
        });
        return worker.email;
      })
    );
    for (let j = 0; j < settled.length; j++) {
      const result = settled[j];
      const email = batch[j].email;
      if (result.status === "fulfilled") {
        outcomes.push({ email, status: "sent" });
      } else {
        const reason = result.reason;
        const msg = reason instanceof Error ? reason.message : String(reason);
        console.error(`broadcast/area-jobs: failed to send to ${email}: ${msg}`);
        outcomes.push({ email, status: "failed", message: msg });
      }
    }
  }

  const summary = {
    area: area.displayName,
    testOnly,
    total: outcomes.length,
    sent: outcomes.filter((o) => o.status === "sent").length,
    failed: outcomes.filter((o) => o.status === "failed").length,
    jobsIncluded: emailJobs.length,
  };

  return NextResponse.json({ summary, outcomes });
}

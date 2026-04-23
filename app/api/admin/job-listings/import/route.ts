import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com";

/**
 * POST /api/admin/job-listings/import
 *
 * Machine-to-machine import endpoint for Notion-sourced listings.
 * Authenticated via bearer token (IMPORT_API_KEY env var) — NOT the
 * cookie-based admin session used by the in-browser admin panel.
 *
 * Behavior is idempotent on `notion_id`: re-sending the same page
 * updates the existing listing in place rather than creating a
 * duplicate. Status is preserved on updates so an already-approved
 * listing does not silently drop back to draft when Notion re-syncs.
 * New listings land as draft + pending_approval=true so they surface
 * in the existing Pending approval queue at /admin/jobs.
 *
 * Business shell profiles are reused when the same email is imported
 * again. If the business has already claimed their account, we attach
 * the job to their live profile directly.
 */
export async function POST(request: Request) {
  // Bearer token auth
  const apiKey = process.env.IMPORT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Import API is not configured" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  const providedToken = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!providedToken || providedToken !== apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Accept both camelCase and snake_case so external automation (e.g.
  // Cowork push tasks) can evolve its payload format without breaking us.
  // sourceUrl also accepts "original_post_url" as an alias since that is
  // what the Notion column is called.
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = body[k];
      if (typeof v === "string") return v.trim();
    }
    return "";
  };

  const businessName = pick("businessName", "business_name");
  const jobTitle = pick("jobTitle", "job_title");
  const description = pick("description");
  const location = pick("location");
  const country = pick("country");
  const businessEmail = pick("businessEmail", "business_email").toLowerCase();
  const applicationEmail = pick("applicationEmail", "application_email");
  const source = pick("source");
  const sourceUrl = pick("sourceUrl", "source_url", "original_post_url");
  const datePosted = pick("datePosted", "date_posted");
  const notionId = pick("notionId", "notion_id");
  const rawResortId = pick("resortId", "resort_id");
  const resortName = pick("resortName", "resort_name");

  if (!notionId) return NextResponse.json({ error: "notionId is required" }, { status: 400 });
  if (!businessName) return NextResponse.json({ error: "businessName is required" }, { status: 400 });
  if (!jobTitle) return NextResponse.json({ error: "jobTitle is required" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "description is required" }, { status: 400 });
  if (!businessEmail) return NextResponse.json({ error: "businessEmail is required" }, { status: 400 });
  if (!source) return NextResponse.json({ error: "source is required" }, { status: 400 });
  if (!rawResortId && !resortName) {
    return NextResponse.json({ error: "resortId or resortName is required" }, { status: 400 });
  }

  // Length caps to prevent oversized payloads from bloating the DB.
  const limits: Record<string, [string, number]> = {
    businessName: [businessName, 200],
    jobTitle: [jobTitle, 200],
    description: [description, 5000],
    location: [location, 200],
    country: [country, 100],
    businessEmail: [businessEmail, 200],
    applicationEmail: [applicationEmail, 200],
    source: [source, 200],
    sourceUrl: [sourceUrl, 2048],
    datePosted: [datePosted, 50],
    notionId: [notionId, 100],
    resortId: [rawResortId, 100],
    resortName: [resortName, 200],
  };
  for (const [field, [value, max]] of Object.entries(limits)) {
    if (value.length > max) {
      return NextResponse.json(
        { error: `${field} exceeds maximum length of ${max} characters` },
        { status: 400 }
      );
    }
  }

  const admin = createAdminClient();

  // Resolve the resort. Accept either a UUID (resortId) or a friendly
  // resort name (resortName) so Notion automations can pass the name
  // without having to look up UUIDs first.
  let resortId = rawResortId;
  if (!resortId && resortName) {
    const { data: resort } = await admin
      .from("resorts")
      .select("id")
      .ilike("name", resortName)
      .maybeSingle();
    if (!resort) {
      return NextResponse.json(
        { error: `Resort not found: "${resortName}"` },
        { status: 400 }
      );
    }
    resortId = resort.id;
  }

  // Find-or-create the business profile shell by email (same pattern as
  // the manual admin import). If already claimed, we attach to it but
  // never overwrite claimed data.
  let businessId: string;
  const { data: existingBiz } = await admin
    .from("business_profiles")
    .select("id, is_claimed")
    .eq("email", businessEmail)
    .maybeSingle();

  if (existingBiz) {
    businessId = existingBiz.id;
  } else {
    const { data: newBiz, error: bizErr } = await admin
      .from("business_profiles")
      .insert({
        user_id: null,
        business_name: businessName,
        email: businessEmail,
        location: location || null,
        country: country || null,
        resort_id: resortId || null,
        verification_status: "unverified",
        is_claimed: false,
      })
      .select("id")
      .single();

    if (bizErr || !newBiz) {
      console.error("Failed to create shell business_profile:", bizErr);
      return NextResponse.json({ error: "Failed to create business profile" }, { status: 500 });
    }
    businessId = newBiz.id;
  }

  // Upsert the job by notion_id
  const { data: existingJob } = await admin
    .from("job_posts")
    .select("id, status")
    .eq("notion_id", notionId)
    .maybeSingle();

  const sharedFields = {
    business_id: businessId,
    resort_id: resortId || null,
    title: jobTitle,
    description,
    source,
    source_url: sourceUrl || null,
    application_email: applicationEmail || null,
    notion_id: notionId,
  };

  let jobId: string;
  if (existingJob) {
    // Preserve status on updates so an already-published listing
    // does not silently revert to draft on a Notion re-sync.
    const { error: updateErr } = await admin
      .from("job_posts")
      .update({
        ...sharedFields,
        ...(datePosted ? { created_at: datePosted } : {}),
      })
      .eq("id", existingJob.id);

    if (updateErr) {
      console.error("Failed to update imported job:", updateErr);
      return NextResponse.json({ error: "Failed to update listing" }, { status: 500 });
    }
    jobId = existingJob.id;
  } else {
    const { data: newJob, error: insertErr } = await admin
      .from("job_posts")
      .insert({
        ...sharedFields,
        status: "draft",
        is_active: false,
        pending_approval: true,
        ...(datePosted ? { created_at: datePosted } : {}),
      })
      .select("id")
      .single();

    if (insertErr || !newJob) {
      console.error("Failed to insert imported job:", insertErr);
      return NextResponse.json({ error: "Failed to create listing" }, { status: 500 });
    }
    jobId = newJob.id;
  }

  return NextResponse.json({
    id: jobId,
    url: `${BASE_URL}/jobs/${jobId}`,
    created: !existingJob,
    status: existingJob?.status || "draft",
  });
}

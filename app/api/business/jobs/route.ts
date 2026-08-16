import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";
import { checkPostGate } from "@/lib/billing/post-gate";

/**
 * POST /api/business/jobs
 *
 * Creates a job post for the caller's business, enforcing the plan's
 * posting limit SERVER-SIDE. This replaces the previous direct
 * client-side `supabase.from("job_posts").insert(...)`, which meant the
 * tier limit was only ever checked in the browser and could be bypassed
 * by calling the Supabase REST endpoint directly.
 *
 * Body: { job: <job_posts row minus business_id>, status: "active" | "draft" }
 *
 * Rules:
 *  - business_id is always taken from the authenticated user's own
 *    profile, never from the body.
 *  - Drafts are NOT gated — saving work never costs a slot. The gate fires
 *    when a post goes live (here for status="active", and in
 *    publish-drafts for the draft→active flip).
 *  - Insert uses the user-scoped client so RLS ownership still applies.
 *
 * Responses:
 *  201 { job }                        created
 *  403 { error, gate }                plan limit reached; `gate` carries
 *                                     effectiveTier/limit/reason for the UI
 *  400 / 401 / 404 / 500              usual
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "post-job", limit: 30, window: "1 m" });
  if (rateLimited) return rateLimited;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: business } = await supabase
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!business) return NextResponse.json({ error: "Business profile not found" }, { status: 404 });

    let body: { job?: Record<string, unknown>; status?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const status = body.status === "draft" ? "draft" : "active";
    const job = body.job;
    if (!job || typeof job !== "object") {
      return NextResponse.json({ error: "Missing job" }, { status: 400 });
    }
    if (typeof job.title !== "string" || !job.title.trim()) {
      return NextResponse.json({ error: "Job title is required" }, { status: 400 });
    }
    if (status === "active" && (typeof job.description !== "string" || !job.description.trim())) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }
    if (typeof job.resort_id !== "string" || !job.resort_id) {
      return NextResponse.json({ error: "Resort is required" }, { status: 400 });
    }

    // Enforce the plan limit for anything going live.
    if (status === "active") {
      const gate = await checkPostGate(supabase, business.id);
      if (!gate.allowed) {
        return NextResponse.json(
          {
            error:
              gate.reason === "free_limit"
                ? "You've used your free job post. Choose a plan to keep posting."
                : `Your plan allows ${gate.limit} active job listings. Upgrade to post more.`,
            gate,
          },
          { status: 403 }
        );
      }
    }

    // Never trust business_id / status / is_active from the client.
    const row = {
      ...job,
      business_id: business.id,
      status,
      is_active: status === "active",
    };

    const { data: inserted, error } = await supabase
      .from("job_posts")
      .insert(row)
      .select("id, title, created_at")
      .single();

    if (error) {
      console.error("job insert failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ job: inserted }, { status: 201 });
  } catch (err) {
    console.error("POST /api/business/jobs error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

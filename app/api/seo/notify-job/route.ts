import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyGoogleIndexing } from "@/lib/seo/google-indexing";

const BASE_URL = "https://www.mountainconnects.com";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { jobId, type } = body as { jobId?: string; type?: "URL_UPDATED" | "URL_DELETED" };

  if (!jobId || !type) {
    return NextResponse.json({ error: "jobId and type are required" }, { status: 400 });
  }

  // Verify the caller owns the job (or is an admin)
  const admin = createAdminClient();
  const { data: job } = await admin
    .from("job_posts")
    .select("id, business_id")
    .eq("id", jobId)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: business } = await admin
    .from("business_profiles")
    .select("user_id")
    .eq("id", job.business_id)
    .single();

  const { data: caller } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  const isOwner = business?.user_id === user.id;
  const isAdmin = caller?.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await notifyGoogleIndexing(`${BASE_URL}/jobs/${jobId}`, type);
  return NextResponse.json(result);
}

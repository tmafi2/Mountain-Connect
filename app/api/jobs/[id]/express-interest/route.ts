import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/jobs/[id]/express-interest
 *
 * Anonymous endpoint. Lets a job seeker submit a name / email / phone /
 * message against an UNCLAIMED job listing. The EOI is held until the
 * real business claims the listing, at which point it appears in their
 * dashboard.
 *
 * Rate limited by IP to prevent spam.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimited = await rateLimit(request, { identifier: "eoi" });
    if (rateLimited) return rateLimited;

    const { id: jobId } = await params;
    if (!jobId) return NextResponse.json({ error: "Missing job id" }, { status: 400 });

    const body = await request.json();
    const { name, email, phone, message } = body as {
      name?: string;
      email?: string;
      phone?: string;
      message?: string;
    };

    // Validation
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    // Length caps
    if (name.length > 200) return NextResponse.json({ error: "Name too long" }, { status: 400 });
    if (email.length > 200) return NextResponse.json({ error: "Email too long" }, { status: 400 });
    if (phone && phone.length > 50) return NextResponse.json({ error: "Phone too long" }, { status: 400 });
    if (message && message.length > 2000) return NextResponse.json({ error: "Message too long" }, { status: 400 });

    const admin = createAdminClient();

    // Check the job exists and the business is unclaimed
    const { data: job } = await admin
      .from("job_posts")
      .select("id, status, business_profiles!inner(is_claimed)")
      .eq("id", jobId)
      .single();

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (job.status !== "active") {
      return NextResponse.json({ error: "This job is no longer accepting interest" }, { status: 400 });
    }
    const biz = job.business_profiles as unknown as { is_claimed: boolean };
    if (biz?.is_claimed) {
      return NextResponse.json(
        { error: "This listing has been claimed. Please apply through the normal flow." },
        { status: 400 }
      );
    }

    // Insert EOI
    const { error: insertError } = await admin.from("expressions_of_interest").insert({
      job_post_id: jobId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      message: message?.trim() || null,
    });

    if (insertError) {
      console.error("Failed to insert EOI:", insertError);
      return NextResponse.json({ error: "Failed to submit interest" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("EOI error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

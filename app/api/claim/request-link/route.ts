import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { sendClaimLinkEmail } from "@/lib/email/send";

/**
 * POST /api/claim/request-link
 *
 * Self-serve flow. A business owner sees their unclaimed listing in the
 * wild, clicks "Is this your business?", and enters their email. If the
 * email matches the contact on file, we send them a claim link email.
 * If not, we still return a generic success response so we don't leak
 * which emails are or aren't on the platform.
 */
export async function POST(request: Request) {
  try {
    // Stricter rate limit — this endpoint sends email
    const rateLimited = await rateLimit(request, { identifier: "claim-request" });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { email, jobId } = body as { email?: string; jobId?: string };

    if (!email?.trim() || !jobId) {
      return NextResponse.json({ error: "Missing email or job id" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const admin = createAdminClient();

    // Look up the job and the linked business profile in one query.
    // Match the business email case-insensitively.
    const { data: job } = await admin
      .from("job_posts")
      .select("id, title, business_profiles!inner(id, business_name, email, is_claimed, claim_token)")
      .eq("id", jobId)
      .single();

    // Always return generic success to prevent email enumeration.
    const genericSuccess = NextResponse.json({ success: true });

    if (!job) return genericSuccess;

    const biz = job.business_profiles as unknown as {
      id: string;
      business_name: string;
      email: string | null;
      is_claimed: boolean;
      claim_token: string | null;
    };

    // No match if business already claimed, no matching email, or no token
    if (
      !biz ||
      biz.is_claimed ||
      !biz.claim_token ||
      biz.email?.toLowerCase() !== normalizedEmail
    ) {
      return genericSuccess;
    }

    // Send the claim link email
    const claimUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com"}/claim/${biz.claim_token}`;
    sendClaimLinkEmail({
      to: normalizedEmail,
      businessName: biz.business_name,
      jobTitle: job.title as string,
      claimUrl,
    }).catch((err) => console.error("Failed to send claim-link email:", err));

    return genericSuccess;
  } catch (err) {
    console.error("Claim request-link error:", err);
    // Even on error, return generic success so we don't leak info
    return NextResponse.json({ success: true });
  }
}

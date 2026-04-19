import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/log";
import { sendImportOutreachEmail } from "@/lib/email/send";

/**
 * Resolve the site origin for the generated claim URL. Prefer the incoming
 * request's origin so claim links generated on a Vercel preview point at
 * the preview (not production). Fall back to NEXT_PUBLIC_BASE_URL, then
 * the canonical prod URL.
 */
function resolveOrigin(request: Request): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;
  return process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com";
}

/**
 * POST /api/admin/import-listing
 *
 * Admin-only endpoint. Creates a shell business_profile (if one doesn't
 * already exist for the email) and a job_post linked to it. The business
 * is marked is_claimed=false with a unique claim_token that the admin
 * emails to the real business owner so they can take ownership.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: adminUser } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    if (adminUser?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      // Required
      title,
      description,
      businessName,
      businessEmail,
      resortId,
      source,
      // Source / admin extras
      sourceUrl,
      // Business shell info
      location,
      country,
      // Job details mirroring post-job
      category,
      employmentType,
      requirements,
      languageRequirements,
      payCurrency,
      payAmount,
      seasonStart,
      seasonEnd,
      housingIncluded,
      housingDetails,
      accommodationType,
      accommodationCost,
      skiPassIncluded,
      mealsIncluded,
      visaSponsorshipAvailable,
      urgentlyHiring,
      positions,
      showPositions,
      customPerks,
      nearbyTownId,
      // Application routing
      howToApply,
      applicationEmail,
      applicationUrl,
    } = body as {
      title?: string;
      description?: string;
      businessName?: string;
      businessEmail?: string;
      resortId?: string;
      source?: string;
      sourceUrl?: string;
      location?: string;
      country?: string;
      category?: string;
      employmentType?: string;
      requirements?: string;
      languageRequirements?: string;
      payCurrency?: string;
      payAmount?: string;
      seasonStart?: string;
      seasonEnd?: string;
      housingIncluded?: boolean;
      housingDetails?: string;
      accommodationType?: string;
      accommodationCost?: string;
      skiPassIncluded?: boolean;
      mealsIncluded?: boolean;
      visaSponsorshipAvailable?: boolean;
      urgentlyHiring?: boolean;
      positions?: number;
      showPositions?: boolean;
      customPerks?: string[];
      nearbyTownId?: string;
      howToApply?: string;
      applicationEmail?: string;
      applicationUrl?: string;
    };

    // Validation
    if (!title?.trim()) return NextResponse.json({ error: "Job title is required" }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: "Description is required" }, { status: 400 });
    if (!businessName?.trim()) return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    if (!businessEmail?.trim()) return NextResponse.json({ error: "Business email is required" }, { status: 400 });
    if (!resortId) return NextResponse.json({ error: "Resort is required" }, { status: 400 });
    if (!source) return NextResponse.json({ error: "Source is required" }, { status: 400 });

    const email = businessEmail.trim().toLowerCase();

    // Look up existing business_profile by email
    const { data: existing } = await admin
      .from("business_profiles")
      .select("id, is_claimed, claim_token")
      .eq("email", email)
      .maybeSingle();

    let businessId: string;
    let claimToken: string;

    if (existing) {
      if (existing.is_claimed) {
        return NextResponse.json(
          { error: "A claimed business with this email already exists on Mountain Connects. Ask them to post the job from their dashboard instead." },
          { status: 409 }
        );
      }
      // Reuse the existing unclaimed shell
      businessId = existing.id;
      claimToken = existing.claim_token;
    } else {
      // Create a new shell business_profile
      const { data: newBiz, error: bizError } = await admin
        .from("business_profiles")
        .insert({
          user_id: null,
          business_name: businessName.trim(),
          email,
          location: location?.trim() || null,
          country: country?.trim() || null,
          resort_id: resortId,
          verification_status: "unverified",
          is_claimed: false,
          // claim_token is auto-generated by the column default
        })
        .select("id, claim_token")
        .single();

      if (bizError || !newBiz) {
        console.error("Failed to create business_profile:", bizError);
        return NextResponse.json({ error: "Failed to create business profile" }, { status: 500 });
      }

      businessId = newBiz.id;
      claimToken = newBiz.claim_token;
    }

    // Create the job_post
    const positionType =
      employmentType === "Full-time" ? "full_time" :
      employmentType === "Part-time" ? "part_time" :
      employmentType === "Casual" ? "casual" : null;

    const salaryDisplay = payAmount?.trim()
      ? `${payCurrency || "AUD"} ${payAmount.trim()}`
      : null;

    const { data: job, error: jobError } = await admin
      .from("job_posts")
      .insert({
        business_id: businessId,
        resort_id: resortId,
        title: title.trim(),
        description: description.trim(),
        status: "active",
        is_active: true,
        source,
        source_url: sourceUrl?.trim() || null,
        how_to_apply: howToApply?.trim() || null,
        application_email: applicationEmail?.trim() || null,
        application_url: applicationUrl?.trim() || null,
        // Mirrored from post-job
        category: category?.trim() || null,
        position_type: positionType,
        requirements: requirements?.trim() || null,
        language_required: languageRequirements?.trim() || null,
        pay_amount: payAmount?.trim() || null,
        pay_currency: payCurrency || "AUD",
        salary_range: salaryDisplay,
        start_date: seasonStart || null,
        end_date: seasonEnd || null,
        accommodation_included: housingIncluded ?? false,
        housing_details: housingDetails?.trim() || null,
        accommodation_type: accommodationType?.trim() || null,
        accommodation_cost: accommodationCost?.trim() || null,
        ski_pass_included: skiPassIncluded ?? false,
        meal_perks: mealsIncluded ?? false,
        visa_sponsorship: visaSponsorshipAvailable ?? false,
        urgently_hiring: urgentlyHiring ?? false,
        positions_available: positions && positions > 0 ? positions : 1,
        show_positions: showPositions ?? true,
        custom_perks: customPerks && customPerks.length > 0 ? customPerks : null,
        nearby_town_id: nearbyTownId || null,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      console.error("Failed to create job_post:", jobError);
      return NextResponse.json({ error: "Failed to create job post" }, { status: 500 });
    }

    // Log the admin action
    await logAdminAction({
      adminId: user.id,
      action: "business_approved", // closest existing action type; audit table is permissive text
      targetType: "business",
      targetId: businessId,
      details: { imported: true, job_id: job.id, source, business_name: businessName, email },
    }).catch(() => {});

    // Build the outreach email text (kept for the response so the UI can preview / fall back)
    const claimUrl = `${resolveOrigin(request)}/claim/${claimToken}`;
    const outreachEmail = buildOutreachEmail({
      businessName: businessName.trim(),
      jobTitle: title.trim(),
      source,
      claimUrl,
      eoiCount: 0,
    });

    // Send the outreach email automatically from tyler@mountainconnects.com
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const result = await sendImportOutreachEmail({
        to: email,
        businessName: businessName.trim(),
        jobTitle: title.trim(),
        source,
        claimUrl,
        eoiCount: 0,
      });
      emailSent = !!result;
      if (!result) emailError = "Email service is not configured";
    } catch (err) {
      console.error("Failed to send import outreach email:", err);
      emailError = err instanceof Error ? err.message : "Unknown email error";
    }

    return NextResponse.json({
      success: true,
      businessId,
      jobId: job.id,
      claimToken,
      claimUrl,
      outreachEmail,
      emailSent,
      emailError,
      sentTo: email,
    });
  } catch (err) {
    console.error("Import listing error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function buildOutreachEmail(params: {
  businessName: string;
  jobTitle: string;
  source: string;
  claimUrl: string;
  eoiCount: number;
}) {
  const { businessName, jobTitle, source, claimUrl, eoiCount } = params;
  const eoiLine = eoiCount > 0
    ? `It's already live and we've received ${eoiCount} ${eoiCount === 1 ? "expression" : "expressions"} of interest from job seekers.`
    : `It's already live and ready for job seekers to browse.`;

  return {
    subject: `Your ${jobTitle} job on Mountain Connects`,
    body: `Hi ${businessName},

I'm reaching out from Mountain Connects — a new platform connecting ski resort businesses with seasonal workers. I saw your ${jobTitle} listing on ${source} and thought you might be a great fit for the platform.

I've set up a free listing for you to get things started. ${eoiLine}

Claim your listing (free, takes 30 seconds):
${claimUrl}

Once claimed, you'll be able to edit the listing, see all interested candidates, and start interviewing — all in one place.

Cheers,
Mountain Connects`,
  };
}

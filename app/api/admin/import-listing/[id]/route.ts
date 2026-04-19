import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/audit/log";
import { notifyGoogleIndexing } from "@/lib/seo/google-indexing";

const BASE_URL = "https://www.mountainconnects.com";

/**
 * PATCH /api/admin/import-listing/[id]
 *
 * Admin-only endpoint that updates an existing imported listing
 * (its job_post and the associated business_profile shell). Used by
 * the admin import form when ?edit=<jobId> is set. Status is preserved
 * unless the caller explicitly changes it via the publish endpoint.
 * No outreach email is sent on edit.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await context.params;

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

    const { data: existingJob } = await admin
      .from("job_posts")
      .select("id, business_id, status")
      .eq("id", jobId)
      .maybeSingle();

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      // Core
      title,
      description,
      // Business shell
      businessName,
      businessEmail,
      location,
      country,
      // Source / admin extras
      source,
      sourceUrl,
      // Job details
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
      resortId,
      // Application routing
      howToApply,
      applicationEmail,
      applicationUrl,
    } = body as Record<string, unknown>;

    const positionType =
      employmentType === "Full-time" ? "full_time" :
      employmentType === "Part-time" ? "part_time" :
      employmentType === "Casual" ? "casual" : null;

    const trimmedPay = typeof payAmount === "string" ? payAmount.trim() : "";
    const salaryDisplay = trimmedPay ? `${(payCurrency as string) || "AUD"} ${trimmedPay}` : null;

    const jobUpdate: Record<string, unknown> = {
      title: typeof title === "string" ? title.trim() : undefined,
      description: typeof description === "string" ? description.trim() : undefined,
      resort_id: resortId,
      source: source ?? undefined,
      source_url: typeof sourceUrl === "string" ? sourceUrl.trim() || null : undefined,
      how_to_apply: typeof howToApply === "string" ? howToApply.trim() || null : undefined,
      application_email: typeof applicationEmail === "string" ? applicationEmail.trim() || null : undefined,
      application_url: typeof applicationUrl === "string" ? applicationUrl.trim() || null : undefined,
      category: typeof category === "string" ? category.trim() || null : undefined,
      position_type: positionType,
      requirements: typeof requirements === "string" ? requirements.trim() || null : undefined,
      language_required: typeof languageRequirements === "string" ? languageRequirements.trim() || null : undefined,
      pay_amount: trimmedPay || null,
      pay_currency: payCurrency || "AUD",
      salary_range: salaryDisplay,
      start_date: seasonStart || null,
      end_date: seasonEnd || null,
      accommodation_included: housingIncluded ?? false,
      housing_details: typeof housingDetails === "string" ? housingDetails.trim() || null : undefined,
      accommodation_type: typeof accommodationType === "string" ? accommodationType.trim() || null : undefined,
      accommodation_cost: typeof accommodationCost === "string" ? accommodationCost.trim() || null : undefined,
      ski_pass_included: skiPassIncluded ?? false,
      meal_perks: mealsIncluded ?? false,
      visa_sponsorship: visaSponsorshipAvailable ?? false,
      urgently_hiring: urgentlyHiring ?? false,
      positions_available: typeof positions === "number" && positions > 0 ? positions : 1,
      show_positions: showPositions ?? true,
      custom_perks: Array.isArray(customPerks) && customPerks.length > 0 ? customPerks : null,
      nearby_town_id: nearbyTownId || null,
    };

    // Drop undefined keys so we don't accidentally clobber columns the
    // caller didn't send.
    Object.keys(jobUpdate).forEach((k) => jobUpdate[k] === undefined && delete jobUpdate[k]);

    const { error: jobErr } = await admin
      .from("job_posts")
      .update(jobUpdate)
      .eq("id", jobId);

    if (jobErr) {
      console.error("Failed to update job_post:", jobErr);
      return NextResponse.json({ error: jobErr.message }, { status: 500 });
    }

    // Update business shell info if it's still unclaimed. Once a business
    // has claimed their listing they own these fields.
    const { data: business } = await admin
      .from("business_profiles")
      .select("id, is_claimed")
      .eq("id", existingJob.business_id)
      .single();

    if (business && !business.is_claimed) {
      const businessUpdate: Record<string, unknown> = {
        business_name: typeof businessName === "string" ? businessName.trim() : undefined,
        email: typeof businessEmail === "string" ? businessEmail.trim().toLowerCase() : undefined,
        location: typeof location === "string" ? location.trim() || null : undefined,
        country: typeof country === "string" ? country.trim() || null : undefined,
        resort_id: resortId,
      };
      Object.keys(businessUpdate).forEach((k) => businessUpdate[k] === undefined && delete businessUpdate[k]);

      if (Object.keys(businessUpdate).length > 0) {
        await admin.from("business_profiles").update(businessUpdate).eq("id", business.id);
      }
    }

    // Notify Google indexing for active listings only
    if (existingJob.status === "active") {
      notifyGoogleIndexing(`${BASE_URL}/jobs/${jobId}`, "URL_UPDATED").catch((err) =>
        console.error("Google indexing notify failed:", err)
      );
    }

    await logAdminAction({
      adminId: user.id,
      action: "business_approved",
      targetType: "job",
      targetId: jobId,
      details: { edited: true },
    }).catch(() => {});

    return NextResponse.json({ success: true, jobId });
  } catch (err) {
    console.error("Update import-listing error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { sendListingClaimedEmail, sendAdminListingClaimedEmail } from "@/lib/email/send";
import { createNotification } from "@/lib/notifications/create";
import { logAdminAction } from "@/lib/audit/log";
import { validatePassword } from "@/lib/utils/password";

/**
 * POST /api/claim/complete
 *
 * Finalises a claim from the /claim/[token] page. Looks up the shell
 * business_profile by claim_token, creates a new auth user with the
 * given email + password, links the auth user to the business_profile,
 * and marks is_claimed = true.
 */
export async function POST(request: Request) {
  try {
    const rateLimited = await rateLimit(request, { identifier: "claim" });
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { claimToken, email, password } = body as {
      claimToken?: string;
      email?: string;
      password?: string;
    };

    if (!claimToken) return NextResponse.json({ error: "Missing claim token" }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!password) return NextResponse.json({ error: "Password is required" }, { status: 400 });

    const pwCheck = validatePassword(password);
    if (!pwCheck.isValid) {
      return NextResponse.json(
        { error: `Password is too weak: ${pwCheck.errors.join(", ")}` },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const admin = createAdminClient();

    // Find the shell business by claim token
    const { data: business } = await admin
      .from("business_profiles")
      .select("id, business_name, email, is_claimed, user_id")
      .eq("claim_token", claimToken)
      .maybeSingle();

    if (!business) {
      return NextResponse.json({ error: "Invalid or expired claim link" }, { status: 404 });
    }
    if (business.is_claimed) {
      return NextResponse.json(
        { error: "This listing has already been claimed. Log in to access it." },
        { status: 409 }
      );
    }

    // Create the auth user. email_confirm: true skips the email verification
    // step because the admin has already vetted them before sending the link.
    const { data: authResult, error: authError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: business.business_name,
        business_name: business.business_name,
        account_type: "business",
      },
    });

    if (authError || !authResult?.user) {
      console.error("Failed to create auth user:", authError);
      // Handle "email already exists" as a user-friendly message
      const msg = authError?.message || "";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please use a different email or log in." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    const newUserId = authResult.user.id;

    // Create users row (mirrors signup flow)
    const { error: usersError } = await admin.from("users").upsert(
      {
        id: newUserId,
        email: normalizedEmail,
        full_name: business.business_name,
        role: "business_owner",
      },
      { onConflict: "id" }
    );

    if (usersError) {
      console.error("Failed to create users row:", usersError);
      // Roll back auth user so they can retry cleanly
      await admin.auth.admin.deleteUser(newUserId).catch(() => {});
      return NextResponse.json({ error: "Failed to finalise account" }, { status: 500 });
    }

    // Link the business_profile to the new user and mark claimed.
    // Also update the email on the profile to match the claim email (the
    // admin may have used a slightly different one for outreach).
    const { error: updateError } = await admin
      .from("business_profiles")
      .update({
        user_id: newUserId,
        is_claimed: true,
        email: normalizedEmail,
        claim_token: null, // invalidate the token so it can't be reused
      })
      .eq("id", business.id);

    if (updateError) {
      console.error("Failed to link business_profile:", updateError);
      // Roll back both auth + users
      await admin.from("users").delete().eq("id", newUserId).catch(() => {});
      await admin.auth.admin.deleteUser(newUserId).catch(() => {});
      return NextResponse.json({ error: "Failed to link listing" }, { status: 500 });
    }

    // Welcome email to the business (non-blocking)
    sendListingClaimedEmail({
      to: normalizedEmail,
      businessName: business.business_name,
      dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com"}/business/dashboard`,
    }).catch((err) => console.error("Failed to send listing-claimed email:", err));

    // Admin visibility — log the claim to the audit trail, then notify
    // every admin user both by in-app notification and email. All three
    // channels run best-effort so a failure in any one of them does not
    // break the claim itself.
    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com";
    const adminBusinessUrl = `${siteUrl}/admin/businesses`;

    // Count linked active/draft jobs for the admin email summary
    const { data: linkedJobs } = await admin
      .from("job_posts")
      .select("id")
      .eq("business_id", business.id);
    const jobCount = linkedJobs?.length || 0;

    logAdminAction({
      adminId: newUserId,
      action: "business_claimed",
      targetType: "business",
      targetId: business.id,
      details: {
        business_name: business.business_name,
        business_email: normalizedEmail,
        job_count: jobCount,
      },
    }).catch((err) => console.error("Failed to log claim audit:", err));

    // Fetch admin users for notifications + emails
    const { data: adminUsers } = await admin
      .from("users")
      .select("id, email")
      .eq("role", "admin");

    for (const adminUser of adminUsers || []) {
      createNotification({
        userId: adminUser.id,
        type: "general",
        title: "Listing claimed",
        message: `${business.business_name} just claimed their listing (${jobCount} job${jobCount === 1 ? "" : "s"}).`,
        link: `/admin/businesses`,
        metadata: {
          business_id: business.id,
          business_name: business.business_name,
          business_email: normalizedEmail,
          job_count: jobCount,
        },
      }).catch((err) => console.error("Failed to create admin claim notification:", err));

      if (adminUser.email) {
        sendAdminListingClaimedEmail({
          to: adminUser.email,
          businessName: business.business_name,
          businessEmail: normalizedEmail,
          jobCount,
          adminBusinessUrl,
        }).catch((err) => console.error("Failed to send admin claim email:", err));
      }
    }

    return NextResponse.json({
      success: true,
      redirectUrl: "/login?claimed=1",
    });
  } catch (err) {
    console.error("Claim complete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

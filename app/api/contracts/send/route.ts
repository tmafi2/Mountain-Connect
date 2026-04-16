import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";

/**
 * POST /api/contracts/send
 * Business uploads a contract PDF for a worker's application.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await request.formData();
    const applicationId = formData.get("applicationId") as string;
    const file = formData.get("file") as File | null;

    if (!applicationId) return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
    if (!file) return NextResponse.json({ error: "Missing file" }, { status: 400 });

    const admin = createAdminClient();

    // Get business profile for this user
    const { data: business } = await admin
      .from("business_profiles")
      .select("id, business_name, user_id")
      .eq("user_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "Business profile not found" }, { status: 404 });

    // Get application with worker and job info
    const { data: application } = await admin
      .from("applications")
      .select("id, worker_id, job_post_id, job_posts(title, business_id)")
      .eq("id", applicationId)
      .single();

    if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

    const jobPost = application.job_posts as unknown as {
      title: string;
      business_id: string;
    };

    // Verify the business owns the job post for this application
    if (jobPost.business_id !== business.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Upload PDF to Supabase storage
    const storagePath = `${business.id}/${applicationId}/original.pdf`;
    const { error: uploadError } = await admin.storage
      .from("contracts")
      .upload(storagePath, file, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload contract" }, { status: 500 });
    }

    // Insert contract row
    const { data: contract, error: insertError } = await admin
      .from("contracts")
      .insert({
        application_id: applicationId,
        business_id: business.id,
        worker_id: application.worker_id,
        original_pdf_path: storagePath,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Contract insert error:", insertError);
      return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
    }

    // Update application status to offered
    await admin
      .from("applications")
      .update({ status: "offered", updated_at: new Date().toISOString() })
      .eq("id", applicationId);

    // Get worker user_id for notification
    const { data: workerProfile } = await admin
      .from("worker_profiles")
      .select("user_id")
      .eq("id", application.worker_id)
      .single();

    if (workerProfile) {
      const jobTitle = jobPost.title || "a position";
      const businessName = business.business_name || "A business";

      // Non-blocking: don't fail the whole request if notification insert fails
      try {
        await createNotification({
          userId: workerProfile.user_id,
          type: "contract_sent",
          title: "Contract Received",
          message: `${businessName} has sent you a contract for ${jobTitle}`,
          link: "/applications",
          metadata: { contract_id: contract.id, application_id: applicationId },
        });
      } catch (notifErr) {
        console.error("Failed to create contract_sent notification:", notifErr);
      }
    }

    // Send email notification (non-blocking)
    try {
      const { data: worker } = await admin
        .from("worker_profiles")
        .select("first_name, last_name, contact_email, users(email)")
        .eq("id", application.worker_id)
        .single();

      if (worker) {
        const workerUser = worker.users as unknown as { email: string } | null;
        const workerEmail = worker.contact_email || workerUser?.email;
        if (workerEmail) {
          const { sendContractSentEmail } = await import("@/lib/email/send");
          await sendContractSentEmail({
            to: workerEmail,
            workerName: [worker.first_name, worker.last_name].filter(Boolean).join(" ") || "there",
            businessName: business.business_name || "A business",
            jobTitle: jobPost.title || "a position",
            contractUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://mountainconnects.com"}/applications`,
          });
        }
      }
    } catch {
      // Email sending is non-blocking
    }

    return NextResponse.json({ success: true, contractId: contract.id });
  } catch (error) {
    console.error("Error sending contract:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

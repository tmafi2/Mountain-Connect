import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const maxDuration = 30;

/**
 * POST /api/contracts/sign
 * Worker signs a contract with their signature image.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { contractId, signatureData, signerName } = await request.json();

    if (!contractId) return NextResponse.json({ error: "Missing contractId" }, { status: 400 });
    if (!signatureData) return NextResponse.json({ error: "Missing signatureData" }, { status: 400 });
    if (!signerName) return NextResponse.json({ error: "Missing signerName" }, { status: 400 });

    const admin = createAdminClient();

    // Get worker profile
    const { data: workerProfile } = await admin
      .from("worker_profiles")
      .select("id, user_id, first_name, last_name")
      .eq("user_id", user.id)
      .single();

    if (!workerProfile) return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });

    // Get contract and verify ownership + status
    // job title is fetched via applications → job_posts since contracts has no job_post_id column
    const { data: contract } = await admin
      .from("contracts")
      .select("id, application_id, business_id, worker_id, original_pdf_path, status, applications(job_posts(title))")
      .eq("id", contractId)
      .single();

    if (!contract) return NextResponse.json({ error: "Contract not found" }, { status: 404 });

    if (contract.worker_id !== workerProfile.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (contract.status !== "pending") {
      return NextResponse.json({ error: "Contract is not pending" }, { status: 400 });
    }

    // Download original PDF from storage
    const { data: pdfData, error: downloadError } = await admin.storage
      .from("contracts")
      .download(contract.original_pdf_path);

    if (downloadError || !pdfData) {
      console.error("PDF download error:", downloadError);
      return NextResponse.json({ error: "Failed to download contract PDF" }, { status: 500 });
    }

    // Load PDF and embed signature
    const pdfBytes = await pdfData.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Strip data URL prefix and decode signature PNG
    const base64Data = signatureData.replace(/^data:image\/png;base64,/, "");
    const signatureBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const signatureImage = await pdfDoc.embedPng(signatureBytes);

    // Get the last page and draw signature
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];

    lastPage.drawImage(signatureImage, {
      x: 72,
      y: 100,
      width: 200,
      height: 80,
    });

    // Add signer name and date below signature
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const signedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    lastPage.drawText(signerName, {
      x: 72,
      y: 85,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });

    lastPage.drawText(`Signed: ${signedDate}`, {
      x: 72,
      y: 72,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    const signedPdfBytes = await pdfDoc.save();

    // Upload signed PDF
    const signedPath = `${contract.business_id}/${contract.application_id}/signed.pdf`;
    const { error: uploadError } = await admin.storage
      .from("contracts")
      .upload(signedPath, signedPdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Signed PDF upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload signed contract" }, { status: 500 });
    }

    // Update contract record
    await admin
      .from("contracts")
      .update({
        signed_pdf_path: signedPath,
        signature_data: signatureData,
        status: "signed",
        signed_at: new Date().toISOString(),
      })
      .eq("id", contractId);

    // Get business info for notification
    const { data: business } = await admin
      .from("business_profiles")
      .select("user_id, business_name")
      .eq("id", contract.business_id)
      .single();

    if (business) {
      const app = contract.applications as unknown as { job_posts: { title: string } | null } | null;
      const jobTitle = app?.job_posts?.title || "a position";
      const workerName = [workerProfile.first_name, workerProfile.last_name].filter(Boolean).join(" ") || "A worker";

      try {
        await createNotification({
          userId: business.user_id,
          type: "contract_signed",
          title: "Contract Signed",
          message: `${workerName} has signed the contract for ${jobTitle}`,
          link: "/manage-listings",
          metadata: { contract_id: contractId, application_id: contract.application_id },
        });
      } catch (notifErr) {
        console.error("Failed to create contract_signed notification:", notifErr);
      }
    }

    // Send email notification (non-blocking)
    try {
      if (business) {
        const { data: businessUser } = await admin
          .from("users")
          .select("email")
          .eq("id", business.user_id)
          .single();

        if (businessUser?.email) {
          const app = contract.applications as unknown as { job_posts: { title: string } | null } | null;
          const workerName = [workerProfile.first_name, workerProfile.last_name].filter(Boolean).join(" ") || "A worker";
          const { sendContractSignedEmail } = await import("@/lib/email/send");
          await sendContractSignedEmail({
            to: businessUser.email,
            businessName: business.business_name || "there",
            workerName,
            jobTitle: app?.job_posts?.title || "a position",
            applicantsUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "https://mountainconnects.com"}/business/applicants`,
          });
        }
      }
    } catch {
      // Email sending is non-blocking
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error signing contract:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

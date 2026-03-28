import { NextResponse } from "next/server";
import { sendWelcomeWorkerEmail } from "@/lib/email/send";
import { sendWelcomeBusinessEmail } from "@/lib/email/send";

/**
 * POST /api/emails/welcome
 * Called after a user completes onboarding.
 * Sends the appropriate welcome email based on account type.
 */
export async function POST(request: Request) {
  try {
    const { type, email, name, profileUrl } = await request.json();

    if (!type || !email) {
      return NextResponse.json({ error: "Missing type or email" }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mountainconnects.com";

    if (type === "worker") {
      await sendWelcomeWorkerEmail({
        to: email,
        workerName: name || "there",
        profileUrl: profileUrl || `${siteUrl}/profile`,
      });
    } else if (type === "business") {
      await sendWelcomeBusinessEmail({
        to: email,
        businessName: name || "your business",
        profileUrl: profileUrl || `${siteUrl}/business/company-profile`,
      });
    } else {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return NextResponse.json({ error: "Failed to send welcome email" }, { status: 500 });
  }
}

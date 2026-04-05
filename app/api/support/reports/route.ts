import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/notifications/create";
import { rateLimit } from "@/lib/rate-limit";
import {
  sendSupportReportConfirmationEmail,
  sendSupportReportAdminAlertEmail,
} from "@/lib/email/send";

const VALID_CATEGORIES = [
  "bug",
  "feature_request",
  "content_issue",
  "account_issue",
  "other",
];

export async function POST(request: Request) {
  // Rate limit
  const rateLimited = await rateLimit(request, {
    identifier: "support-report",
  });
  if (rateLimited) return rateLimited;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate
  const body = await request.json();
  const { category, subject, message, page_url } = body;

  if (!VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (!subject?.trim() || subject.trim().length < 3 || subject.trim().length > 200) {
    return NextResponse.json(
      { error: "Subject must be 3–200 characters" },
      { status: 400 }
    );
  }
  if (!message?.trim() || message.trim().length < 10 || message.trim().length > 5000) {
    return NextResponse.json(
      { error: "Message must be 10–5000 characters" },
      { status: 400 }
    );
  }

  // Get user details
  const admin = createAdminClient();
  const { data: userData } = await admin
    .from("users")
    .select("full_name, email")
    .eq("id", user.id)
    .single();

  const userName = userData?.full_name || "Unknown";
  const userEmail = userData?.email || user.email || "";
  const userAgent = request.headers.get("user-agent") || null;

  // Insert report
  const { data: report, error } = await supabase
    .from("support_reports")
    .insert({
      user_id: user.id,
      user_email: userEmail,
      user_name: userName,
      category,
      subject: subject.trim(),
      message: message.trim(),
      page_url: page_url || null,
      user_agent: userAgent,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to insert support report:", error);
    return NextResponse.json(
      { error: "Failed to submit report" },
      { status: 500 }
    );
  }

  // Fire-and-forget: notifications + emails
  (async () => {
    try {
      // Notify all admins in-app
      const { data: admins } = await admin
        .from("users")
        .select("id")
        .eq("role", "admin");

      for (const adminUser of admins || []) {
        await createNotification({
          userId: adminUser.id,
          type: "general",
          title: `New ${category.replace(/_/g, " ")} report`,
          message: `${userName} submitted: "${subject}"`,
          link: "/admin/reported",
        }).catch(() => {});
      }

      // Admin alert email
      const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;
      if (adminEmail) {
        await sendSupportReportAdminAlertEmail({
          to: adminEmail,
          category,
          subject: subject.trim(),
          userName,
          userEmail,
          message: message.trim().slice(0, 500),
          pageUrl: page_url || null,
          reportUrl: "https://www.mountainconnects.com/admin/reported",
        }).catch(() => {});
      }

      // User confirmation email
      if (userEmail) {
        await sendSupportReportConfirmationEmail({
          to: userEmail,
          userName,
          category,
          subject: subject.trim(),
          reportId: report.id,
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Support report notification error:", err);
    }
  })();

  return NextResponse.json({ success: true, id: report.id });
}

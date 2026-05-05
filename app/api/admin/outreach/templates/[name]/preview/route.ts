import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { winterOutreachEmail } from "@/lib/email/templates/winter-outreach";
import { winterFollowup1Email } from "@/lib/email/templates/winter-followup-1";
import { winterFollowup2Email } from "@/lib/email/templates/winter-followup-2";
import { winterFollowup3Email } from "@/lib/email/templates/winter-followup-3";
import { winterFollowupFinalEmail } from "@/lib/email/templates/winter-followup-final";
import { salesDropinEmail } from "@/lib/email/templates/sales-dropin";
import { allManualTemplates } from "@/lib/outreach/sequence";

const SAMPLE_BASE_URL = "https://www.mountainconnects.com";

/**
 * GET /api/admin/outreach/templates/[name]/preview
 * Query params: businessName, locationName, contactPersonName
 *
 * Returns the rendered HTML of a template using the supplied (or default)
 * sample data. The admin viewer page loads this into an iframe srcDoc.
 * Admin only.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;

  const { name } = await params;
  if (!allManualTemplates().find((t) => t.template === name)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  const url = new URL(request.url);
  const businessName = url.searchParams.get("businessName") || "Thredbo Alpine Village";
  const locationName = url.searchParams.get("locationName") || undefined;
  const contactPersonName = url.searchParams.get("contactPersonName") || undefined;

  const ctaUrl = `${SAMPLE_BASE_URL}/signup`;
  const unsubscribeUrl = `${SAMPLE_BASE_URL}/unsubscribe/preview-token`;

  let html: string;
  let subject: string;
  const common = { businessName, locationName, contactPersonName, ctaUrl, unsubscribeUrl };
  if (name === "winter-outreach") {
    const r = winterOutreachEmail(common);
    html = r.html;
    subject = r.subject;
  } else if (name === "winter-followup-1") {
    const r = winterFollowup1Email(common);
    html = r.html;
    subject = r.subject;
  } else if (name === "winter-followup-2") {
    const r = winterFollowup2Email(common);
    html = r.html;
    subject = r.subject;
  } else if (name === "winter-followup-3") {
    const r = winterFollowup3Email(common);
    html = r.html;
    subject = r.subject;
  } else if (name === "winter-followup-final") {
    const r = winterFollowupFinalEmail(common);
    html = r.html;
    subject = r.subject;
  } else if (name === "sales-dropin") {
    const r = salesDropinEmail(common);
    html = r.html;
    subject = r.subject;
  } else {
    return NextResponse.json({ error: `Template "${name}" has no renderer wired up` }, { status: 500 });
  }

  return NextResponse.json({ subject, html });
}

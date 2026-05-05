import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { rateLimit } from "@/lib/rate-limit";
import {
  sendWinterOutreachEmail,
  sendWinterFollowup1Email,
  sendWinterFollowup2Email,
  sendWinterFollowup3Email,
  sendWinterFollowupFinalEmail,
  sendSalesDropinEmail,
} from "@/lib/email/send";
import { allManualTemplates } from "@/lib/outreach/sequence";

const SAMPLE_BASE_URL = "https://www.mountainconnects.com";

/**
 * POST /api/admin/outreach/templates/[name]/send-test
 * Body: { businessName?, locationName?, contactPersonName?, to? }
 *
 * Fires a one-off test email of the given template to the admin's
 * own email address (or a custom `to` if supplied) with the supplied
 * sample data. Does NOT create an outreach_sends row — this is a
 * preview tool, not part of any campaign.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const { name } = await params;
  if (!allManualTemplates().find((t) => t.template === name)) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  let body: {
    to?: string;
    businessName?: string;
    locationName?: string;
    contactPersonName?: string;
  };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const to = body.to?.trim() || user.email;
  if (!to) return NextResponse.json({ error: "No recipient" }, { status: 400 });

  const businessName = body.businessName?.trim() || "Thredbo Alpine Village";
  const locationName = body.locationName?.trim() || undefined;
  const ctaUrl = `${SAMPLE_BASE_URL}/signup`;
  const unsubscribeUrl = `${SAMPLE_BASE_URL}/unsubscribe/preview-token`;

  const contactPersonName = body.contactPersonName?.trim() || undefined;
  const common = { to, businessName, locationName, contactPersonName, ctaUrl, unsubscribeUrl };

  try {
    let r;
    switch (name) {
      case "winter-outreach":
        r = await sendWinterOutreachEmail(common);
        break;
      case "winter-followup-1":
        r = await sendWinterFollowup1Email(common);
        break;
      case "winter-followup-2":
        r = await sendWinterFollowup2Email(common);
        break;
      case "winter-followup-3":
        r = await sendWinterFollowup3Email(common);
        break;
      case "winter-followup-final":
        r = await sendWinterFollowupFinalEmail(common);
        break;
      case "sales-dropin":
        r = await sendSalesDropinEmail(common);
        break;
      default:
        return NextResponse.json({ error: `Template "${name}" has no send handler` }, { status: 500 });
    }
    return NextResponse.json({ success: true, resendId: r?.data?.id ?? null, sentTo: to });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

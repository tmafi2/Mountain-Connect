import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The address in the List-Unsubscribe header (see lib/email/unsubscribe.ts).
 *
 * Gmail and Yahoo POST here themselves when a recipient presses the
 * "Unsubscribe" button they draw beside the sender's name — no page is
 * opened and nobody is asked to confirm, so this must do the work on the
 * POST and answer 200. A person who clicks the footer link instead lands on
 * /unsubscribe/{token}, which does the same thing and says so on screen.
 *
 * It always answers 200, matching that page: a token that belongs to nobody
 * must be indistinguishable from one that does, or this becomes a way to
 * test whether an address is on the list.
 */
async function unsubscribe(token: string): Promise<void> {
  const admin = createAdminClient();

  const { data: lead, error } = await admin
    .from("outreach_leads")
    .select("id, status")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (error) {
    console.error("unsubscribe: lookup failed:", error.message);
    return;
  }

  // Only an active lead is changed, so a second press cannot overwrite a
  // `signed_up` status with `unsubscribed`.
  if (lead && lead.status === "active") {
    const { error: updateError } = await admin
      .from("outreach_leads")
      .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
      .eq("id", lead.id);
    if (updateError) {
      console.error("unsubscribe: update failed:", updateError.message);
    }
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  await unsubscribe(token);
  return new NextResponse(null, { status: 200 });
}

// Some clients follow the https address with a GET instead. Send those to
// the page, which unsubscribes and shows a confirmation.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/unsubscribe/${encodeURIComponent(token)}`, 302);
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWaitlistWorkerEmail, sendWaitlistBusinessEmail } from "@/lib/email/send";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, email, business_name, country, resort } = body;

    // Validate type
    if (type !== "worker" && type !== "business") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Validate business fields
    if (type === "business") {
      if (!business_name?.trim()) {
        return NextResponse.json({ error: "Business name is required" }, { status: 400 });
      }
      if (!country?.trim()) {
        return NextResponse.json({ error: "Country is required" }, { status: 400 });
      }
      if (!resort?.trim()) {
        return NextResponse.json({ error: "Resort is required" }, { status: 400 });
      }
    }

    const supabase = createAdminClient();

    const insertData: Record<string, string> = {
      type,
      email: email.toLowerCase().trim(),
    };

    if (type === "business") {
      insertData.business_name = business_name.trim();
      insertData.country = country.trim();
      insertData.resort = resort.trim();
    }

    const { error } = await supabase.from("waitlist_signups").insert(insertData);

    if (error) {
      // Duplicate email
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This email is already on the waitlist!" },
          { status: 409 }
        );
      }
      console.error("Waitlist insert error:", error);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }

    // Send confirmation email (don't block the response if it fails)
    try {
      if (type === "worker") {
        await sendWaitlistWorkerEmail({ to: email.toLowerCase().trim() });
      } else {
        await sendWaitlistBusinessEmail({
          to: email.toLowerCase().trim(),
          businessName: business_name.trim(),
          resort: resort.trim(),
        });
      }
    } catch (emailErr) {
      console.error("Waitlist email failed (non-blocking):", emailErr);
    }

    // Get total count for the live counter
    const { count } = await supabase
      .from("waitlist_signups")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({ success: true, count: count ?? 0 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from("waitlist_signups")
      .select("*", { count: "exact", head: true });

    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}

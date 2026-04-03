import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/reviews/businesses
 * List verified businesses for the review dropdown.
 */
export async function GET() {
  try {
    const admin = createAdminClient();

    const { data: businesses, error } = await admin
      .from("business_profiles")
      .select("id, business_name, logo_url")
      .eq("verification_status", "verified")
      .order("business_name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ businesses: businesses || [] });
  } catch (error) {
    console.error("Error fetching businesses:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

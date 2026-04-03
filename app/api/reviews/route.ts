import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/reviews
 * Get reviews by the current worker, or reviews for a business.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("business_id");

    const admin = createAdminClient();

    if (businessId) {
      // Public: get reviews for a business
      const { data: reviews, error } = await admin
        .from("business_reviews")
        .select("*, worker_profiles!worker_id(users!user_id(full_name))")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return NextResponse.json({ reviews: reviews || [] });
    }

    // Worker: get their own reviews
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: workerProfile } = await admin
      .from("worker_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!workerProfile) return NextResponse.json({ reviews: [] });

    const { data: reviews, error } = await admin
      .from("business_reviews")
      .select("*, business_profiles!business_id(business_name, logo_url)")
      .eq("worker_id", workerProfile.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ reviews: reviews || [] });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/reviews
 * Create a new business review (worker only).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Get worker profile
    const { data: workerProfile } = await admin
      .from("worker_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!workerProfile) {
      return NextResponse.json({ error: "Worker profile not found" }, { status: 403 });
    }

    const { business_id, rating, title, review_text, season, position, would_recommend } = await request.json();

    if (!business_id) return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
    if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });

    const { data: review, error } = await admin
      .from("business_reviews")
      .insert({
        worker_id: workerProfile.id,
        business_id,
        rating,
        title: title || null,
        review_text: review_text || null,
        season: season || null,
        position: position || null,
        would_recommend: would_recommend ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "You have already reviewed this business for this season" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ review });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

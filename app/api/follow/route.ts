import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create";

// GET — check if current worker follows a business, or list all followed businesses
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = request.nextUrl.searchParams.get("business_id");

    // Get worker profile
    const { data: worker } = await supabase
      .from("worker_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!worker) {
      return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
    }

    if (businessId) {
      // Check if following a specific business
      const { data } = await supabase
        .from("business_followers")
        .select("id")
        .eq("business_id", businessId)
        .eq("worker_id", worker.id)
        .single();

      return NextResponse.json({ following: !!data });
    }

    // List all followed businesses
    const { data: follows } = await supabase
      .from("business_followers")
      .select(`
        id,
        created_at,
        business:business_profiles(id, business_name, description, location, category, verification_status, slug, logo_url)
      `)
      .eq("worker_id", worker.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ follows: follows || [] });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST — follow a business
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { business_id } = await request.json();
    if (!business_id) {
      return NextResponse.json({ error: "business_id required" }, { status: 400 });
    }

    // Get worker profile
    const { data: worker } = await supabase
      .from("worker_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!worker) {
      return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
    }

    // Insert follow (upsert to handle duplicates)
    const { error } = await supabase
      .from("business_followers")
      .upsert(
        { business_id, worker_id: worker.id },
        { onConflict: "business_id,worker_id" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ following: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE — unfollow a business
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const businessId = request.nextUrl.searchParams.get("business_id");
    if (!businessId) {
      return NextResponse.json({ error: "business_id required" }, { status: 400 });
    }

    // Get worker profile
    const { data: worker } = await supabase
      .from("worker_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!worker) {
      return NextResponse.json({ error: "Worker profile not found" }, { status: 404 });
    }

    await supabase
      .from("business_followers")
      .delete()
      .eq("business_id", businessId)
      .eq("worker_id", worker.id);

    return NextResponse.json({ following: false });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

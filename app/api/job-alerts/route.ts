import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/job-alerts — list current user's alerts
 * POST /api/job-alerts — create a new alert
 */

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data, error } = await supabase
      .from("job_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ alerts: data });
  } catch (error) {
    console.error("Error fetching job alerts:", error);
    return NextResponse.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, filters } = await request.json();

    if (!filters || typeof filters !== "object") {
      return NextResponse.json({ error: "Missing filters" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("job_alerts")
      .insert({
        user_id: user.id,
        name: name || "My Alert",
        filters,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ alert: data });
  } catch (error) {
    console.error("Error creating job alert:", error);
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, name, filters, is_active } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing alert id" }, { status: 400 });

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (filters !== undefined) updates.filters = filters;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from("job_alerts")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ alert: data });
  } catch (error) {
    console.error("Error updating job alert:", error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Missing alert id" }, { status: 400 });

    const { error } = await supabase
      .from("job_alerts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting job alert:", error);
    return NextResponse.json({ error: "Failed to delete alert" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/templates
 * List all templates for the current business.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: business } = await supabase
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!business) return NextResponse.json({ templates: [] });

    const { data, error } = await supabase
      .from("job_templates")
      .select("*")
      .eq("business_id", business.id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch templates:", error);
      return NextResponse.json({ error: "Failed to load templates" }, { status: 500 });
    }

    return NextResponse.json({ templates: data || [] });
  } catch (err) {
    console.error("Templates GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/templates
 * Save the posted job data as a reusable template.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { name, ...fields } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }

    const { data: business } = await supabase
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "Business profile not found" }, { status: 404 });

    // Only whitelist known template columns to avoid accidental writes
    const allowedFields = [
      "title", "category", "position_type", "description", "requirements",
      "pay_amount", "pay_currency", "salary_range",
      "accommodation_included", "accommodation_type", "accommodation_cost", "housing_details",
      "ski_pass_included", "meal_perks", "visa_sponsorship", "language_required",
      "urgently_hiring", "positions_available", "show_positions",
      "custom_perks", "how_to_apply", "application_email", "application_url",
    ];

    const templateRow: Record<string, unknown> = {
      business_id: business.id,
      name: name.trim(),
    };

    for (const key of allowedFields) {
      if (key in fields) templateRow[key] = fields[key];
    }

    const { data, error } = await supabase
      .from("job_templates")
      .insert(templateRow)
      .select()
      .single();

    if (error) {
      console.error("Failed to create template:", error);
      return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
    }

    return NextResponse.json({ template: data });
  } catch (err) {
    console.error("Templates POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

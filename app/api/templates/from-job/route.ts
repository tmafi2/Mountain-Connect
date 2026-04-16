import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/templates/from-job
 * Body: { jobId: string, name: string }
 * Creates a template from an existing job post by copying its fields.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { jobId, name } = await request.json();
    if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }

    const { data: business } = await supabase
      .from("business_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "Business profile not found" }, { status: 404 });

    // Fetch the job with ownership check
    const { data: job, error: jobError } = await supabase
      .from("job_posts")
      .select("title, category, position_type, description, requirements, pay_amount, pay_currency, salary_range, accommodation_included, accommodation_type, accommodation_cost, housing_details, ski_pass_included, meal_perks, visa_sponsorship, language_required, urgently_hiring, positions_available, show_positions, custom_perks, how_to_apply, application_email, application_url, business_id")
      .eq("id", jobId)
      .single();

    if (jobError || !job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (job.business_id !== business.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Copy job fields into a new template row
    const { business_id: _discard, ...jobFields } = job;
    const templateRow = {
      business_id: business.id,
      name: name.trim(),
      ...jobFields,
    };

    const { data, error: insertError } = await supabase
      .from("job_templates")
      .insert(templateRow)
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create template from job:", insertError);
      return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
    }

    return NextResponse.json({ template: data });
  } catch (err) {
    console.error("Template from-job error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/resorts/[id]/nearby-towns
 * Returns all nearby towns for a given resort, joined through resort_nearby_towns.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing resort id" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("resort_nearby_towns")
      .select(`
        distance_km,
        nearby_towns (
          id,
          name,
          slug,
          description
        )
      `)
      .eq("resort_id", id);

    if (error) {
      console.error("Error fetching nearby towns:", error);
      return NextResponse.json({ error: "Failed to fetch nearby towns" }, { status: 500 });
    }

    // Flatten the join result
    const towns = (data || []).map((row) => {
      const town = row.nearby_towns as unknown as {
        id: string;
        name: string;
        slug: string;
        description: string | null;
      };
      return {
        id: town.id,
        name: town.name,
        slug: town.slug,
        description: town.description,
        distance_km: row.distance_km,
      };
    });

    return NextResponse.json({ towns });
  } catch (error) {
    console.error("Error in nearby-towns API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

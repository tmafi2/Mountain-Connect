import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const all = req.nextUrl.searchParams.get("all"); // ?all=1 returns every resort

  const supabase = await createClient();

  let query = supabase
    .from("resorts")
    .select("id, name, country")
    .order("name");

  if (all) {
    // Return all resorts (for dropdown lists)
    query = query.limit(200);
  } else if (q.length >= 1) {
    query = query.ilike("name", `%${q}%`).limit(10);
  } else {
    return NextResponse.json([]);
  }

  const { data, error } = await query;

  if (error) {
    console.error("search-resorts error:", error);
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(
    (data || []).map((r) => ({
      id: r.id,
      name: r.name,
      country: r.country,
    }))
  );
}

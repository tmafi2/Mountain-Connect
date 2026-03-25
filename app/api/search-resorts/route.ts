import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 1) return NextResponse.json([]);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("resorts")
    .select("id, name, country")
    .ilike("name", `%${q}%`)
    .limit(10);

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

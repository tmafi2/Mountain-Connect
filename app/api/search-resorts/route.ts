import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resorts as staticResorts } from "@/lib/data/resorts";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const all = req.nextUrl.searchParams.get("all"); // ?all=1 returns every resort

  // Try Supabase first
  try {
    const supabase = await createClient();

    let query = supabase
      .from("resorts")
      .select("id, name, country")
      .order("name");

    if (all) {
      query = query.limit(200);
    } else if (q.length >= 1) {
      query = query.ilike("name", `%${q}%`).limit(10);
    } else {
      return NextResponse.json([]);
    }

    const { data, error } = await query;

    // If Supabase returned results, use them
    if (!error && data && data.length > 0) {
      return NextResponse.json(
        data.map((r) => ({
          id: r.id,
          name: r.name,
          country: r.country,
        }))
      );
    }
  } catch (err) {
    console.error("Supabase resort query failed, falling back to static data:", err);
  }

  // Fallback: use static resort data
  const allStatic = staticResorts
    .map((r) => ({ id: r.id, name: r.name, country: r.country }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (all) {
    return NextResponse.json(allStatic);
  }

  if (q.length >= 1) {
    const lower = q.toLowerCase();
    const filtered = allStatic.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        r.country.toLowerCase().includes(lower)
    ).slice(0, 10);
    return NextResponse.json(filtered);
  }

  return NextResponse.json([]);
}

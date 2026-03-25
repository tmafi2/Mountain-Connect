import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 1) return NextResponse.json([]);

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_profiles")
    .select("id, company_name, location, verification_status")
    .or(`company_name.ilike.%${q}%`)
    .eq("verification_status", "verified")
    .limit(10);

  if (error) {
    console.error("search-businesses error:", error);
    return NextResponse.json([], { status: 500 });
  }

  return NextResponse.json(
    (data || []).map((b) => ({
      id: b.id,
      name: b.company_name,
      location: b.location,
      verified: b.verification_status === "verified",
    }))
  );
}

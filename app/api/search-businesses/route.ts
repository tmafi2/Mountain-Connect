import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Escape characters that PostgREST treats as LIKE-pattern wildcards so
// they match literally inside an ilike() filter.
function escapeLikePattern(input: string): string {
  return input.replace(/([\\%_])/g, "\\$1");
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 1) return NextResponse.json([]);

  // Cap length defensively — autocomplete inputs over ~80 chars are
  // never legitimate and just create overlong PostgREST queries.
  const safeQuery = escapeLikePattern(q.slice(0, 80));

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_profiles")
    .select("id, business_name, location, verification_status")
    .ilike("business_name", `%${safeQuery}%`)
    .eq("verification_status", "verified")
    .limit(10);

  if (error) {
    console.error("search-businesses error:", error);
    // Return an empty list rather than a 500 — autocomplete should
    // degrade silently, and Supabase 400s on edge-case queries should
    // not propagate as Vercel anomaly alerts.
    return NextResponse.json([]);
  }

  return NextResponse.json(
    (data || []).map((b) => ({
      id: b.id,
      name: b.business_name,
      location: b.location,
      verified: b.verification_status === "verified",
    }))
  );
}

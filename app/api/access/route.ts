import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const ACCESS_CODE = process.env.SITE_ACCESS_CODE || "mountainconnectaccess";

export async function POST(request: NextRequest) {
  const rateLimited = await rateLimit(request, { identifier: "access" });
  if (rateLimited) return rateLimited;

  try {
    const { code } = await request.json();

    if (code === ACCESS_CODE) {
      const response = NextResponse.json({ success: true });
      response.cookies.set("site-access", "granted", {
        path: "/",
        maxAge: 60 * 60 * 24 * 3, // 3 days
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      return response;
    }

    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

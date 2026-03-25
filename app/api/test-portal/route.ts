import { NextRequest, NextResponse } from "next/server";

const TEST_PORTAL_CODE = process.env.TEST_PORTAL_CODE || "mountainconnectaccessportal";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (code === TEST_PORTAL_CODE) {
      const response = NextResponse.json({ success: true });
      response.cookies.set("test-mode", "true", {
        path: "/",
        maxAge: 60 * 60 * 4, // 4 hours
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

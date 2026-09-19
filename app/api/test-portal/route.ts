import { NextRequest, NextResponse } from "next/server";

const TEST_PORTAL_CODE = process.env.TEST_PORTAL_CODE || "mountainconnectaccess";

export async function POST(request: NextRequest) {
  // middleware.ts only honours the test-mode cookie in development, so
  // anywhere else there is nothing to hand out.
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { code } = await request.json();

    if (code === TEST_PORTAL_CODE) {
      const response = NextResponse.json({ success: true });
      response.cookies.set("test-mode", "true", {
        path: "/",
        maxAge: 60 * 60 * 4, // 4 hours
        httpOnly: true,
        sameSite: "lax",
      });
      return response;
    }

    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

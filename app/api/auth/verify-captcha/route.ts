import { NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/lib/turnstile";

/**
 * POST /api/auth/verify-captcha
 * Server-side Turnstile token verification.
 */
export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ success: false, error: "No token provided" }, { status: 400 });
    }

    const valid = await verifyTurnstileToken(token);

    if (!valid) {
      return NextResponse.json({ success: false, error: "CAPTCHA verification failed" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("CAPTCHA verification error:", error);
    return NextResponse.json({ success: false, error: "Verification error" }, { status: 500 });
  }
}

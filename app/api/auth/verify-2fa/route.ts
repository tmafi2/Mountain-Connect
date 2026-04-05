import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function verifyPendingToken(token: string): { userId: string } | null {
  try {
    const [payloadB64, hmac] = token.split(".");
    if (!payloadB64 || !hmac) return null;

    const payload = Buffer.from(payloadB64, "base64").toString();
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-secret";
    const expectedHmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    if (hmac !== expectedHmac) return null;

    const parsed = JSON.parse(payload);
    if (parsed.exp < Date.now()) return null;

    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  // Strict rate limit — 5 attempts per minute
  const rateLimited = await rateLimit(request, {
    identifier: "verify-2fa",
  });
  if (rateLimited) return rateLimited;

  const { code, email, password } = await request.json();

  if (!code || !email || !password) {
    return NextResponse.json({ error: "Code, email, and password are required" }, { status: 400 });
  }

  // Get pending token from cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const pendingCookie = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("2fa_pending="));
  const pendingToken = pendingCookie?.split("=").slice(1).join("=")?.trim();

  if (!pendingToken) {
    return NextResponse.json({ error: "No pending 2FA session. Please log in again." }, { status: 401 });
  }

  const tokenData = verifyPendingToken(pendingToken);
  if (!tokenData) {
    return NextResponse.json({ error: "2FA session expired. Please log in again." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify OTP code
  const codeHash = hashOtp(code.trim());
  const { data: otpRecord } = await admin
    .from("login_otp_codes")
    .select("id, expires_at, used")
    .eq("user_id", tokenData.userId)
    .eq("code_hash", codeHash)
    .eq("used", false)
    .single();

  if (!otpRecord) {
    return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 400 });
  }

  if (new Date(otpRecord.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code has expired. Please request a new one." }, { status: 400 });
  }

  // Mark code as used
  await admin
    .from("login_otp_codes")
    .update({ used: true })
    .eq("id", otpRecord.id);

  // Clear the pending cookie
  const response = NextResponse.json({ success: true });
  response.cookies.set("2fa_pending", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

// Resend OTP code
export async function PUT(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "resend-2fa" });
  if (rateLimited) return rateLimited;

  const cookieHeader = request.headers.get("cookie") || "";
  const pendingCookie = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("2fa_pending="));
  const pendingToken = pendingCookie?.split("=").slice(1).join("=")?.trim();

  if (!pendingToken) {
    return NextResponse.json({ error: "No pending session" }, { status: 401 });
  }

  const tokenData = verifyPendingToken(pendingToken);
  if (!tokenData) {
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Get user info
  const { data: userData } = await admin
    .from("users")
    .select("full_name, email")
    .eq("id", tokenData.userId)
    .single();

  if (!userData?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Invalidate old codes
  await admin
    .from("login_otp_codes")
    .update({ used: true })
    .eq("user_id", tokenData.userId)
    .eq("used", false);

  // Generate and send new code
  const code = crypto.randomInt(100000, 999999).toString();
  const codeHash = hashOtp(code);

  await admin.from("login_otp_codes").insert({
    user_id: tokenData.userId,
    code_hash: codeHash,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  const { sendLoginOtpEmail } = await import("@/lib/email/send");
  await sendLoginOtpEmail({
    to: userData.email,
    userName: userData.full_name || "there",
    code,
  }).catch(() => {});

  return NextResponse.json({ success: true });
}

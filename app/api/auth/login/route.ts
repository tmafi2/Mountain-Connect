import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendLoginOtpEmail } from "@/lib/email/send";
import { rateLimit } from "@/lib/rate-limit";
import crypto from "crypto";

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function generatePendingToken(userId: string): string {
  const payload = JSON.stringify({ userId, exp: Date.now() + 10 * 60 * 1000 });
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-secret";
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return Buffer.from(payload).toString("base64") + "." + hmac;
}

export async function POST(request: Request) {
  // Rate limit
  const rateLimited = await rateLimit(request, { identifier: "auth-login" });
  if (rateLimited) return rateLimited;

  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify credentials using Supabase Auth admin API
  // We sign in server-side to verify, then check 2FA
  const { data: signInData, error: signInError } =
    await admin.auth.signInWithPassword({ email, password });

  if (signInError || !signInData.user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const userId = signInData.user.id;

  // Check if user has 2FA enabled
  const { data: userData } = await admin
    .from("users")
    .select("two_factor_enabled, full_name, email, role")
    .eq("id", userId)
    .single();

  if (!userData?.two_factor_enabled) {
    // No 2FA — return success, let client do normal signInWithPassword
    // We need to sign out the server-side session we just created
    return NextResponse.json({
      requires2fa: false,
      role: userData?.role,
    });
  }

  // 2FA is enabled — generate OTP and send email
  const code = generateOtp();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Invalidate any existing unused codes for this user
  await admin
    .from("login_otp_codes")
    .update({ used: true })
    .eq("user_id", userId)
    .eq("used", false);

  // Insert new OTP code
  await admin.from("login_otp_codes").insert({
    user_id: userId,
    code_hash: codeHash,
    expires_at: expiresAt,
  });

  // Send OTP email
  const userEmail = userData.email || signInData.user.email || email;
  await sendLoginOtpEmail({
    to: userEmail,
    userName: userData.full_name || "there",
    code,
  }).catch((err) => console.error("Failed to send OTP email:", err));

  // Generate pending token
  const pendingToken = generatePendingToken(userId);

  const response = NextResponse.json({
    requires2fa: true,
    role: userData.role,
  });

  // Set pending token as httpOnly cookie
  response.cookies.set("2fa_pending", pendingToken, {
    path: "/",
    maxAge: 10 * 60, // 10 minutes
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET: Return the current user's referral code and stats
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Get or create referral code
    const { data: userData } = await admin
      .from("users")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    let referralCode = userData?.referral_code;

    if (!referralCode) {
      // Generate a unique code
      let attempts = 0;
      while (attempts < 5) {
        const code = generateCode();
        const { error } = await admin
          .from("users")
          .update({ referral_code: code })
          .eq("id", user.id);

        if (!error) {
          referralCode = code;
          break;
        }
        attempts++;
      }
    }

    // Get referral stats
    const { data: referrals } = await admin
      .from("referrals")
      .select("id, referred_user_id, referral_type, created_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    const stats = {
      total: referrals?.length || 0,
      workers: referrals?.filter((r) => r.referral_type === "worker").length || 0,
      businesses: referrals?.filter((r) => r.referral_type === "business").length || 0,
    };

    // Get referred user names
    const referredUsers: { name: string; type: string; date: string }[] = [];
    if (referrals && referrals.length > 0) {
      const userIds = referrals.map((r) => r.referred_user_id);
      const { data: users } = await admin
        .from("users")
        .select("id, full_name")
        .in("id", userIds);

      const nameMap: Record<string, string> = {};
      if (users) {
        for (const u of users) nameMap[u.id] = u.full_name || "User";
      }

      for (const r of referrals) {
        referredUsers.push({
          name: nameMap[r.referred_user_id] || "User",
          type: r.referral_type || "unknown",
          date: r.created_at,
        });
      }
    }

    return NextResponse.json({
      referralCode,
      stats,
      referredUsers,
    });
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Record a referral (called during signup)
export async function POST(request: Request) {
  try {
    const { referralCode, referredUserId, referralType } = await request.json();
    if (!referralCode || !referredUserId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Find the referrer by code
    const { data: referrer } = await admin
      .from("users")
      .select("id")
      .eq("referral_code", referralCode)
      .single();

    if (!referrer) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    // Don't allow self-referral
    if (referrer.id === referredUserId) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Record the referral
    const { error } = await admin.from("referrals").insert({
      referrer_id: referrer.id,
      referred_user_id: referredUserId,
      referral_type: referralType || null,
      status: "completed",
    });

    if (error) {
      // Duplicate referral — ignore
      if (error.code === "23505") {
        return NextResponse.json({ success: true, duplicate: true });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Referral POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

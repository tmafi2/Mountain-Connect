import crypto from "crypto";

/**
 * Signed "keep my listings live" links for the expiry warning email.
 *
 * HMAC-signed rather than a stored token column, following the pattern in
 * app/api/auth/login/route.ts. Nothing to migrate, nothing to clean up, and
 * the link stops working on its own.
 *
 * The token carries the BUSINESS, not a list of job ids. A business's set of
 * expiring posts can change between the email going out and the link being
 * opened — another role lapses, one gets filled and paused — and a token
 * naming fixed ids would either renew something already dealt with or miss
 * something new. Resolving the set at click time always matches what the
 * confirmation page shows, and keeps the URL short.
 *
 * 21 days rather than 7: the warning goes out a week before expiry, and
 * somebody who opens their email after a fortnight away should still be able
 * to act rather than being told the link is dead.
 */
const TOKEN_TTL_MS = 21 * 24 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to sign renewal tokens");
  return s;
}

/** base64url so the token survives being pasted into a mail client. */
function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function unb64url(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signRenewToken(businessId: string, now: Date = new Date()): string {
  const payload = JSON.stringify({ b: businessId, exp: now.getTime() + TOKEN_TTL_MS });
  const sig = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  return `${b64url(Buffer.from(payload))}.${sig}`;
}

export type RenewTokenResult =
  | { ok: true; businessId: string }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

export function verifyRenewToken(token: string, now: Date = new Date()): RenewTokenResult {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };
  const [encoded, sig] = parts;

  let payload: string;
  try {
    payload = unb64url(encoded).toString("utf8");
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const expected = crypto.createHmac("sha256", secret()).update(payload).digest("hex");
  // Constant-time compare. timingSafeEqual throws on length mismatch, which
  // a forged token can trivially cause, so the lengths are checked first.
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))
  ) {
    return { ok: false, reason: "bad_signature" };
  }

  let parsed: { b?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(payload);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof parsed.b !== "string" || typeof parsed.exp !== "number") {
    return { ok: false, reason: "malformed" };
  }
  if (parsed.exp <= now.getTime()) return { ok: false, reason: "expired" };

  return { ok: true, businessId: parsed.b };
}

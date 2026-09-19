/**
 * Parameters carried by the links in Supabase's "Confirm signup" and "Reset
 * password" emails once their templates point at /auth/confirm:
 *
 *   https://www.mountainconnects.com/auth/confirm?token_hash={{ .TokenHash }}&type=email
 *   https://www.mountainconnects.com/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 *
 * Opening that link changes nothing; the page's button POSTs to
 * /api/auth/confirm, which verifies. Two failures on 2026-09-19 made this
 * necessary. A mail scanner opened a signup link fifteen seconds after it was
 * sent and used it up, so the person's own click showed "Authentication
 * failed". And the default {{ .ConfirmationURL }} is a PKCE link, which only
 * completes in the browser that signed up. Ad signups happen inside
 * Instagram's in-app browser and confirm from Gmail or Safari.
 */

export type ConfirmType = "email" | "recovery";

export interface ConfirmParams {
  tokenHash: string;
  type: ConfirmType;
}

// "signup" is Supabase's older name for "email"; accept both.
const TYPES: Record<string, ConfirmType> = {
  email: "email",
  signup: "email",
  recovery: "recovery",
};

// GoTrue token hashes are hex, with a "pkce_" prefix for PKCE-flow signups.
const TOKEN_HASH = /^[A-Za-z0-9_-]{1,512}$/;

export function parseConfirmParams(input: {
  token_hash?: unknown;
  type?: unknown;
}): ConfirmParams | null {
  const tokenHash =
    typeof input.token_hash === "string" ? input.token_hash.trim() : "";
  if (!TOKEN_HASH.test(tokenHash)) return null;

  const rawType = typeof input.type === "string" && input.type ? input.type : "email";
  const type = TYPES[rawType];
  if (!type) return null;

  return { tokenHash, type };
}

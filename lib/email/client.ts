import { Resend, type CreateEmailOptions, type CreateEmailResponseSuccess } from "resend";
import { htmlToText } from "./html-to-text";

let resend: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — emails will be skipped");
    return null;
  }
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

/**
 * Every outgoing message leaves here multipart: the HTML we wrote plus a
 * text/plain part derived from it.
 *
 * All 45 templates were HTML-only, and a message with no text part is a
 * bulk-sender signature — ordinary mail carries both. It is the cheapest
 * deliverability fix we have, and doing it HERE rather than per template is
 * what makes it true of the next email anyone writes, including one added
 * long after this comment.
 *
 * A caller that wants a better text part just passes `text`, and this leaves
 * it alone.
 */
export function withTextPart<T extends { html?: string; text?: string }>(params: T): T {
  if (params.text || !params.html) return params;
  const text = htmlToText(params.html);
  return text ? { ...params, text } : params;
}

// Resend's emails.send() returns { data, error } and does NOT throw when the
// send fails. Callers that check `!!result` would treat an error response as
// success — exactly the lying-green-banner bug we hit when an outreach email
// silently failed in prod. Use sendEmail() so failed sends always throw and
// the existing try/catch in each route surfaces the real Resend message.
export async function sendEmail(
  params: CreateEmailOptions
): Promise<CreateEmailResponseSuccess | null> {
  const client = getResendClient();
  if (!client) return null;
  const result = await client.emails.send(withTextPart(params));
  if (result.error) {
    const err = result.error as { message?: string; name?: string };
    const message = err.message || err.name || JSON.stringify(err);
    throw new Error(`Resend: ${message}`);
  }
  return result.data;
}

// Batch send up to 100 emails in a single Resend API call. Avoids the
// per-second rate limit when blasting to a large recipient list (the
// per-recipient sendEmail() path quickly hits "Too many requests").
// Throws if the whole batch is rejected; otherwise returns an array
// of email IDs in the same order as the input. Caller is responsible
// for chunking input into <= 100 entries.
export async function sendEmailBatch(
  params: CreateEmailOptions[]
): Promise<{ id: string }[]> {
  const client = getResendClient();
  if (!client) return [];
  if (params.length === 0) return [];
  const result = await client.batch.send(params.map(withTextPart));
  if (result.error) {
    const err = result.error as { message?: string; name?: string };
    const message = err.message || err.name || JSON.stringify(err);
    throw new Error(`Resend batch: ${message}`);
  }
  return result.data?.data ?? [];
}

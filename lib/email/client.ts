import { Resend, type CreateEmailOptions, type CreateEmailResponseSuccess } from "resend";

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
  const result = await client.emails.send(params);
  if (result.error) {
    const err = result.error as { message?: string; name?: string };
    const message = err.message || err.name || JSON.stringify(err);
    throw new Error(`Resend: ${message}`);
  }
  return result.data;
}

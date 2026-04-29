import { Resend } from "resend";

let resend: Resend | null = null;

export function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — emails will be skipped");
    return null;
  }
  if (!resend) {
    const client = new Resend(process.env.RESEND_API_KEY);
    // Resend's send() returns { data, error } and does NOT throw when the
    // send fails. Without this wrap, callers that check `!!result` would
    // treat an error response as success — exactly the lying-green-banner
    // bug we hit when an outreach email silently failed in prod. Wrap once
    // here so every send() throws on error and the existing try/catch in
    // each route surfaces the real failure.
    const originalSend = client.emails.send.bind(client.emails);
    client.emails.send = (async (...args: Parameters<typeof originalSend>) => {
      const result = await originalSend(...args);
      if (result?.error) {
        const err = result.error as { message?: string; name?: string };
        const message = err.message || err.name || JSON.stringify(err);
        throw new Error(`Resend: ${message}`);
      }
      return result;
    }) as typeof originalSend;
    resend = client;
  }
  return resend;
}

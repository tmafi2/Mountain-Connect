import { StreamChat } from "stream-chat";

let serverClient: StreamChat | null = null;

/**
 * Server-side Stream Chat client — uses API secret for admin operations.
 * Only use in API routes (never on the client).
 * Returns null if env vars are not configured.
 */
export function getStreamServerClient(): StreamChat | null {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY;
  const apiSecret = process.env.STREAM_CHAT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return null;
  }

  if (!serverClient) {
    serverClient = StreamChat.getInstance(apiKey, apiSecret);
  }

  return serverClient;
}

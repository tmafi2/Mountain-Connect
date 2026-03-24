/**
 * Generate a deterministic DM channel ID for two users.
 * Sorts UUIDs alphabetically so the same channel is found
 * regardless of who initiates the conversation.
 */
export function getDmChannelId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `dm__${sorted[0]}__${sorted[1]}`;
}

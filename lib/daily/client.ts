const DAILY_API_BASE = "https://api.daily.co/v1";

function getApiKey(): string | null {
  return process.env.DAILY_API_KEY || null;
}

function getDomain(): string {
  return process.env.NEXT_PUBLIC_DAILY_DOMAIN || "mountainconnect";
}

export async function createRoom(name: string, expiryMinutes = 60): Promise<{
  name: string;
  url: string;
} | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("DAILY_API_KEY not set — video rooms will use demo mode");
    return {
      name,
      url: `https://${getDomain()}.daily.co/${name}`,
    };
  }

  const exp = Math.floor(Date.now() / 1000) + expiryMinutes * 60;

  const res = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name,
      properties: {
        exp,
        enable_chat: true,
        enable_screenshare: true,
        max_participants: 4,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Failed to create Daily room:", err);
    return null;
  }

  const data = await res.json();
  return { name: data.name, url: data.url };
}

export async function createMeetingToken(
  roomName: string,
  userName: string,
  expiryMinutes = 60
): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn("DAILY_API_KEY not set — returning null token");
    return null;
  }

  const exp = Math.floor(Date.now() / 1000) + expiryMinutes * 60;

  const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_name: userName,
        exp,
        is_owner: false,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Failed to create Daily meeting token:", err);
    return null;
  }

  const data = await res.json();
  return data.token;
}

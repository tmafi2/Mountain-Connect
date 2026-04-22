export interface ParsedUserAgent {
  os: string | null;
  browser: string | null;
  deviceType: "mobile" | "tablet" | "desktop" | null;
}

/**
 * Minimal user-agent parser — good enough for the device / OS / browser
 * breakdowns we show in the NFC taps admin view. Intentionally avoids a
 * dependency on ua-parser-js because we only need coarse-grained labels.
 */
export function parseUserAgent(raw: string | null | undefined): ParsedUserAgent {
  if (!raw) return { os: null, browser: null, deviceType: null };
  const ua = raw.toLowerCase();

  let os: string | null = null;
  if (/iphone|ipod/.test(ua)) os = "iOS";
  else if (/ipad/.test(ua)) os = "iPadOS";
  else if (/android/.test(ua)) os = "Android";
  else if (/windows nt|win32|win64/.test(ua)) os = "Windows";
  else if (/mac os|macintosh/.test(ua)) os = "macOS";
  else if (/cros/.test(ua)) os = "ChromeOS";
  else if (/linux/.test(ua)) os = "Linux";

  // Browser order matters — Edge ships as "edg/" but also includes "chrome".
  let browser: string | null = null;
  if (/edg\//.test(ua)) browser = "Edge";
  else if (/opr\/|opera/.test(ua)) browser = "Opera";
  else if (/fxios|firefox/.test(ua)) browser = "Firefox";
  else if (/crios/.test(ua)) browser = "Chrome iOS";
  else if (/chrome/.test(ua) && !/chromium/.test(ua)) browser = "Chrome";
  else if (/chromium/.test(ua)) browser = "Chromium";
  else if (/safari/.test(ua)) browser = "Safari";

  let deviceType: "mobile" | "tablet" | "desktop" | null = "desktop";
  if (/ipad|tablet/.test(ua)) deviceType = "tablet";
  else if (/iphone|ipod/.test(ua)) deviceType = "mobile";
  else if (/android/.test(ua)) {
    // Android phones include "Mobile"; tablets typically omit it.
    deviceType = /mobile/.test(ua) ? "mobile" : "tablet";
  } else if (/mobile/.test(ua)) {
    deviceType = "mobile";
  }

  return { os, browser, deviceType };
}

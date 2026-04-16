"use client";

import { useState, useEffect } from "react";

interface VideoRoomProps {
  interviewId: string;
  roomUrl?: string;
  isDemo?: boolean;
}

export default function VideoRoom({ interviewId, roomUrl, isDemo }: VideoRoomProps) {
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [callUrl, setCallUrl] = useState(roomUrl || "");
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setLoading(true);
    setError(null);

    if (isDemo) {
      // Demo mode — show placeholder
      setCallUrl("demo");
      setJoined(true);
      setLoading(false);
      return;
    }

    try {
      // Create room if needed
      if (!callUrl) {
        const roomRes = await fetch("/api/daily/room", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interview_id: interviewId }),
        });

        if (!roomRes.ok) {
          const data = await roomRes.json();
          setError(data.error || "Failed to create video room");
          setLoading(false);
          return;
        }

        const roomData = await roomRes.json();
        setCallUrl(roomData.room_url);
      }

      setJoined(true);
    } catch {
      setError("Failed to join video call. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = () => {
    setJoined(false);
  };

  if (!joined) {
    return (
      <div className="rounded-xl border border-accent bg-white p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary/20">
          <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-primary">Video Interview</h3>
        <p className="mt-2 text-sm text-foreground/60">
          Click below to join the video call. Make sure your camera and microphone are ready.
        </p>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={handleJoin}
          disabled={loading}
          className="mt-6 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? "Connecting…" : "Join Video Call"}
        </button>
      </div>
    );
  }

  // Demo mode placeholder
  if (isDemo || callUrl === "demo") {
    return (
      <div className="overflow-hidden rounded-xl border border-accent bg-gray-900">
        <div className="flex aspect-video items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-700">
              <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-400">Video Call — Demo Mode</p>
            <p className="mt-1 text-xs text-gray-500">
              In production, the Daily.co video call will appear here
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 border-t border-gray-700 bg-gray-800 px-4 py-3">
          <button className="rounded-full bg-gray-700 p-3 text-gray-300 transition-colors hover:bg-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <button className="rounded-full bg-gray-700 p-3 text-gray-300 transition-colors hover:bg-gray-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            onClick={handleLeave}
            className="rounded-full bg-red-600 p-3 text-white transition-colors hover:bg-red-700"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Real Daily.co iframe
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-accent">
        <iframe
          src={callUrl}
          allow="camera; microphone; fullscreen; display-capture"
          className="aspect-video w-full"
          title="Video Interview"
        />
        <div className="flex items-center justify-between border-t border-accent bg-white px-4 py-2">
          <p className="text-xs text-foreground/50">Video call powered by Daily.co</p>
          <button
            onClick={handleLeave}
            className="rounded-lg bg-red-50 px-4 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            Leave Call
          </button>
        </div>
      </div>
      <TroubleshootingGuide />
    </div>
  );
}

function TroubleshootingGuide() {
  const [open, setOpen] = useState(false);
  const [detected, setDetected] = useState<"chrome" | "safari" | "firefox" | "edge" | "other">("other");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("edg/")) setDetected("edge");
    else if (ua.includes("chrome")) setDetected("chrome");
    else if (ua.includes("safari")) setDetected("safari");
    else if (ua.includes("firefox")) setDetected("firefox");
  }, []);

  const browserLabel = {
    chrome: "Google Chrome",
    safari: "Safari",
    firefox: "Firefox",
    edge: "Microsoft Edge",
    other: "your browser",
  }[detected];

  return (
    <div className="mt-4 rounded-xl border border-accent bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2.5">
          <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
          <span className="text-sm font-semibold text-primary">Having trouble with your camera or microphone?</span>
        </div>
        <svg
          className={`h-5 w-5 text-foreground/40 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-accent px-5 pb-5 pt-4">
          <p className="mb-4 text-sm text-foreground/60">
            We detected you are using <span className="font-medium text-primary">{browserLabel}</span>. Follow the steps below to allow camera and microphone access.
          </p>

          {/* Browser-specific instructions */}
          <div className="space-y-4">
            {detected === "chrome" && (
              <BrowserSteps
                title="Google Chrome"
                steps={[
                  "Look for the camera icon (🎥) in the address bar at the top right — click it.",
                  'Select "Always allow mountainconnects.com to access your camera and microphone".',
                  'Click "Done", then refresh the page.',
                  "If you don't see the icon: go to Settings → Privacy and Security → Site Settings → Camera (and Microphone) → allow mountainconnects.com.",
                ]}
              />
            )}
            {detected === "safari" && (
              <BrowserSteps
                title="Safari"
                steps={[
                  "When prompted, click \"Allow\" to grant camera and microphone access.",
                  "If you denied access: go to Safari → Settings → Websites → Camera (and Microphone).",
                  'Find "mountainconnects.com" and change the setting to "Allow".',
                  "Close Settings and refresh the page.",
                ]}
              />
            )}
            {detected === "firefox" && (
              <BrowserSteps
                title="Firefox"
                steps={[
                  "When prompted, click \"Allow\" in the permission popup at the top of the page.",
                  "Check \"Remember this decision\" so you won't be asked again.",
                  "If you blocked access: click the lock icon (🔒) in the address bar.",
                  'Click "Clear Permissions" or "More Information → Permissions" and allow camera and microphone.',
                  "Refresh the page after updating permissions.",
                ]}
              />
            )}
            {detected === "edge" && (
              <BrowserSteps
                title="Microsoft Edge"
                steps={[
                  "Look for the camera icon in the address bar — click it.",
                  'Select "Always allow" for both camera and microphone.',
                  'Click "Done", then refresh the page.',
                  "If you don't see the icon: go to Settings → Cookies and Site Permissions → Camera (and Microphone) → allow mountainconnects.com.",
                ]}
              />
            )}
            {detected === "other" && (
              <BrowserSteps
                title="General Steps"
                steps={[
                  "When prompted by the browser, click \"Allow\" to grant camera and microphone access.",
                  "If you denied access, check your browser settings to allow camera and microphone for mountainconnects.com.",
                  "Refresh the page after updating permissions.",
                ]}
              />
            )}

            {/* Device-level tips */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-2">
                Device Tips
              </h4>
              <ul className="space-y-1.5 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-400">•</span>
                  <span><strong>Mac:</strong> Go to System Settings → Privacy & Security → Camera (and Microphone) — make sure your browser is checked/allowed.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-400">•</span>
                  <span><strong>Windows:</strong> Go to Settings → Privacy → Camera (and Microphone) — make sure browser access is turned on.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-400">•</span>
                  <span><strong>Phone/Tablet:</strong> Go to your device Settings → find your browser app → enable Camera and Microphone permissions.</span>
                </li>
              </ul>
            </div>

            {/* General tips */}
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">
                Still not working?
              </h4>
              <ul className="space-y-1.5 text-sm text-foreground/60">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-foreground/30">•</span>
                  <span>Close other apps that might be using your camera (Zoom, Teams, FaceTime, etc.).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-foreground/30">•</span>
                  <span>Try refreshing the page or opening the interview link in a new tab.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-foreground/30">•</span>
                  <span>If using an external camera or microphone, check that it is properly connected.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-foreground/30">•</span>
                  <span>As a last resort, try a different browser — Google Chrome works best for video calls.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BrowserSteps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
        <svg className="h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        {title}
      </h4>
      <ol className="ml-6 space-y-1.5">
        {steps.map((step, i) => (
          <li key={i} className="text-sm text-foreground/70 list-decimal">
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}

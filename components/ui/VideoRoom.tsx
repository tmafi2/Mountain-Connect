"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Check if native Fullscreen API is supported (not on most mobile browsers)
  const supportsNativeFullscreen = typeof document !== "undefined" && (
    !!document.documentElement.requestFullscreen ||
    !!(document.documentElement as HTMLElement & { webkitRequestFullscreen?: unknown }).webkitRequestFullscreen
  );

  // Listen for native fullscreen changes (desktop)
  useEffect(() => {
    const handleFullscreenChange = () => {
      // If native fullscreen was exited (e.g. via Escape), sync state
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Lock body scroll when in CSS fullscreen (mobile)
  useEffect(() => {
    if (isFullscreen && !supportsNativeFullscreen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isFullscreen, supportsNativeFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      // Exit fullscreen
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      } else if ((document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
        await (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    } else {
      // Enter fullscreen — try native API first (desktop), fall back to CSS (mobile)
      const el = videoContainerRef.current;
      if (!el) return;

      let wentNative = false;
      try {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
          wentNative = true;
        } else if ((el as HTMLDivElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (el as HTMLDivElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
          wentNative = true;
        }
      } catch {
        // Native fullscreen denied or not supported — fall through to CSS
      }

      // Always set state (CSS fullscreen kicks in if native didn't work)
      setIsFullscreen(true);
      if (!wentNative) {
        // Scroll to top so the fixed overlay is visible
        window.scrollTo(0, 0);
      }
    }
  }, [isFullscreen]);

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
      <div
        ref={videoContainerRef}
        className={`overflow-hidden bg-black ${
          isFullscreen
            ? "fixed inset-0 z-[9999] flex flex-col"
            : "rounded-xl border border-accent"
        }`}
        style={isFullscreen ? { width: "100vw", height: "100vh" } : undefined}
      >
        <iframe
          src={callUrl}
          allow="camera; microphone; fullscreen; display-capture"
          allowFullScreen
          className={`w-full ${isFullscreen ? "flex-1" : "aspect-video"}`}
          style={isFullscreen ? { minHeight: 0 } : undefined}
          title="Video Interview"
        />
        <div className={`flex items-center justify-between px-4 py-2 shrink-0 ${
          isFullscreen ? "bg-gray-900 safe-pb" : "border-t border-accent bg-white"
        }`}
          style={isFullscreen ? { paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" } : undefined}
        >
          <p className={`text-xs ${isFullscreen ? "text-gray-400" : "text-foreground/50"}`}>
            Video call powered by Daily.co
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                isFullscreen
                  ? "bg-gray-700 text-gray-200 hover:bg-gray-600"
                  : "bg-gray-100 text-foreground/70 hover:bg-gray-200"
              }`}
              title={isFullscreen ? "Exit Full Screen" : "Full Screen"}
            >
              {isFullscreen ? (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                  </svg>
                  Exit Full Screen
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                  </svg>
                  Full Screen
                </>
              )}
            </button>
            <button
              onClick={handleLeave}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-colors ${
                isFullscreen
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-red-50 text-red-600 hover:bg-red-100"
              }`}
            >
              Leave Call
            </button>
          </div>
        </div>
      </div>
      {!isFullscreen && <TroubleshootingGuide />}
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
          {/* Mac system-level warning — most common issue */}
          {typeof navigator !== "undefined" && navigator.platform?.includes("Mac") && (
            <div className="mb-4 rounded-lg border-2 border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-800">Mac Users — Check System Settings First!</p>
                  <p className="mt-1 text-sm text-red-700">
                    Even if your browser shows camera/mic as &quot;Allowed&quot;, macOS may be blocking it at the system level.
                  </p>
                  <ol className="mt-2 ml-5 space-y-1 list-decimal text-sm text-red-700">
                    <li>Open <strong>System Settings</strong> (Apple menu  → System Settings)</li>
                    <li>Go to <strong>Privacy &amp; Security → Camera</strong> — make sure <strong>{browserLabel}</strong> is toggled <strong>ON</strong></li>
                    <li>Go to <strong>Privacy &amp; Security → Microphone</strong> — make sure <strong>{browserLabel}</strong> is toggled <strong>ON</strong></li>
                    <li>If prompted, click <strong>&quot;Relaunch&quot;</strong> to restart your browser</li>
                    <li>Come back to this page and click <strong>&quot;Join Video Call&quot;</strong> again</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          <p className="mb-4 text-sm text-foreground/60">
            We detected you are using <span className="font-medium text-primary">{browserLabel}</span>. Follow the steps below to allow camera and microphone access.
          </p>

          {/* Browser-specific instructions */}
          <div className="space-y-4">
            {detected === "chrome" && (
              <div>
                <h4 className="text-sm font-semibold text-primary mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Google Chrome — Allow Camera &amp; Microphone
                </h4>

                {/* Method 1 — quickest */}
                <div className="rounded-lg border border-secondary/20 bg-secondary/5 p-4 mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Quickest Method</p>
                  <ol className="ml-5 space-y-1.5 list-decimal">
                    <li className="text-sm text-foreground/70">Click the <strong>lock icon</strong> or <strong>tune/sliders icon</strong> (⚙) in the address bar — it is to the left of the website URL.</li>
                    <li className="text-sm text-foreground/70">You will see <strong>Camera</strong> and <strong>Microphone</strong> listed — change both from &quot;Block&quot; to <strong>&quot;Allow&quot;</strong>.</li>
                    <li className="text-sm text-foreground/70">The page will automatically refresh. Click <strong>&quot;Join Video Call&quot;</strong> again.</li>
                  </ol>
                </div>

                {/* Method 2 — address bar icon */}
                <div className="rounded-lg border border-accent bg-gray-50 p-4 mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">Alternative — Camera Icon</p>
                  <ol className="ml-5 space-y-1.5 list-decimal">
                    <li className="text-sm text-foreground/70">Look for a <strong>camera icon with a red X</strong> on the far right side of the address bar.</li>
                    <li className="text-sm text-foreground/70">Click it and select <strong>&quot;Always allow mountainconnects.com to access your camera and microphone&quot;</strong>.</li>
                    <li className="text-sm text-foreground/70">Click <strong>&quot;Done&quot;</strong>, then refresh the page.</li>
                  </ol>
                </div>

                {/* Method 3 — Chrome settings */}
                <div className="rounded-lg border border-accent bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-foreground/50 mb-2">Via Chrome Settings</p>
                  <ol className="ml-5 space-y-1.5 list-decimal">
                    <li className="text-sm text-foreground/70">Copy and paste this into your address bar: <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono text-primary select-all">chrome://settings/content/camera</code></li>
                    <li className="text-sm text-foreground/70">Make sure <strong>&quot;Sites can ask to use your camera&quot;</strong> is selected (not blocked).</li>
                    <li className="text-sm text-foreground/70">If mountainconnects.com is listed under &quot;Not allowed&quot;, click it and change to <strong>&quot;Allow&quot;</strong>.</li>
                    <li className="text-sm text-foreground/70">Repeat for microphone: <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono text-primary select-all">chrome://settings/content/microphone</code></li>
                    <li className="text-sm text-foreground/70">Come back to this page and refresh.</li>
                  </ol>
                </div>
              </div>
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

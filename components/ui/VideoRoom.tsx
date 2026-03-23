"use client";

import { useState } from "react";

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
  );
}

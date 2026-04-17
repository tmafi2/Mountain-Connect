"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface ResumeViewerProps {
  /** Storage path like "userId/resume.pdf" OR a full URL */
  resumePath: string;
  /** Display name shown on the button / header */
  fileName?: string;
  /** Render style: "button" shows a clickable button, "inline" shows the card inline */
  variant?: "button" | "inline";
}

export default function ResumeViewer({
  resumePath,
  fileName = "Resume",
  variant = "button",
}: ResumeViewerProps) {
  const [open, setOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFullUrl = resumePath.startsWith("http://") || resumePath.startsWith("https://");
  const isPdf = resumePath.toLowerCase().endsWith(".pdf");

  const getSignedUrl = useCallback(async () => {
    if (isFullUrl) {
      setSignedUrl(resumePath);
      return resumePath;
    }

    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: urlError } = await supabase.storage
        .from("resumes")
        .createSignedUrl(resumePath, 300); // 5 min expiry

      if (urlError || !data?.signedUrl) {
        throw new Error(urlError?.message || "Could not generate link");
      }
      setSignedUrl(data.signedUrl);
      return data.signedUrl;
    } catch (err: any) {
      setError(err.message || "Failed to load document");
      return null;
    } finally {
      setLoading(false);
    }
  }, [resumePath, isFullUrl]);

  const handleOpen = async () => {
    setOpen(true);
    if (!signedUrl) {
      await getSignedUrl();
    }
  };

  const handleDownload = async () => {
    let url = signedUrl;
    if (!url) {
      url = await getSignedUrl();
    }
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const displayName = fileName || resumePath.split("/").pop() || "Resume";

  return (
    <>
      {/* Trigger */}
      {variant === "button" ? (
        <button
          onClick={handleOpen}
          className="flex items-center gap-2 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm font-medium text-primary transition-all hover:border-secondary/50 hover:shadow-sm"
        >
          <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {displayName}
        </button>
      ) : (
        <button
          onClick={handleOpen}
          className="flex items-center gap-3 rounded-xl border border-accent bg-accent/10 p-3 hover:bg-accent/20 transition-colors group w-full text-left"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary truncate">{displayName}</p>
            <p className="text-xs text-foreground/40">Click to preview</p>
          </div>
          <svg className="h-4 w-4 text-foreground/30 group-hover:text-primary transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      )}

      {/* Fullscreen Preview Modal */}
      {open && (
        <div className="fixed inset-0 z-[80] flex flex-col">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Modal container */}
          <div className="relative z-10 flex flex-col h-full max-h-screen">
            {/* Header bar */}
            <div className="flex items-center justify-between bg-[#1a1a2e] px-6 py-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/20">
                  <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{displayName}</h3>
                  <p className="text-xs text-white/50">Document Preview</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Download button */}
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20 disabled:opacity-50"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download
                </button>

                {/* Open in new tab */}
                {signedUrl && (
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open
                  </a>
                )}

                {/* Close */}
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 flex items-center justify-center p-2 overflow-auto">
              {loading && (
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <p className="text-sm text-white/60">Loading document...</p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
                    <svg className="h-7 w-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/70">{error}</p>
                  <button
                    onClick={getSignedUrl}
                    className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {signedUrl && !loading && !error && (
                <>
                  {isPdf ? (
                    <iframe
                      src={`${signedUrl}#toolbar=1&navpanes=0&view=FitH`}
                      className="w-full h-full max-w-6xl rounded-lg bg-white shadow-2xl"
                      style={{ minHeight: "calc(100vh - 80px)" }}
                      title="Resume Preview"
                    />
                  ) : (
                    /* Non-PDF documents — show download prompt */
                    <div className="flex flex-col items-center gap-4 rounded-2xl bg-white/10 p-10 text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10">
                        <svg className="h-10 w-10 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-white">{displayName}</h4>
                        <p className="mt-1 text-sm text-white/50">
                          This document type cannot be previewed in the browser.
                        </p>
                      </div>
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Download Document
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

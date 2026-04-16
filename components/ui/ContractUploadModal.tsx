"use client";

import { useState, useRef } from "react";

interface ContractUploadModalProps {
  applicationId: string;
  workerName: string;
  jobTitle: string;
  onSuccess: () => void;
  onClose: () => void;
  onSendWithout: () => void;
}

export default function ContractUploadModal({
  applicationId,
  workerName,
  jobTitle,
  onSuccess,
  onClose,
  onSendWithout,
}: ContractUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSend = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("applicationId", applicationId);
      formData.append("file", file);

      const res = await fetch("/api/contracts/send", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({ error: "Failed to send" }));
        setError(data.error || "Failed to send contract. Please try again.");
      }
    } catch {
      setError("Failed to send contract. Please try again.");
    }
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-accent/30 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-accent/30 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-primary">Send Offer</h3>
            <p className="mt-0.5 text-sm text-foreground/50">
              to {workerName} for {jobTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-foreground/40 transition-colors hover:bg-accent/30 hover:text-foreground/70"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-foreground/70">
            Upload a contract PDF for the worker to review and sign. They will receive a notification to view and sign the contract.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              dragOver
                ? "border-secondary bg-secondary/5"
                : file
                ? "border-green-300 bg-green-50/50"
                : "border-accent hover:border-secondary/50 hover:bg-accent/10"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
              className="hidden"
            />

            {file ? (
              <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="mt-2 text-sm font-medium text-primary">{file.name}</p>
                <p className="text-xs text-foreground/40">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="mt-2 text-xs text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 text-foreground/40">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="mt-2 text-sm font-medium text-foreground/60">
                  Drop PDF here or click to browse
                </p>
                <p className="text-xs text-foreground/40">PDF up to 10MB</p>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-accent/30 px-6 py-4 flex items-center justify-between">
          <button
            onClick={onSendWithout}
            className="text-sm text-foreground/50 hover:text-foreground/70 transition-colors underline underline-offset-2"
          >
            Send offer without contract
          </button>
          <button
            onClick={handleSend}
            disabled={!file || uploading}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90 hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {uploading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Sending...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Send Contract
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

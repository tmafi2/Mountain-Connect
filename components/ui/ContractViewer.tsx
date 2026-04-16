"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import SignaturePad from "@/components/ui/SignaturePad";

interface ContractViewerProps {
  contractId: string;
  originalPdfPath: string;
  status: "pending" | "signed";
  signedPdfPath?: string | null;
  workerName?: string;
  onSigned?: () => void;
}

export default function ContractViewer({
  contractId,
  originalPdfPath,
  status,
  signedPdfPath,
  workerName,
  onSigned,
}: ContractViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(status === "signed");
  const [error, setError] = useState<string | null>(null);

  // Get signed URLs for the PDFs
  useEffect(() => {
    async function getUrls() {
      try {
        const supabase = createClient();

        // Get URL for original PDF
        const { data: origData, error: origErr } = await supabase.storage
          .from("contracts")
          .createSignedUrl(originalPdfPath, 3600); // 1 hour

        if (origErr || !origData?.signedUrl) {
          setError("Could not load contract document.");
          setLoading(false);
          return;
        }
        setPdfUrl(origData.signedUrl);

        // Get URL for signed PDF if it exists
        if (signedPdfPath) {
          const { data: signData } = await supabase.storage
            .from("contracts")
            .createSignedUrl(signedPdfPath, 3600);
          if (signData?.signedUrl) {
            setSignedUrl(signData.signedUrl);
          }
        }
      } catch {
        setError("Failed to load contract.");
      }
      setLoading(false);
    }
    getUrls();
  }, [originalPdfPath, signedPdfPath]);

  const handleSign = async (signatureDataUrl: string) => {
    setSigning(true);
    setError(null);
    try {
      const res = await fetch("/api/contracts/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId,
          signatureData: signatureDataUrl,
          signerName: workerName || "Worker",
        }),
      });

      if (res.ok) {
        setSigned(true);
        onSigned?.();
      } else {
        const data = await res.json().catch(() => ({ error: "Failed to sign" }));
        setError(data.error || "Failed to sign contract. Please try again.");
      }
    } catch {
      setError("Failed to sign contract. Please try again.");
    }
    setSigning(false);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch {
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-accent bg-white p-8 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
        <p className="mt-3 text-sm text-foreground/50">Loading contract...</p>
      </div>
    );
  }

  if (error && !pdfUrl) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contract header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-primary">Employment Contract</h3>
            <p className="text-xs text-foreground/40">
              {signed ? "Signed" : "Awaiting your signature"}
            </p>
          </div>
        </div>

        {/* Download buttons */}
        <div className="flex items-center gap-2">
          {pdfUrl && (
            <button
              onClick={() => handleDownload(pdfUrl, "contract-original.pdf")}
              className="rounded-lg border border-accent/50 px-3 py-1.5 text-xs font-medium text-foreground/60 transition-colors hover:bg-accent/20 hover:text-primary flex items-center gap-1.5"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Original
            </button>
          )}
          {signedUrl && (
            <button
              onClick={() => handleDownload(signedUrl, "contract-signed.pdf")}
              className="rounded-lg bg-green-50 border border-green-200 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 flex items-center gap-1.5"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Signed Copy
            </button>
          )}
        </div>
      </div>

      {/* Signed badge */}
      {signed && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Contract Signed</p>
            <p className="text-xs text-green-600">Your signed contract has been sent to the employer.</p>
          </div>
        </div>
      )}

      {/* PDF viewer */}
      {pdfUrl && (
        <div className="rounded-xl border border-accent/50 bg-white overflow-hidden">
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            className="h-[500px] w-full border-0"
            title="Contract PDF"
          />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Signature pad — only show if not yet signed */}
      {!signed && (
        <div className="rounded-xl border border-accent bg-white p-5">
          {signing ? (
            <div className="flex flex-col items-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
              <p className="mt-3 text-sm text-foreground/50">Signing contract...</p>
            </div>
          ) : (
            <SignaturePad onSign={handleSign} />
          )}
        </div>
      )}
    </div>
  );
}

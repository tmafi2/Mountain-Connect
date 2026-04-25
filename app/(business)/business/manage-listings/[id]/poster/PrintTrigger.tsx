"use client";

import { useEffect } from "react";

/**
 * Auto-opens the browser print dialog once the poster has rendered, and
 * wires the screen-only "Print" button. Mirrors the pattern in
 * /business/interviews/print/PrintTrigger.tsx.
 */
export default function PrintTrigger() {
  useEffect(() => {
    const btn = document.querySelector<HTMLButtonElement>("[data-print-button]");
    const onClick = () => window.print();
    btn?.addEventListener("click", onClick);

    const timeout = window.setTimeout(() => {
      window.print();
    }, 500);

    return () => {
      btn?.removeEventListener("click", onClick);
      window.clearTimeout(timeout);
    };
  }, []);

  return null;
}

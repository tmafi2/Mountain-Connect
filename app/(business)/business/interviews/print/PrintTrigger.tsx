"use client";

import { useEffect } from "react";

/**
 * Wires the screen-only Print button and auto-opens the browser print
 * dialog once after mount (short delay so layout + images settle).
 */
export default function PrintTrigger() {
  useEffect(() => {
    const btn = document.querySelector<HTMLButtonElement>("[data-print-button]");
    const onClick = () => window.print();
    btn?.addEventListener("click", onClick);

    const timeout = window.setTimeout(() => {
      window.print();
    }, 400);

    return () => {
      btn?.removeEventListener("click", onClick);
      window.clearTimeout(timeout);
    };
  }, []);

  return null;
}

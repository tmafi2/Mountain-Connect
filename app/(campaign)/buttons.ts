/**
 * Button looks for campaign pages. Square-ish corners and uppercase labels on
 * purpose: these pages should read like the ad that sent people here, not
 * like the product dashboard.
 *
 * Cyan (`highlight`) is the only filled button colour, and it always means
 * "move forward". Navy text on it is ~10:1 contrast.
 */
const BASE =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-md text-center font-extrabold uppercase tracking-[0.08em] transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 motion-safe:active:scale-[0.98]";

export const BTN_PRIMARY = `${BASE} bg-highlight px-7 py-4 text-[15px] text-primary shadow-[0_12px_32px_-12px_rgba(34,211,238,0.75)] hover:bg-white focus-visible:outline-white`;

/** The quiz result's signup button — the most important button on the page. */
export const BTN_PRIMARY_XL = `${BASE} bg-highlight px-8 py-5 text-base text-primary shadow-[0_16px_40px_-12px_rgba(34,211,238,0.8)] hover:bg-white focus-visible:outline-white`;

/** Secondary action on a dark background. */
export const BTN_GHOST = `${BASE} border border-white/45 px-7 py-4 text-[15px] text-white hover:border-white hover:bg-white/10 focus-visible:outline-highlight`;

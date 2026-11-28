import type { ReactNode } from "react";

/**
 * The page's layout rhythm, as three primitives.
 *
 * These exist because the homepage's problem was never its words — it was
 * that every beat sat in the same place. A centred column down the middle of
 * every screen is what makes a page read as a stack of blocks, and it also
 * parks the content directly in front of the one object the page is built
 * around. Measured off dala.craftedbygc.com, the fix is specific:
 *
 *   - the copy column is ~32% of the viewport (360px of 1123), not the middle
 *     two thirds, and it ALTERNATES right → left down the page
 *   - between those columns sit HALF-SCREEN statements: wide, centred, short
 *   - roughly two thirds of every screen is left empty for the visual
 *
 * So `Column` and `Statement` are not styling helpers. They are the flow.
 */

/**
 * A narrow column of copy pinned to one side, with the rest of the screen
 * left to the particle field.
 *
 * ⚠️ THE SIDE MUST ALTERNATE. Two of these in a row on the same side is the
 * centred-stack problem again with a different margin; the movement across
 * the page is the entire effect.
 */
/**
 * ⚠️ TALLER THAN THE VIEWPORT ON DESKTOP, AND THE EXTRA HEIGHT IS THE POINT.
 * Each of these sections now holds a different particle formation, and a
 * formation needs a stretch of page where it simply sits — at exactly one
 * screen per section the cloud arrives and immediately leaves, so you never
 * see what it became. It is also arithmetic: the gap between two holds is
 * roughly one over the number of sections, and the explode between them
 * cannot travel further than that gap allows.
 *
 * On a phone it stays at one screen. There is no particle field there at all,
 * so the extra height would be nothing but blank page.
 */
const TALL = "min-h-screen md:min-h-[150vh]";

export function Column({
  side,
  children,
  className = "",
}: {
  side: "left" | "right";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative flex ${TALL} items-center px-6 py-24 md:px-12 ${className}`}
    >
      {/* ⚠️ A SCRIM ON THE TEXT'S SIDE ONLY, and it is not decoration.
          The particle field is full-viewport and its particles are additive
          and bright, so a 14px line of body copy can end up with a lit
          particle directly behind it — which no amount of raising the text
          colour fixes, because the thing behind it is brighter than white
          text on this ground. Dala sidesteps the problem by keeping its
          canvas object on the side its column is not; ours fills the screen,
          so the ground under the copy is darkened instead.

          It fades to fully transparent well before the middle, so the cloud
          is untouched where the reader is actually looking at it. Mirrored by
          side, because the column alternates. */}
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 hidden md:block ${
          side === "right"
            ? "bg-gradient-to-l from-primary via-primary/70 via-35% to-transparent"
            : "bg-gradient-to-r from-primary via-primary/70 via-35% to-transparent"
        }`}
      />
      <div className="relative mx-auto w-full max-w-[1280px]">
        <div
          className={`w-full md:max-w-[400px] ${side === "right" ? "md:ml-auto" : "md:mr-auto"}`}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

/**
 * A half-screen statement: wide, centred, and short enough to be read in one
 * look. Three of these in a row carry the argument between the columns.
 */
export function Statement({ children }: { children: ReactNode }) {
  return (
    <section className="relative flex min-h-[55vh] items-center justify-center px-6 py-12">
      <div className="mx-auto w-full max-w-3xl text-center">{children}</div>
    </section>
  );
}

/**
 * A full-width section with its own ground: heading, then content that uses
 * the whole frame.
 *
 * ⚠️ THIS EXISTS BECAUSE A SIDE SCRIM CANNOT HELP A FULL-WIDTH SECTION. The
 * `Column` scrim darkens the half the copy sits on and leaves the other half
 * clear, which works only while the copy is on one side. The "Why" section
 * is a three-card row spanning the frame, and the chairlift formation lands
 * exactly on it — a bright additive cable and five chairs running straight
 * through the middle card's body text, which was unreadable.
 *
 * So the gradient runs vertically instead: clear at the top and bottom of
 * the section, so the formation is still plainly there above and below the
 * words, and dark through the middle band where the reading happens. The
 * alternative — dimming the whole field — would cost the picture everywhere
 * to fix it in one place.
 */
export function Band({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`relative flex ${TALL} items-center px-6 py-24 md:px-12 ${className}`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-primary/80 to-transparent"
      />
      <div className="relative mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}

/** The small uppercase label above a heading. 12px/600/0.2em, per the record. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-highlight">
      {children}
    </span>
  );
}

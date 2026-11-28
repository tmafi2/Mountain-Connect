"use client";

import { useLayoutEffect, useRef, type ElementType } from "react";

/**
 * Text that rises into place one LINE at a time, out of a mask, straightening
 * as it comes.
 *
 * This is a reimplementation of the `splitTextRotateIn` effect on
 * dala.craftedbygc.com, recorded from the live page rather than guessed at.
 * Every number below is measured, and the measurements are worth keeping:
 *
 *   Per line, the markup is a clipping box with the line inside it, starting
 *   at translateY(120%) rotate(7deg) and tweening to translateY(0) rotate(0).
 *   Sampling four consecutive lines 160ms apart gave:
 *
 *     line 1: 120% → 52.30% → 18.31% → 3.69% → 0.23%
 *     line 2: 120% → 63.88% → 23.70% → 5.39% → 0.47%
 *     line 3: 120% → 110.3% → 47.13% → 14.09% → 2.38%
 *     line 4: 120% → 120%   → 120%   → 47.63% → 13.93%
 *
 *   Two things fall out of that. Rotation tracks Y exactly —
 *   `rotate = 7deg × (y / 120)` at every sample — so it is ONE tween moving
 *   two properties, not two tweens that happen to agree. And the remaining
 *   fraction per frame (0.44, 0.35, 0.20, 0.06) is a quartic ease-out: at
 *   t=0.2/0.4/0.6/0.8 a power4 curve leaves 0.41/0.13/0.026/0.0016 against
 *   the measured 0.44/0.15/0.031/0.0019. Hence the cubic-bezier below.
 *   The gap between lines is ~70ms.
 *
 * ⚠️ THE TEXT IS SERVER-RENDERED PLAIN AND COMPLETE, and that is the whole
 * reason this is safe to put on the homepage. The markup a crawler is served
 * is an ordinary <h2> or <p> holding the whole sentence; the split happens on
 * the client afterwards and only rearranges what is already there. If the
 * JavaScript never runs — no JS, an old browser, a crawler that does not
 * execute it — the text simply sits there, visible and readable, and the page
 * loses an animation rather than a paragraph. Nothing here may ever start
 * from opacity:0 in the server output.
 *
 * ⚠️ SPLITTING HAPPENS IN useLayoutEffect, NOT useEffect. The text is visible
 * in its final position on first paint; hiding it has to happen in the same
 * frame or there is a flash of fully-formed text that then drops and replays.
 */

/** Where the tween starts. Both numbers are from the recording. */
const START_Y = 120;
const START_ROTATE = 7;
/** Measured: a quartic ease-out. See the sample table above. */
const EASE = "cubic-bezier(0.165, 0.84, 0.44, 1)";
const DURATION_MS = 800;
const STAGGER_MS = 70;

interface SplitLinesProps {
  /** Plain text. Rich children are deliberately not supported — see below. */
  text: string;
  /**
   * A substring to render in the brand gradient. Taken as a prop rather than
   * as markup inside `text` because the splitter rebuilds the element from
   * its words, and reassembling arbitrary nested inline elements across a
   * line boundary is a different and much worse problem. Every heading on
   * this page needs exactly one emphasised phrase, so this covers it.
   */
  highlight?: string;
  as?: ElementType;
  className?: string;
  /** Delay before this block's first line, for sequencing a stack of them. */
  delayMs?: number;
}

export default function SplitLines({
  text,
  highlight,
  as: Tag = "p",
  className = "",
  delayMs = 0,
}: SplitLinesProps) {
  const ref = useRef<HTMLElement>(null);

  // Build the static, accessible version once. This is what the server emits
  // and what anything without JS keeps.
  let initial: React.ReactNode = text;
  if (highlight && text.includes(highlight)) {
    const at = text.indexOf(highlight);
    initial = (
      <>
        {text.slice(0, at)}
        <span className="text-gradient">{highlight}</span>
        {text.slice(at + highlight.length)}
      </>
    );
  }

  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    // Which character range is the highlight? Used to re-apply the gradient
    // to the right words once the element has been rebuilt from scratch.
    const hlStart = highlight ? text.indexOf(highlight) : -1;
    const hlEnd = hlStart >= 0 ? hlStart + (highlight as string).length : -1;

    let lineEls: HTMLElement[] = [];
    let observer: IntersectionObserver | null = null;
    let revealed = false;

    /**
     * Rebuild the element as one clipping box per VISUAL line.
     *
     * Visual lines are not knowable without laying the text out, so the words
     * go in first as inline-blocks, their offsetTop is read, and words sharing
     * a top are one line. Doing it on the real element at its real width is
     * the only way to get breaks that match what the reader would have seen.
     */
    const split = () => {
      host.textContent = "";

      // Pass 1 — every word as an inline-block so it has an offsetTop.
      const words = text.split(/\s+/).filter(Boolean);
      const spans: HTMLSpanElement[] = [];
      let cursor = 0;
      for (const word of words) {
        const at = text.indexOf(word, cursor);
        cursor = at + word.length;
        const s = document.createElement("span");
        s.textContent = word;
        s.style.display = "inline-block";
        // Mark it now; the rebuild below cannot recover this from position.
        if (hlStart >= 0 && at >= hlStart && at < hlEnd) s.dataset.hl = "1";
        host.appendChild(s);
        host.appendChild(document.createTextNode(" "));
        spans.push(s);
      }

      // Pass 2 — group by offsetTop.
      const groups: HTMLSpanElement[][] = [];
      let lastTop: number | null = null;
      for (const s of spans) {
        if (lastTop === null || Math.abs(s.offsetTop - lastTop) > 2) {
          groups.push([s]);
          lastTop = s.offsetTop;
        } else {
          groups[groups.length - 1].push(s);
        }
      }

      // Pass 3 — one mask per line, one moving box inside it.
      host.textContent = "";
      lineEls = [];
      for (const group of groups) {
        const mask = document.createElement("span");
        mask.style.display = "block";
        mask.style.position = "relative";
        // ⚠️ The mask is what makes the line appear from nothing. Without it
        // the text is simply offset downward and overlaps its neighbour.
        mask.style.overflow = "hidden";
        // Descenders (g, y, p) are clipped by a box sized to the line height,
        // so the box is padded and pulled back up by the same amount.
        mask.style.paddingBottom = "0.18em";
        mask.style.marginBottom = "-0.18em";

        const inner = document.createElement("span");
        inner.style.display = "block";
        inner.style.transformOrigin = "0 0";
        inner.style.transform = `translateY(${START_Y}%) rotate(${START_ROTATE}deg)`;
        inner.style.willChange = "transform";

        group.forEach((s, i) => {
          const w = document.createElement("span");
          w.textContent = s.textContent;
          if (s.dataset.hl) w.className = "text-gradient";
          inner.appendChild(w);
          if (i < group.length - 1) inner.appendChild(document.createTextNode(" "));
        });

        mask.appendChild(inner);
        host.appendChild(mask);
        // ⚠️ A SPACE BETWEEN THE LINE BOXES, and it is not cosmetic.
        // The masks are block-level, so nothing visible depends on this —
        // but textContent is pure concatenation, and without the separator
        // the element reads "…into oneplace — with what eachadvert…". That
        // is what a screen reader's text, a copy-paste, and anything
        // scraping the rendered DOM would get: the whole sentence with a
        // word fused at every line break. Caught by reading textContent
        // back, not by looking at the page, where it is invisible.
        host.appendChild(document.createTextNode(" "));
        lineEls.push(inner);
      }
    };

    const reveal = () => {
      lineEls.forEach((el, i) => {
        el.style.transition = `transform ${DURATION_MS}ms ${EASE} ${delayMs + i * STAGGER_MS}ms`;
        el.style.transform = "translateY(0) rotate(0deg)";
      });
    };

    split();

    // Dala fires at `start: 'top bottom'` — the element's top reaching the
    // viewport's bottom, which is a plain threshold-0 intersection.
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          revealed = true;
          reveal();
          observer?.disconnect();
        }
      },
      { threshold: 0 },
    );
    observer.observe(host);

    // ⚠️ A resize changes where the lines BREAK, so the masks have to be
    // rebuilt — but only while the text is still hidden. Re-splitting after
    // the reveal would throw away the finished state and replay the whole
    // animation because the reader turned their phone, so once it has run the
    // element is left alone and keeps the browser's own reflow.
    let resizeTimer: number | undefined;
    const onResize = () => {
      if (revealed) return;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        split();
        observer?.disconnect();
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              revealed = true;
              reveal();
              observer?.disconnect();
            }
          },
          { threshold: 0 },
        );
        observer.observe(host);
      }, 150);
    };
    window.addEventListener("resize", onResize);

    return () => {
      observer?.disconnect();
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
  }, [text, highlight, delayMs]);

  return (
    <Tag ref={ref} className={className}>
      {initial}
    </Tag>
  );
}

/**
 * The same rise, for a block that is not text — a button, a list, a card.
 *
 * No line splitting, no mask: an arbitrary element clipped to its own box
 * loses shadows and focus rings. It fades and lifts instead, on the same
 * curve and the same trigger so it belongs to the same movement.
 */
export function RiseIn({
  children,
  className = "",
  delayMs = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // ⚠️ LAYOUT EFFECT, for the same reason as the splitter above. In a plain
  // useEffect the browser paints the block fully visible, then it snaps to
  // opacity 0 and fades back in — a flicker on anything near the top of the
  // page, where the first of these sits.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    el.style.opacity = "0";
    el.style.transform = "translateY(28px)";

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.style.transition = `transform ${DURATION_MS}ms ${EASE} ${delayMs}ms, opacity ${DURATION_MS}ms ${EASE} ${delayMs}ms`;
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          observer.disconnect();
        }
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delayMs]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

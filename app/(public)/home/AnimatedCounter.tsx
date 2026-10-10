"use client";

import { useEffect, useState, useRef } from "react";

/**
 * A number that counts up — but only as decoration.
 *
 * ⚠️ THE TRUE VALUE IS THE INITIAL STATE, not zero. This used to be
 * `useState(0)`, so the server HTML of the busiest page on the site read
 *
 *     <p>0</p><p>Ski Resorts</p>
 *     <p>0</p><p>Countries</p>
 *
 * and the real figures only ever appeared after hydration, in a browser, on
 * an effect. Crawlers and AI answer engines read the markup: they were told
 * the platform had zero resorts in zero countries, on the one page most
 * likely to be quoted back about our size. The counts were being queried
 * correctly all along and thrown away in the render.
 *
 * ⚠️ So anything that makes this start at 0 again must keep the true number
 * in the server HTML, or it undoes the fix invisibly — nothing breaks, no
 * test fails, the page just quietly says nothing.
 *
 * The animation now runs only when it cannot be seen starting: if the
 * element is already on screen at mount, the number is simply left at its
 * final value. Resetting it to 0 in view would show a correct figure drop
 * to nought and climb back, which is worse than not animating at all.
 */
export default function AnimatedCounter({
  target,
  suffix = "",
}: {
  target: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(target);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Someone who asked for less motion gets the number, not a tally.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    // Already visible: animating would mean rewinding a number the visitor
    // can see. Leave it.
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight && box.bottom > 0) return;

    setCount(0);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;
        const duration = 2000;
        const steps = 60;
        const increment = target / steps;
        let current = 0;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) {
            setCount(target);
            clearInterval(timer);
          } else {
            setCount(Math.floor(current));
          }
        }, duration / steps);
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { track, type FunnelProps } from "@/lib/analytics/track";
import { workerSignupHref } from "@/lib/campaigns/attribution";
import type { SeasonAnswers } from "@/lib/campaigns/season-quiz";
import { useSignupContext } from "@/lib/campaigns/signup-context-store";

/**
 * The tracked links shared by the campaign header, the page's sections and the
 * quiz. Every signup link carries the visitor's UTMs and quiz answers (see
 * lib/campaigns/attribution.ts); every click raises its funnel event.
 */

export const QUIZ_SECTION_ID = "find-my-season";

/** Analytics properties for a set of answers — known values only, never free text. */
export function answerProps(answers: Partial<SeasonAnswers> | undefined): FunnelProps {
  return {
    destination: answers?.destination,
    season: answers?.season,
    work_type: answers?.workType,
  };
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let quizStarted = false;

/** find_my_season_started fires once per visit, whichever way the visitor starts. */
export function markQuizStarted(placement: string): void {
  if (quizStarted) return;
  quizStarted = true;
  track("find_my_season_started", { placement });
}

interface TrackedLinkProps {
  /** Which button this is, for analytics: "header", "hero", "result", "final"… */
  placement: string;
  className?: string;
  children: ReactNode;
}

export function SignupLink({ placement, className, children }: TrackedLinkProps) {
  const ctx = useSignupContext();
  return (
    <Link
      href={workerSignupHref(ctx)}
      className={className}
      onClick={() => track("worker_signup_clicked", { ...answerProps(ctx?.answers), placement })}
    >
      {children}
    </Link>
  );
}

export function BrowseJobsLink({
  placement,
  className,
  children,
  href = "/jobs",
}: TrackedLinkProps & { href?: string }) {
  const ctx = useSignupContext();
  return (
    <Link
      href={href}
      className={className}
      onClick={() => track("browse_jobs_clicked", { ...answerProps(ctx?.answers), placement })}
    >
      {children}
    </Link>
  );
}

/**
 * Takes the visitor to the quiz. A real in-page link, so it still works before
 * JavaScript loads; once hydrated it scrolls (instantly, under reduced motion)
 * and moves keyboard focus to the question itself rather than leaving it on a
 * button that has scrolled out of view.
 */
export function FindMySeasonButton({ placement, className, children }: TrackedLinkProps) {
  return (
    <a
      href={`#${QUIZ_SECTION_ID}`}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        markQuizStarted(placement);
        const section = document.getElementById(QUIZ_SECTION_ID);
        if (!section) return;
        section.scrollIntoView({ behavior: prefersReducedMotion() ? "instant" : "smooth", block: "start" });
        section.querySelector<HTMLElement>("[data-quiz-heading]")?.focus({ preventScroll: true });
      }}
    >
      {children}
    </a>
  );
}

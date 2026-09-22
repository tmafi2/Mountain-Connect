"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type Ref } from "react";
import { track, type FunnelEvent } from "@/lib/analytics/track";
import { workerSignupHref } from "@/lib/campaigns/attribution";
import {
  QUIZ_STEPS,
  browseJobsHref,
  optionsForStep,
  resultCopy,
  type QuizOption,
  type SeasonAnswers,
  type WorkType,
} from "@/lib/campaigns/season-quiz";
import { setSeasonAnswers, useSignupContext } from "@/lib/campaigns/signup-context-store";
import { BTN_GHOST, BTN_PRIMARY_XL } from "../buttons";
import { QUIZ_SECTION_ID, answerProps, markQuizStarted, prefersReducedMotion } from "../CampaignLinks";
import { RESULT } from "./content";

/**
 * Find My Season: hemisphere, then country, then what work — one question per
 * screen, then a result that repeats the answers back and asks for the signup.
 *
 * The first two questions move straight on when you choose — no Continue
 * button to find — after a beat long enough to see the choice land. The last
 * one takes more than one answer, so it cannot: it needs a Continue, and that
 * is the only screen with one.
 */

/** The answer that means "no preference", so it cannot sit beside a
 *  preference: choosing it clears the rest, and choosing anything else
 *  clears it. */
const NO_PREFERENCE: WorkType = "anything";

const STEP_EVENTS: Record<keyof SeasonAnswers, FunnelEvent> = {
  destination: "destination_selected",
  season: "season_selected",
  workTypes: "work_type_selected",
};

const ADVANCE_DELAY_MS = 260;
const RESULT_STEP = QUIZ_STEPS.length;

/** Whole class strings, so Tailwind's scanner can see them. */
const ENTER = {
  next: "motion-safe:animate-[stepInNext_320ms_cubic-bezier(0.16,1,0.3,1)]",
  back: "motion-safe:animate-[stepInBack_320ms_cubic-bezier(0.16,1,0.3,1)]",
} as const;
type Direction = keyof typeof ENTER;

/**
 * Grid columns by option count. Three options stack one per row on phones —
 * equal widths, each label on one line — and become three equal tiles from md
 * up, where the longer desktop labels have room. Six sit in a 2- then 3-wide
 * grid. Whole class strings, again, for Tailwind's scanner.
 */
function gridColumns(count: number): string {
  if (count === 3) return "grid-cols-1 md:grid-cols-3";
  return count > 4 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2";
}

export default function SeasonQuiz({ countriesWithJobs }: { countriesWithJobs: string[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<SeasonAnswers>>({});
  const [direction, setDirection] = useState<Direction>("next");
  const [pending, setPending] = useState<string | null>(null);
  const ctx = useSignupContext();
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const navigated = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  // After each step change — never on first render — put the new question in
  // view if the visitor had scrolled past its top, and move focus onto it so
  // keyboard and screen-reader users land on the question they now face.
  useEffect(() => {
    if (!navigated.current) return;
    const section = sectionRef.current;
    if (section && section.getBoundingClientRect().top < -24) {
      section.scrollIntoView({ behavior: prefersReducedMotion() ? "instant" : "smooth", block: "start" });
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  function goTo(nextStep: number, dir: Direction) {
    navigated.current = true;
    setDirection(dir);
    setStep(nextStep);
  }

  /** Going back mid-advance must cancel the advance, or it lands a step ahead. */
  function goBack(nextStep: number) {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    setPending(null);
    goTo(nextStep, "back");
  }

  function choose(key: keyof SeasonAnswers, value: string) {
    // A double tap must not answer the next question too.
    if (pending !== null) return;
    markQuizStarted("quiz");
    const next = { ...answers, [key]: value } as Partial<SeasonAnswers>;
    setAnswers(next);
    setPending(value);
    track(STEP_EVENTS[key], answerProps(next));

    timer.current = window.setTimeout(() => {
      timer.current = null;
      setPending(null);
      if (step < RESULT_STEP - 1) {
        goTo(step + 1, "next");
        return;
      }
      const complete = next as SeasonAnswers;
      setSeasonAnswers(complete);
      track("find_my_season_completed", answerProps(complete));
      goTo(RESULT_STEP, "next");
    }, ADVANCE_DELAY_MS);
  }

  /** Question 3 only: tapping an option adds or removes it, nothing advances. */
  function toggleWorkType(value: WorkType) {
    markQuizStarted("quiz");
    setAnswers((prev) => {
      const chosen = prev.workTypes ?? [];
      let next: WorkType[];
      if (value === NO_PREFERENCE) {
        next = chosen.includes(value) ? [] : [value];
      } else {
        const without = chosen.filter((v) => v !== value && v !== NO_PREFERENCE);
        next = chosen.includes(value) ? without : [...without, value];
      }
      return { ...prev, workTypes: next };
    });
  }

  /**
   * Finishing question 3. The step event fires here rather than on each tap:
   * selecting and deselecting four options should be one answer in the
   * funnel, not eight.
   */
  function finishWorkTypes() {
    const chosen = answers.workTypes ?? [];
    if (chosen.length === 0) return;
    const finished = { ...answers, workTypes: chosen } as SeasonAnswers;
    track(STEP_EVENTS.workTypes, answerProps(finished));
    setSeasonAnswers(finished);
    track("find_my_season_completed", answerProps(finished));
    goTo(RESULT_STEP, "next");
  }

  const complete = step === RESULT_STEP ? (answers as SeasonAnswers) : null;
  const current = complete ? null : QUIZ_STEPS[step];
  const chosenWorkTypes = answers.workTypes ?? [];
  // Question 2 shows only the countries in the hemisphere chosen in question 1.
  const options = current ? optionsForStep(current, answers) : [];

  return (
    // The quiz fills the viewport so nothing of the next section shows beneath
    // it. A sliver of the story section used to peek in on both desktop and
    // phone, which reads as "scroll past this" at exactly the moment we are
    // asking someone to answer a question.
    //
    // 100dvh, not 100vh: on a phone, vh is the viewport with the browser
    // chrome HIDDEN, so a vh-tall section is taller than what you can actually
    // see and the next section peeks in anyway. dvh tracks the visible area,
    // which is the whole point here — and it matters most in the Instagram
    // in-app browser, where the chrome never collapses. A browser too old for
    // dvh drops the declaration and falls back to the rem min-heights below,
    // which is exactly today's layout.
    //
    // min-height, never height: the result screen is taller than a question,
    // and a short viewport (small phone, or landscape) must be able to scroll
    // rather than clip the options.
    <section
      id={QUIZ_SECTION_ID}
      ref={sectionRef}
      aria-label="Find my season"
      className="flex min-h-[100dvh] flex-col justify-center bg-primary"
    >
      <div className="mx-auto w-full min-h-[31rem] max-w-3xl px-4 pb-16 pt-8 sm:min-h-[36rem] sm:px-6 sm:pb-24 sm:pt-14">
        {complete ? (
          <QuizResult
            answers={complete}
            signupHref={workerSignupHref(ctx)}
            browseHref={browseJobsHref(complete.destination, countriesWithJobs)}
            headingRef={headingRef}
            onChangeAnswers={() => goBack(0)}
          />
        ) : current ? (
          <div key={step} className={ENTER[direction]}>
            <QuizProgress
              step={step}
              total={QUIZ_STEPS.length}
              onBack={step > 0 ? () => goBack(step - 1) : undefined}
            />
            <h2
              id="quiz-question"
              ref={headingRef}
              tabIndex={-1}
              data-quiz-heading
              className="mt-6 text-balance font-display text-[clamp(2.6rem,11.5vw,4.75rem)] uppercase leading-[0.9] text-white outline-none"
            >
              {current.question}
            </h2>
            <div
              role="group"
              aria-labelledby="quiz-question"
              className={`mt-6 grid gap-2.5 sm:gap-3 ${gridColumns(options.length)}`}
            >
              {options.map((option) => (
                <QuizOptionButton
                  key={option.value}
                  option={option}
                  tile={options.length === 3}
                  multi={current.multi}
                  selected={
                    current.multi
                      ? chosenWorkTypes.includes(option.value as WorkType)
                      : (pending ?? answers[current.key]) === option.value
                  }
                  onSelect={() =>
                    current.multi
                      ? toggleWorkType(option.value as WorkType)
                      : choose(current.key, option.value)
                  }
                />
              ))}
            </div>

            {/* Only the multi-select question has a Continue: the other two
                advance on tap, and giving them a button nobody needs is how a
                three-tap quiz becomes a six-tap one. */}
            {current.multi ? (
              <div className="mt-6 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={finishWorkTypes}
                  disabled={chosenWorkTypes.length === 0}
                  className={`${BTN_PRIMARY_XL} w-full disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:w-auto`}
                >
                  Continue
                </button>
                <p aria-live="polite" className="min-h-5 text-sm text-white/70">
                  {chosenWorkTypes.length === 0
                    ? "Pick at least one."
                    : `${chosenWorkTypes.length} selected`}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function QuizProgress({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) {
  return (
    <div>
      <div className="flex min-h-11 items-center justify-between gap-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-white/85 transition hover:text-white focus-visible:outline-2 focus-visible:outline-highlight"
          >
            <ChevronLeft />
            Back
          </button>
        ) : (
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-highlight">Find my season</p>
        )}
        <p className="text-sm font-semibold tabular-nums text-white/85">
          <span className="sr-only">Question </span>
          {step + 1} of {total}
        </p>
      </div>
      {/* The "1 of 3" text above is the progress; these bars only echo it. */}
      <div aria-hidden="true" className="mt-2 grid grid-cols-3 gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-highlight" : "bg-white/15"}`}
          />
        ))}
      </div>
    </div>
  );
}

function QuizOptionButton({
  option,
  selected,
  tile,
  multi,
  onSelect,
}: {
  option: QuizOption;
  selected: boolean;
  /** One of three equal tiles: from md up, the emoji sits above the label. */
  tile: boolean;
  /** On the multi-select question, a tick makes it visible that choosing one
   *  option does not un-choose the last — the colour change alone reads the
   *  same as the single-select questions before it. */
  multi?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`relative flex min-h-[4.5rem] w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-[15px] font-bold leading-snug transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-highlight motion-safe:active:scale-[0.97] sm:min-h-20 sm:text-base ${
        tile ? "md:min-h-32 md:flex-col md:items-start md:gap-4 md:py-5" : ""
      } ${
        selected
          ? "border-highlight bg-highlight text-primary motion-safe:scale-[1.03]"
          : "border-white/15 bg-white/[0.06] text-white hover:border-white/40 hover:bg-white/[0.11]"
      }`}
    >
      {option.emoji ? (
        // nowrap: a row of flags never splits across lines or strands one.
        // In a stacked list the flag groups differ in width (three, two, one),
        // so they get a fixed column and the labels line up for scanning.
        <span
          aria-hidden="true"
          className={`shrink-0 whitespace-nowrap text-[1.6rem] leading-none ${tile ? "min-w-[5.5rem] md:min-w-0" : ""}`}
        >
          {option.emoji}
        </span>
      ) : null}
      {multi ? (
        <span
          aria-hidden="true"
          className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded border text-[11px] font-black ${
            selected ? "border-primary/40 bg-primary/15 text-primary" : "border-white/30 text-transparent"
          }`}
        >
          ✓
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        {option.shortLabel ? (
          <>
            {/* display:none takes the hidden one out of the accessibility
                tree too, so a screen reader hears only the visible label. */}
            <span className="sm:hidden">{option.shortLabel}</span>
            <span className="hidden sm:inline">{option.label}</span>
          </>
        ) : (
          option.label
        )}
      </span>
      {/* Always rendered, only shown when selected, so choosing never reflows the label. */}
      <Check
        className={`h-5 w-5 shrink-0 transition-opacity ${tile ? "md:absolute md:right-4 md:top-4" : ""} ${
          selected ? "opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
}

function QuizResult({
  answers,
  signupHref,
  browseHref,
  headingRef,
  onChangeAnswers,
}: {
  answers: SeasonAnswers;
  signupHref: string;
  browseHref: string;
  headingRef: Ref<HTMLHeadingElement>;
  onChangeAnswers: () => void;
}) {
  const copy = resultCopy(answers);
  const props = answerProps(answers);

  return (
    <div className={ENTER.next}>
      <div className="flex min-h-11 items-center justify-between gap-4">
        <button
          type="button"
          onClick={onChangeAnswers}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-white/85 transition hover:text-white focus-visible:outline-2 focus-visible:outline-highlight"
        >
          <ChevronLeft />
          {RESULT.changeAnswers}
        </button>
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-highlight">Your season</p>
      </div>

      <h2
        ref={headingRef}
        tabIndex={-1}
        data-quiz-heading
        className="mt-4 text-balance font-display text-[clamp(3.25rem,14.5vw,7rem)] uppercase leading-[0.88] text-white outline-none"
      >
        {copy.heading}{" "}
        <span aria-hidden="true" className="whitespace-nowrap align-[0.1em] text-[0.6em]">
          {copy.emoji}
        </span>
      </h2>
      <p className="mt-3 max-w-xl text-lg font-medium leading-snug text-white/90">{copy.summary}</p>

      <div className="mt-6 border-t border-white/15 pt-6">
        <h3 className="text-xl font-extrabold tracking-tight text-white sm:text-2xl">{RESULT.subheading}</h3>
        <p className="mt-1.5 max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-base">{RESULT.body}</p>
        <ul className="mt-4 space-y-2">
          {RESULT.benefits.map((benefit) => (
            <li key={benefit} className="flex items-center gap-3 text-[15px] font-semibold text-white sm:text-base">
              <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-highlight text-primary">
                <Check className="h-3.5 w-3.5" />
              </span>
              {benefit}
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={signupHref}
            onClick={() => track("worker_signup_clicked", { ...props, placement: "result" })}
            className={`${BTN_PRIMARY_XL} w-full sm:w-auto`}
          >
            {RESULT.primaryCta}
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0l-6-6m6 6l-6 6" />
            </svg>
          </Link>
          <Link
            href={browseHref}
            onClick={() => track("browse_jobs_clicked", { ...props, placement: "result" })}
            className={`${BTN_GHOST} w-full sm:w-auto`}
          >
            {RESULT.secondaryCta}
          </Link>
        </div>
      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  );
}

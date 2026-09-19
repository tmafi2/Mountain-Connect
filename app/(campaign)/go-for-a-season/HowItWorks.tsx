import { HOW_IT_WORKS } from "./content";

/** Three steps, kept short: this is a reassurance, not a feature tour. */
export default function HowItWorks() {
  return (
    <section aria-labelledby="gfas-how-heading" className="bg-background py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2
          id="gfas-how-heading"
          className="text-balance font-display text-[clamp(3rem,12vw,6rem)] uppercase leading-[0.88] text-primary"
        >
          {HOW_IT_WORKS.heading}
        </h2>
        <ol className="mt-10 grid gap-9 sm:mt-14 md:grid-cols-3 md:gap-10">
          {HOW_IT_WORKS.steps.map((step, i) => (
            <li key={step.title} className="border-t-2 border-primary pt-5">
              {/* The <ol> already numbers the steps for screen readers. */}
              <span aria-hidden="true" className="font-display text-6xl leading-none text-secondary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 text-xl font-extrabold tracking-tight text-primary">{step.title}</h3>
              <p className="mt-1.5 max-w-sm text-base leading-relaxed text-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

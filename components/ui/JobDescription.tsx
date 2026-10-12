"use client";

import { useState } from "react";

/** Readable name for the codes the extractor actually produces. */
const LANGUAGES: Record<string, string> = {
  it: "Italian", ja: "Japanese", fr: "French", de: "German", es: "Spanish",
  pt: "Portuguese", zh: "Chinese", ko: "Korean", ru: "Russian", nl: "Dutch",
  pl: "Polish", ro: "Romanian", cs: "Czech", sk: "Slovak", hu: "Hungarian",
  sv: "Swedish", no: "Norwegian", da: "Danish", fi: "Finnish", tr: "Turkish",
  ca: "Catalan", sl: "Slovenian", hr: "Croatian", bg: "Bulgarian", el: "Greek",
  uk: "Ukrainian", lt: "Lithuanian", lv: "Latvian", et: "Estonian",
};

/**
 * The advert, with a translation available when one exists.
 *
 * ⚠️ THE ORIGINAL IS THE DEFAULT AND IS ALWAYS ONE TAP AWAY. This is a machine
 * translation and it says so, because the terms a worker acts on — pay, hours,
 * notice, what the accommodation costs — are exactly the ones a translation
 * can get subtly wrong. The scams guide tells people to get terms in writing
 * from the employer; a silent translation would quietly undercut that.
 */
export default function JobDescription({
  description,
  translation,
  language,
}: {
  description: string;
  translation: string | null;
  language: string | null;
}) {
  const [showTranslation, setShowTranslation] = useState(false);

  // No translation, or the post was already English — render it plainly.
  if (!translation || !translation.trim()) {
    return (
      <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/75">
        {description}
      </div>
    );
  }

  const name = language ? LANGUAGES[language.toLowerCase()] ?? null : null;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-accent/60 p-0.5" role="group">
          <button
            type="button"
            onClick={() => setShowTranslation(false)}
            aria-pressed={!showTranslation}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              !showTranslation ? "bg-primary text-white" : "text-primary/70 hover:text-primary"
            }`}
          >
            {name ? `Original (${name})` : "Original"}
          </button>
          <button
            type="button"
            onClick={() => setShowTranslation(true)}
            aria-pressed={showTranslation}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
              showTranslation ? "bg-primary text-white" : "text-primary/70 hover:text-primary"
            }`}
          >
            English
          </button>
        </div>
        {showTranslation && (
          <span className="text-xs text-foreground/50">
            Machine translated — check the original before you rely on a figure or a date.
          </span>
        )}
      </div>

      <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/75">
        {showTranslation ? translation : description}
      </div>
    </div>
  );
}

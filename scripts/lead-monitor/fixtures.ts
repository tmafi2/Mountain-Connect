/**
 * scripts/lead-monitor/fixtures.ts
 *
 * Shared fixtures for dedup-key.test.ts. Every case here is run through
 * BOTH implementations (dedup-key.ts and dedup-key.browser.js) and asserted
 * equal, so this file is the contract between the two twins.
 *
 * Add a fixture whenever you find an input class that could plausibly
 * diverge between a Node runtime and a page context.
 *
 * CONVENTION: invisible characters are written as \u escapes, never as
 * literals. A literal NBSP or zero-width space is indistinguishable from a
 * normal space on screen, and an editor, formatter or copy-paste can
 * silently rewrite it — quietly gutting the assertion it was added to make.
 */

/** A single (group, poster, text) triple to hash. */
export type Fixture = {
  readonly name: string;
  readonly group: string;
  readonly poster: string;
  readonly text: string;
};

/**
 * Cases that must all collapse to ONE key — the normalisation contract.
 * Whitespace runs, leading/trailing space, case, and everything past code
 * point 120 of the post text are all supposed to be invisible to the key.
 */
export type CollapseGroup = {
  readonly name: string;
  readonly why: string;
  readonly variants: readonly Fixture[];
};

// --- invisible characters, spelled out -------------------------------------

/** U+00A0 no-break space. Matched by \s, so it collapses. */
const NBSP = "\u00a0";
/** U+3000 ideographic space, common in Japanese posts. Matched by \s. */
const IDEOGRAPHIC_SPACE = "\u3000";
/** U+200B zero-width space. NOT matched by \s — must survive normalisation. */
const ZWSP = "\u200b";
/** U+0301 combining acute accent. */
const COMBINING_ACUTE = "\u0301";
/** U+200D zero-width joiner, the glue inside multi-person/profession emoji. */
const ZWJ = "\u200d";

/** "é" decomposed: plain e followed by a combining acute accent. */
const E_ACUTE_DECOMPOSED = `e${COMBINING_ACUTE}`;

/** "Chloé Gagné" with precomposed U+00E9 — one code point per accented letter. */
const PRECOMPOSED_NAME = "Chloé Gagné";
/** The same name, same glyphs, different bytes: two code points per accent. */
const DECOMPOSED_NAME = `Chlo${E_ACUTE_DECOMPOSED} Gagn${E_ACUTE_DECOMPOSED}`;

// --- reusable text ---------------------------------------------------------

const REAL_POST =
  "Looking for seasonal work in Whistler from November — lift ops or hospitality, happy to do split shifts.";

/** 120 code points exactly, so the next code point is the first one dropped. */
const AT_LIMIT = "a".repeat(120);
/** 119 code points, leaving room for exactly one more code point. */
const ONE_UNDER_LIMIT = "a".repeat(119);

/** Skis, U+1F3BF — a single code point stored as a surrogate pair. */
const SKI = "\u{1f3bf}";
/** Snowboarder, U+1F3C2 — likewise. */
const SNOWBOARDER = "\u{1f3c2}";

export const FIXTURES: readonly Fixture[] = [
  {
    name: "plain ascii",
    group: "Whistler Ski Season Jobs 2026",
    poster: "Alex Rivera",
    text: REAL_POST,
  },
  {
    name: "japanese (3-byte utf-8)",
    group: "白馬村 バイト情報",
    poster: "田中 ゆき",
    text: "ニセコで冬の間の仕事を探しています。英語と日本語が話せます。経験は3シーズンあります。",
  },
  {
    name: "japanese with ideographic spaces",
    group: `ニセコ${IDEOGRAPHIC_SPACE}求人`,
    poster: `佐藤${IDEOGRAPHIC_SPACE}健`,
    text: `12月から3月まで働けます。${IDEOGRAPHIC_SPACE}スキー場での経験あり。`,
  },
  {
    name: "japanese full-width digits",
    group: "野沢温泉 求人",
    poster: "山田",
    text: "１２月から３月まで、リフト係を希望します。",
  },
  {
    name: "accented latin (precomposed)",
    group: "Emplois Station Mont-Tremblant",
    poster: PRECOMPOSED_NAME,
    text: "Je cherche un emploi saisonnier à Tremblant — expérience en café, bilingue français/anglais.",
  },
  {
    name: "accented latin (decomposed: e + combining acute)",
    group: "Emplois Station Mont-Tremblant",
    poster: DECOMPOSED_NAME,
    text: "Je cherche un emploi saisonnier à Tremblant.",
  },
  {
    name: "emoji (4-byte utf-8, surrogate pairs)",
    group: `Niseko Winter Work ${SKI}`,
    poster: `Sam ${SKI}`,
    text: `Available from Dec 1 ${SKI} looking for lift ops or ski patrol ${SNOWBOARDER} DM me!`,
  },
  {
    name: "emoji zwj sequence",
    group: "Banff Jobs",
    poster: `Jo \u{1f469}${ZWJ}\u{1f373}`,
    text: `Chef de partie available — 4 seasons experience \u{1f1e8}\u{1f1e6}`,
  },
  {
    name: "all components empty",
    group: "",
    poster: "",
    text: "",
  },
  {
    name: "empty poster and text, group present",
    group: "Thredbo Job Guide",
    poster: "",
    text: "",
  },
  {
    name: "whitespace-only components",
    group: "   ",
    poster: "\t\n",
    text: ` ${IDEOGRAPHIC_SPACE}${NBSP} `,
  },
  {
    name: "text well over 120 code points",
    group: "Hakuba Seasonal Work",
    poster: "Marcus Bell",
    text: REAL_POST.repeat(4),
  },
  {
    name: "emoji sitting exactly on the 120 boundary",
    group: "g",
    poster: "p",
    text: `${ONE_UNDER_LIMIT}${SKI}`,
  },
  {
    name: "emoji sitting one past the 120 boundary",
    group: "g",
    poster: "p",
    text: `${AT_LIMIT}${SKI}`,
  },
  {
    name: "separator character inside components",
    group: "Jobs | Jindabyne",
    poster: "A|B",
    text: "pipe | in | text",
  },
  {
    name: "lone high surrogate",
    group: "g",
    poster: "p",
    text: "broken \ud83c end",
  },
  {
    name: "lone low surrogate",
    group: "g",
    poster: "p",
    text: "broken \udfbf end",
  },
  {
    name: "surrogates in reverse order",
    group: "g",
    poster: "p",
    text: "\udfbf\ud83c",
  },
  {
    name: "zero-width space is NOT whitespace to \\s",
    group: "g",
    poster: "p",
    text: `zero${ZWSP}width`,
  },
  {
    name: "cyrillic",
    group: "Работа Красная Поляна",
    poster: "Ирина Петрова",
    text: "Ищу сезонную работу инструктором по сноуборду.",
  },
  {
    name: "turkish dotted i (locale trap)",
    group: "İSTANBUL KAYAK İŞ",
    poster: "IŞIL",
    text: "KIŞ SEZONU İÇİN İŞ ARIYORUM",
  },
];

export const COLLAPSE_GROUPS: readonly CollapseGroup[] = [
  {
    name: "whitespace and case noise",
    why: "collapse runs, trim, lowercase — the same post copied with sloppy spacing must not create a second lead",
    variants: [
      {
        name: "canonical",
        group: "Whistler Ski Season Jobs 2026",
        poster: "Alex Rivera",
        text: REAL_POST,
      },
      {
        name: "shouting",
        group: "WHISTLER SKI SEASON JOBS 2026",
        poster: "ALEX RIVERA",
        text: REAL_POST.toUpperCase(),
      },
      {
        name: "padded and double-spaced",
        group: "  Whistler   Ski Season Jobs 2026  ",
        poster: "\tAlex  Rivera\n",
        text: `  ${REAL_POST.replace(/ /g, "  ")}  `,
      },
      {
        name: "newlines and tabs instead of spaces",
        group: "Whistler\nSki\tSeason Jobs 2026",
        poster: "Alex\n\nRivera",
        text: REAL_POST.replace(/ /g, "\n"),
      },
      {
        name: "nbsp instead of spaces",
        group: `Whistler${NBSP}Ski Season Jobs 2026`,
        poster: `Alex${NBSP}Rivera`,
        text: REAL_POST.replace(/ /g, NBSP),
      },
      {
        name: "ideographic space instead of spaces",
        group: `Whistler${IDEOGRAPHIC_SPACE}Ski Season Jobs 2026`,
        poster: `Alex${IDEOGRAPHIC_SPACE}Rivera`,
        text: REAL_POST.replace(/ /g, IDEOGRAPHIC_SPACE),
      },
    ],
  },
  {
    name: "everything past code point 120 is invisible",
    why: "proves truncation actually happens — a post edited only in its tail must not create a second lead",
    variants: [
      { name: "bare 120", group: "g", poster: "p", text: AT_LIMIT },
      {
        name: "120 + emoji",
        group: "g",
        poster: "p",
        text: `${AT_LIMIT}${SKI}`,
      },
      {
        name: "120 + long ascii tail",
        group: "g",
        poster: "p",
        text: `${AT_LIMIT} snowboard instructor available from December, references on request`,
      },
      {
        name: "120 + japanese tail",
        group: "g",
        poster: "p",
        text: `${AT_LIMIT}ニセコで働きたいです`,
      },
      {
        name: "120 + trailing whitespace tail",
        group: "g",
        poster: "p",
        text: `${AT_LIMIT}     \n\t`,
      },
    ],
  },
  {
    name: "null and undefined behave as empty string",
    why: "the collector emits absent fields as undefined; they must not produce a different key from an empty string",
    variants: [
      { name: "empty strings", group: "", poster: "", text: "" },
      // Cast through unknown: the collector is plain JS and will hand us
      // these, so the key has to be stable for them.
      {
        name: "nulls",
        group: null as unknown as string,
        poster: null as unknown as string,
        text: null as unknown as string,
      },
      {
        name: "undefineds",
        group: undefined as unknown as string,
        poster: undefined as unknown as string,
        text: undefined as unknown as string,
      },
    ],
  },
];

/**
 * Cases that must NOT collide — all keys in this list are asserted unique.
 * Mostly guards against over-eager normalisation: if someone "improves" the
 * normaliser by stripping punctuation or NFC-folding, these catch it.
 */
export const DISTINCT_FIXTURES: readonly Fixture[] = [
  {
    name: "emoji preserved at the boundary (skis)",
    group: "g",
    poster: "p",
    text: `${ONE_UNDER_LIMIT}${SKI}`,
  },
  {
    name: "different emoji at the same boundary (snowboarder)",
    group: "g",
    poster: "p",
    text: `${ONE_UNDER_LIMIT}${SNOWBOARDER}`,
  },
  {
    name: "precomposed accent",
    group: "g",
    poster: PRECOMPOSED_NAME,
    text: "bonjour",
  },
  {
    name: "decomposed accent (we deliberately do NOT unicode-normalise)",
    group: "g",
    poster: DECOMPOSED_NAME,
    text: "bonjour",
  },
  {
    name: "zero-width space survives",
    group: "g",
    poster: "p",
    text: `zero${ZWSP}width`,
  },
  {
    name: "no zero-width space",
    group: "g",
    poster: "p",
    text: "zerowidth",
  },
  {
    name: "component boundary shift A",
    group: "ab",
    poster: "c",
    text: "d",
  },
  {
    name: "component boundary shift B",
    group: "a",
    poster: "bc",
    text: "d",
  },
];

/**
 * Canonical FNV-1a 64-bit test vectors from the reference implementation
 * (http://www.isthe.com/chongo/tech/comp/fnv/). These prove the hash
 * primitive itself is a genuine FNV-1a and not merely self-consistent — if
 * only the pinned keys below existed, a subtly wrong hash (FNV-1 instead of
 * 1a, say, or a bad prime) would still pass every test.
 */
export const FNV_VECTORS: readonly { readonly input: string; readonly hex: string }[] =
  [
    { input: "", hex: "cbf29ce484222325" },
    { input: "a", hex: "af63dc4c8601ec8c" },
    { input: "b", hex: "af63df4c8601f1a5" },
    { input: "c", hex: "af63de4c8601eff2" },
    { input: "foobar", hex: "85944171f73967e8" },
  ];

/**
 * PINNED KEYS — the regression tripwire.
 *
 * Real keys produced by the current algorithm. If a change to normalisation,
 * truncation, encoding or the hash alters them, this test fails loudly,
 * because the consequence in production is silent and expensive: every
 * existing lead_posts row is orphaned, no incoming post ever matches an
 * existing key again, and the entire table re-inserts as duplicate leads.
 *
 * Do NOT update these values to make a failing test pass. If the algorithm
 * genuinely has to change, that is a data migration: recompute dedup_key for
 * every existing row in the same transaction that ships the new code.
 *
 * One ASCII case and one Japanese case, so both the 1-byte and 3-byte UTF-8
 * paths are pinned.
 */
export const PINNED_KEYS: readonly {
  readonly name: string;
  readonly fixture: Fixture;
  readonly key: string;
}[] = [
  {
    name: "ascii lead post",
    fixture: {
      name: "pinned ascii",
      group: "Whistler Ski Season Jobs 2026",
      poster: "Alex Rivera",
      text: REAL_POST,
    },
    key: "ac17dacc033c8e5d",
  },
  {
    name: "japanese lead post",
    fixture: {
      name: "pinned japanese",
      group: "白馬村 バイト情報",
      poster: "田中 ゆき",
      text: "ニセコで冬の間の仕事を探しています。英語と日本語が話せます。",
    },
    key: "24b06665033eb38d",
  },
];

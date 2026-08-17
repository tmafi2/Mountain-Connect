/**
 * scripts/fb-monitor/schema.ts
 *
 * The extraction contract: what Claude is asked to pull out of a community-group
 * post, as a JSON Schema enforced by the Messages API's structured outputs.
 *
 * The enums below are COPIED FROM the admin import form
 * (app/(admin)/admin/import-listing/page.tsx) on purpose — a category Claude
 * invents is a category the form can't display and the job filters can't match.
 * If that form's lists change, change these too.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE ARE TWO SHAPES IN THIS FILE
 *
 * Structured outputs allow at most **16 union-typed parameters** per schema
 * (anything with `anyOf` or a `type` array — so every nullable field). A first
 * pass that made all 17 optional fields nullable was rejected outright:
 *
 *   400 invalid_request_error — "Schemas contains too many parameters with
 *   union types (17 …). Reduce the number of nullable or union-typed
 *   parameters (limit: 16 …)"
 *
 * So the wire shape avoids unions wherever something cheaper expresses
 * "the post didn't say":
 *
 *   - strings        -> "" (empty string)
 *   - closed sets    -> a NOT_STATED member on the enum
 *   - tri-state bool -> "yes" | "no" | "NOT_STATED"
 *   - numbers, dates -> genuinely nullable (4 unions total, well under the cap)
 *
 * Numbers and dates keep their unions deliberately: a sentinel 0 for pay or a
 * sentinel date is the kind of thing that silently becomes real data later,
 * whereas "" for a missing business name cannot be mistaken for a name.
 *
 * `normaliseExtraction()` converts the wire shape to the domain shape — where
 * absent really is `null` — immediately after parsing, so nothing downstream
 * has to know any of this.
 * ---------------------------------------------------------------------------
 *
 * Other structured-output limits worth knowing before editing: every object
 * needs `additionalProperties: false`; numeric and string constraints
 * (`minimum`, `maxLength`, …) are not supported; recursive schemas are not
 * supported. `enum`, `const`, `anyOf` and `$ref` are.
 */

/** Wire sentinel for "the post did not say". Never reaches the domain shape. */
export const NOT_STATED = "NOT_STATED";

// --- enums (mirror the admin form, plus a NOT_STATED member) ----------------

export const CLASSIFICATIONS = ["hiring", "seeking_work", "other"] as const;

export const JOB_CATEGORIES = [
  "Ski Instruction",
  "Hospitality",
  "Food & Beverage",
  "Retail",
  "Resort Operations",
  "Lift Operations",
  "Housekeeping",
  "Maintenance",
  "Administration",
  "Entertainment",
  "Other",
] as const;

export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Casual"] as const;

export const ACCOMMODATION_TYPES = [
  "Staff housing",
  "Shared apartment",
  "Private room",
  "Subsidy/stipend",
  "Not provided",
] as const;

/** Only the currencies the three live northern markets actually post in. */
export const CURRENCIES = ["CAD", "USD", "JPY"] as const;

export const PAY_PERIODS = ["hour", "day", "week", "month", "season", "total"] as const;

export const CONTACT_METHODS = [
  "email",
  "phone",
  "whatsapp",
  "instagram",
  "facebook_dm",
  "apply_link",
  "in_person",
  "none_stated",
] as const;

/**
 * Enum rather than a float: it sorts the approval queue without inviting the
 * model to fabricate precision it does not have.
 */
export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;

/** Tri-state for perks: "not mentioned" is different from "explicitly not offered". */
export const TRI_STATE = ["yes", "no", NOT_STATED] as const;

export type Classification = (typeof CLASSIFICATIONS)[number];
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

// --- domain shape (what the rest of the code sees) -------------------------

export type ExtractedRole = {
  jobTitle: string;
  roleCategory: (typeof JOB_CATEGORIES)[number];
  employmentType: (typeof EMPLOYMENT_TYPES)[number] | null;
  positionsAvailable: number | null;
  payAmount: number | null;
  payCurrency: (typeof CURRENCIES)[number] | null;
  payPeriod: (typeof PAY_PERIODS)[number] | null;
  startDate: string | null;
  endDate: string | null;
  accommodationIncluded: boolean | null;
  accommodationType: (typeof ACCOMMODATION_TYPES)[number] | null;
  skiPassIncluded: boolean | null;
  mealPerks: boolean | null;
  visaSponsorship: string | null;
  requirements: string | null;
};

export type ExtractedPost = {
  classification: Classification;
  confidence: ConfidenceLevel;
  reasoning: string;
  postLanguage: string;
  businessName: string | null;
  contactMethod: (typeof CONTACT_METHODS)[number];
  contactValue: string | null;
  resortName: string | null;
  townName: string | null;
  roles: ExtractedRole[];
};

// --- JSON Schema (the wire shape) -----------------------------------------

type JsonSchema = Record<string, unknown>;

/** The only construct that costs a union slot. Reserved for numbers and dates. */
function nullable(schema: JsonSchema): JsonSchema {
  return { anyOf: [schema, { type: "null" }] };
}

function enumOf(values: readonly string[], description: string): JsonSchema {
  return { type: "string", enum: [...values], description };
}

/** An enum plus NOT_STATED — a closed set that can say "didn't say" for free. */
function optionalEnum(values: readonly string[], description: string): JsonSchema {
  return enumOf(
    [...values, NOT_STATED],
    `${description} Use "${NOT_STATED}" if the post does not say.`,
  );
}

/** A string where "" means the post did not say — free, and unmistakable. */
function optionalString(description: string): JsonSchema {
  return {
    type: "string",
    description: `${description} Use an empty string "" if the post does not say.`,
  };
}

const ROLE_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    jobTitle: {
      type: "string",
      description:
        "The role as a worker would search for it, e.g. 'Lift Operator', 'Chef de Partie'. Not the whole post. Always in English, even for a non-English post.",
    },
    roleCategory: enumOf(
      JOB_CATEGORIES,
      "Closest matching category. Use 'Other' rather than inventing one.",
    ),
    employmentType: optionalEnum(EMPLOYMENT_TYPES, "Employment type."),
    positionsAvailable: nullable({
      type: "integer",
      description: "Count if stated ('need 2 lifties' -> 2). Null if not stated — do NOT assume 1.",
    }),
    payAmount: nullable({
      type: "number",
      description: "Numeric pay if stated. For a range, the LOWER bound. Null if not stated.",
    }),
    payCurrency: optionalEnum(
      CURRENCIES,
      "Currency of payAmount. Infer from the country only when unambiguous.",
    ),
    payPeriod: optionalEnum(PAY_PERIODS, "What payAmount is per."),
    startDate: nullable({
      type: "string",
      format: "date",
      description:
        "ISO date ONLY if the post states a specific calendar date. 'starting December', 'ASAP', 'mid-November' are NOT dates — use null.",
    }),
    endDate: nullable({
      type: "string",
      format: "date",
      description: "Same rule as startDate. Null unless an explicit calendar date is given.",
    }),
    accommodationIncluded: enumOf(
      TRI_STATE,
      `"yes" if accommodation is provided or subsidised, "no" if the post explicitly says it is not, "${NOT_STATED}" if unmentioned.`,
    ),
    accommodationType: optionalEnum(ACCOMMODATION_TYPES, "Only when the post is specific."),
    skiPassIncluded: enumOf(
      TRI_STATE,
      `"yes" if a season or lift pass is offered, "no" if explicitly excluded, "${NOT_STATED}" if unmentioned.`,
    ),
    mealPerks: enumOf(
      TRI_STATE,
      `"yes" if meals, staff food or a meal allowance is offered, "no" if explicitly excluded, "${NOT_STATED}" if unmentioned.`,
    ),
    visaSponsorship: optionalString(
      "Visa programmes named in the post, e.g. 'J-1', 'IEC', 'working holiday'.",
    ),
    requirements: optionalString(
      "Stated requirements — certifications, experience, licences. One short sentence.",
    ),
  },
  required: [
    "jobTitle",
    "roleCategory",
    "employmentType",
    "positionsAvailable",
    "payAmount",
    "payCurrency",
    "payPeriod",
    "startDate",
    "endDate",
    "accommodationIncluded",
    "accommodationType",
    "skiPassIncluded",
    "mealPerks",
    "visaSponsorship",
    "requirements",
  ],
};

export const EXTRACTION_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    classification: enumOf(
      CLASSIFICATIONS,
      "'hiring' = a business or person wants to hire staff. " +
        "'seeking_work' = someone is looking for a job for themselves. " +
        "'other' = anything else (gear sales, accommodation, chat, questions about hiring).",
    ),
    confidence: enumOf(
      CONFIDENCE_LEVELS,
      "Confidence in the classification AND the extracted fields together. " +
        "Use 'low' freely — a low-confidence row still gets reviewed by a human.",
    ),
    reasoning: {
      type: "string",
      description:
        "One short sentence explaining the classification and flagging anything ambiguous.",
    },
    postLanguage: {
      type: "string",
      description: "Dominant language as a lowercase ISO 639-1 code, e.g. 'en', 'ja', 'fr'.",
    },
    businessName: optionalString(
      "The hiring business, in the script the post used. Empty if the post names no business.",
    ),
    contactMethod: enumOf(
      CONTACT_METHODS,
      "How the post says to get in touch. 'none_stated' if it gives no route at all.",
    ),
    contactValue: optionalString(
      "The actual address, number or handle, verbatim. Empty when the method is facebook_dm, in_person or none_stated.",
    ),
    resortName: optionalString(
      "Ski resort named or clearly implied. ALWAYS the common English name — 'Niseko', not 'ニセコ' — because this is matched against an English resort table.",
    ),
    townName: optionalString(
      "Town or village if named, ALWAYS in English — 'Hakuba', not '白馬'.",
    ),
    roles: {
      type: "array",
      description:
        "One entry per DISTINCT role advertised. A post seeking 2 lifties and a chef yields TWO entries " +
        "(positionsAvailable 2 and 1). Empty array when classification is not 'hiring'.",
      items: ROLE_SCHEMA,
    },
  },
  required: [
    "classification",
    "confidence",
    "reasoning",
    "postLanguage",
    "businessName",
    "contactMethod",
    "contactValue",
    "resortName",
    "townName",
    "roles",
  ],
};

/** Union-typed parameter count, so a future edit can't silently breach the cap. */
export const UNION_PARAM_LIMIT = 16;

export function countUnionParams(schema: JsonSchema = EXTRACTION_SCHEMA): number {
  let count = 0;
  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    if (Array.isArray(obj.anyOf) || Array.isArray(obj.type)) count += 1;
    for (const value of Object.values(obj)) {
      if (Array.isArray(value)) value.forEach(walk);
      else walk(value);
    }
  };
  walk(schema);
  return count;
}

// --- wire -> domain --------------------------------------------------------

function fromOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" || trimmed === NOT_STATED ? null : trimmed;
}

function fromOptionalEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  if (typeof value !== "string") return null;
  return (allowed as readonly string[]).includes(value) ? (value as T) : null;
}

function fromTriState(value: unknown): boolean | null {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

/**
 * Convert the model's wire shape into the domain shape. Sentinels become null
 * here and nowhere else, so no downstream code has to know they existed.
 */
export function normaliseExtraction(raw: unknown): ExtractedPost {
  const post = (raw ?? {}) as Record<string, unknown>;
  const rawRoles = Array.isArray(post.roles) ? post.roles : [];

  return {
    classification: post.classification as Classification,
    confidence: post.confidence as ConfidenceLevel,
    reasoning: typeof post.reasoning === "string" ? post.reasoning : "",
    postLanguage: typeof post.postLanguage === "string" ? post.postLanguage : "",
    businessName: fromOptionalString(post.businessName),
    contactMethod: post.contactMethod as ExtractedPost["contactMethod"],
    contactValue: fromOptionalString(post.contactValue),
    resortName: fromOptionalString(post.resortName),
    townName: fromOptionalString(post.townName),
    roles: rawRoles.map((entry): ExtractedRole => {
      const role = (entry ?? {}) as Record<string, unknown>;
      return {
        jobTitle: typeof role.jobTitle === "string" ? role.jobTitle : "",
        roleCategory: role.roleCategory as ExtractedRole["roleCategory"],
        employmentType: fromOptionalEnum(role.employmentType, EMPLOYMENT_TYPES),
        positionsAvailable: typeof role.positionsAvailable === "number" ? role.positionsAvailable : null,
        payAmount: typeof role.payAmount === "number" ? role.payAmount : null,
        payCurrency: fromOptionalEnum(role.payCurrency, CURRENCIES),
        payPeriod: fromOptionalEnum(role.payPeriod, PAY_PERIODS),
        startDate: fromOptionalString(role.startDate),
        endDate: fromOptionalString(role.endDate),
        accommodationIncluded: fromTriState(role.accommodationIncluded),
        accommodationType: fromOptionalEnum(role.accommodationType, ACCOMMODATION_TYPES),
        skiPassIncluded: fromTriState(role.skiPassIncluded),
        mealPerks: fromTriState(role.mealPerks),
        visaSponsorship: fromOptionalString(role.visaSponsorship),
        requirements: fromOptionalString(role.requirements),
      };
    }),
  };
}

// --- validation ------------------------------------------------------------

/**
 * Belt-and-braces check on the normalised output.
 *
 * Structured outputs guarantee the SHAPE, so this is not re-validating types —
 * it catches what a schema cannot express: a date that parses but is absurd, a
 * pay amount of zero, a classification that contradicts the roles. Returns
 * problems rather than throwing, so one odd row never kills a batch.
 */
export function auditExtraction(extracted: ExtractedPost): string[] {
  const problems: string[] = [];

  if (extracted.classification === "hiring" && extracted.roles.length === 0) {
    problems.push("classified as hiring but no roles extracted");
  }
  if (extracted.classification !== "hiring" && extracted.roles.length > 0) {
    problems.push(
      `classified as ${extracted.classification} but ${extracted.roles.length} role(s) extracted`,
    );
  }
  if (extracted.contactValue !== null && extracted.contactMethod === "none_stated") {
    problems.push("contactMethod is none_stated but a contactValue was given");
  }

  extracted.roles.forEach((role, index) => {
    const where = `roles[${index}]`;

    if (role.payAmount !== null && role.payAmount <= 0) {
      problems.push(`${where}: payAmount ${role.payAmount} is not a real wage`);
    }
    if (role.payAmount !== null && role.payCurrency === null) {
      problems.push(`${where}: payAmount without a currency`);
    }
    if (role.positionsAvailable !== null && role.positionsAvailable < 1) {
      problems.push(`${where}: positionsAvailable ${role.positionsAvailable}`);
    }

    for (const field of ["startDate", "endDate"] as const) {
      const value = role[field];
      if (value === null) continue;
      const ms = Date.parse(`${value}T00:00:00Z`);
      if (Number.isNaN(ms)) {
        problems.push(`${where}: ${field} ${JSON.stringify(value)} is not a real date`);
        continue;
      }
      // A seasonal job posted now should not start in 2019 or 2031.
      const year = new Date(ms).getUTCFullYear();
      const thisYear = new Date().getUTCFullYear();
      if (year < thisYear - 1 || year > thisYear + 2) {
        problems.push(`${where}: ${field} ${value} is outside a plausible season`);
      }
    }

    if (
      role.startDate !== null &&
      role.endDate !== null &&
      Date.parse(role.endDate) < Date.parse(role.startDate)
    ) {
      problems.push(`${where}: endDate precedes startDate`);
    }
  });

  return problems;
}

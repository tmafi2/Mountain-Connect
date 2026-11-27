// Continent → Country → (optional state sub-region) → Resorts hierarchy.
//
// ⚠️ MEMBERSHIP IS DERIVED FROM `resorts.ts`. IT USED TO BE HAND-WRITTEN AND
// IT DRIFTED, TWICE. This file listed 105 resorts while `resorts.ts` listed
// 125 — missing 14 Italian resorts (migrations 00116/00119/00120) and 6
// Canadian ones (00103). Every one of them had been added to the database AND
// to `resorts.ts`, and nobody thought to also add them here.
//
// That was not a cosmetic undercount. Four things read this file —
// `components/globe/Globe.tsx`, the `/explore` page, `RegionsDropdown`
// (the site's header navigation) and the employers directory — so those 20
// resorts were absent from the globe, from the explore grid and from the main
// nav. Worse, the globe keys its markers off this file and falls back to
// `region: "other"` for anything it cannot find, and "other" matches no
// country, so clicking Italy showed 3 mountains out of 17 at a moment when
// Italy was the second-biggest country on the job board.
//
// It is the same failure as the four hand-written copies of JOB_CATEGORIES in
// migration 00125: a duplicated list is a list that will disagree with its
// original, and the copy nobody remembers is the one that matters.
//
// ⚠️ SO: TO ADD A RESORT, ADD IT TO `resorts.ts` AND NOTHING ELSE. It appears
// here, on the globe, in the nav and in the explore grid automatically.
//
// What stays curated below is PRESENTATION ONLY — continent order, which
// countries group by state, the order of those state groups, and New
// Zealand's editorial clusters. None of that changes when a resort is added,
// which is exactly why it is safe to hand-maintain and membership was not.

import { resorts } from "./resorts";

export interface ResortEntry {
  id: string;
  name: string;
  /** Optional sub-region for grouping on the explore page. For
   *  Australia we use the actual state. For New Zealand we use the
   *  ski-area cluster (Queenstown / Wanaka / Canterbury / Ruapehu)
   *  rather than the formal admin region — that matches how skiers
   *  actually think about the country. */
  state?: string;
}

export interface CountryEntry {
  name: string;
  resorts: ResortEntry[];
}

export interface ContinentEntry {
  name: string;
  countries: CountryEntry[];
}

/**
 * Continent order is intentional — Australia / New Zealand sits first since
 * this platform's primary audience is southern-hemisphere seasonal workers;
 * Asia, North America, Europe and South America follow.
 */
const CONTINENT_ORDER = [
  "Australia / New Zealand",
  "Asia",
  "North America",
  "Europe",
  "South America",
] as const;

/**
 * Every country in `resorts.ts`. A country missing from here does NOT vanish —
 * it lands in a visible "Other" continent, because a wrong label someone
 * notices beats a silent omission nobody does, which is the whole reason this
 * file was rewritten. `unmappedCountries()` is asserted empty by the test, so
 * it should never reach production.
 */
const COUNTRY_CONTINENT: Record<string, string> = {
  Australia: "Australia / New Zealand",
  "New Zealand": "Australia / New Zealand",
  Japan: "Asia",
  Canada: "North America",
  USA: "North America",
  Andorra: "Europe",
  Austria: "Europe",
  France: "Europe",
  Georgia: "Europe",
  Italy: "Europe",
  Sweden: "Europe",
  Switzerland: "Europe",
  Argentina: "South America",
  Chile: "South America",
};

const UNMAPPED_CONTINENT = "Other";

/**
 * Countries whose resorts are grouped under sub-region headings. Everything
 * else renders as a flat alphabetical list.
 *
 * ⚠️ This is a deliberate choice per country, not derived from whether the
 * data happens to carry a `state_province`. Most of the new Italian resorts
 * do carry one, so deriving it would silently flip Italy from a flat list of
 * 17 into a set of regional headings — a layout change smuggled in by a data
 * import rather than chosen by anyone.
 */
const GROUPED_COUNTRIES = new Set(["Australia", "New Zealand", "Japan", "Canada", "USA"]);

/**
 * The order sub-region headings appear in, which is editorial rather than
 * alphabetical (Australia reads New South Wales → Victoria → Tasmania, and
 * Japan runs roughly north to south). A state not listed here still renders —
 * it sorts alphabetically after the ones that are.
 */
const STATE_ORDER: Record<string, string[]> = {
  Australia: ["New South Wales", "Victoria", "Tasmania"],
  "New Zealand": ["Queenstown", "Wanaka", "Canterbury", "Ruapehu"],
  Japan: ["Hokkaido", "Aomori", "Akita", "Iwate", "Niigata", "Nagano", "Gunma"],
  Canada: ["British Columbia", "Alberta", "Quebec", "Ontario", "Manitoba"],
  USA: ["Wyoming", "Montana", "Idaho", "Utah", "Colorado", "California", "Vermont"],
};

/**
 * Resorts whose displayed sub-region deliberately differs from their
 * `state_province`, keyed by resort id. All seven are New Zealand: a worker
 * looking for a season thinks "Queenstown", not "Otago".
 */
const STATE_OVERRIDES: Record<string, string> = {
  "7": "Queenstown", // The Remarkables — state_province is "Otago"
  "78": "Queenstown", // Coronet Peak — state_province is "Otago"
  "79": "Wanaka", // Cardrona — state_province is "Otago"
  "80": "Wanaka", // Treble Cone — state_province is "Otago"
  "89": "Ruapehu", // Whakapapa — state_province is "Manawatu-Whanganui"
  "90": "Ruapehu", // Tukino — state_province is "Manawatu-Whanganui"
  "91": "Ruapehu", // Turoa — state_province is "Manawatu-Whanganui"
};

/** Countries present in `resorts.ts` with no entry in COUNTRY_CONTINENT. */
export function unmappedCountries(): string[] {
  const seen = new Set<string>();
  for (const r of resorts) if (!(r.country in COUNTRY_CONTINENT)) seen.add(r.country);
  return [...seen].sort();
}

function stateFor(id: string, country: string, stateProvince?: string): string | undefined {
  if (!GROUPED_COUNTRIES.has(country)) return undefined;
  return STATE_OVERRIDES[id] ?? stateProvince ?? undefined;
}

function buildHierarchy(): ContinentEntry[] {
  const byContinent = new Map<string, Map<string, ResortEntry[]>>();

  for (const resort of resorts) {
    const continent = COUNTRY_CONTINENT[resort.country] ?? UNMAPPED_CONTINENT;
    const countries = byContinent.get(continent) ?? new Map<string, ResortEntry[]>();
    byContinent.set(continent, countries);

    const entries = countries.get(resort.country) ?? [];
    countries.set(resort.country, entries);

    const state = stateFor(
      resort.id,
      resort.country,
      (resort as { state_province?: string }).state_province,
    );
    entries.push(state ? { id: resort.id, name: resort.name, state } : { id: resort.id, name: resort.name });
  }

  // Continents in the curated order, then anything unexpected, so a country
  // that slipped the map is visible at the end rather than dropped.
  const continentNames = [
    ...CONTINENT_ORDER.filter((c) => byContinent.has(c)),
    ...[...byContinent.keys()].filter((c) => !CONTINENT_ORDER.includes(c as never)).sort(),
  ];

  return continentNames.map((continentName) => {
    const countries = byContinent.get(continentName)!;
    return {
      name: continentName,
      countries: [...countries.keys()]
        .sort((a, b) => a.localeCompare(b))
        .map((countryName) => {
          const order = STATE_ORDER[countryName] ?? [];
          // Listed states first in their curated order, unlisted ones after,
          // alphabetically; resorts alphabetical within each heading.
          const rank = (s?: string) => {
            if (!s) return -1;
            const i = order.indexOf(s);
            return i === -1 ? order.length : i;
          };
          const sorted = [...countries.get(countryName)!].sort((a, b) => {
            const ra = rank(a.state);
            const rb = rank(b.state);
            if (ra !== rb) return ra - rb;
            if (ra === order.length && a.state !== b.state) {
              return (a.state ?? "").localeCompare(b.state ?? "");
            }
            return a.name.localeCompare(b.name);
          });
          return { name: countryName, resorts: sorted };
        }),
    };
  });
}

export const regionHierarchy: ContinentEntry[] = buildHierarchy();

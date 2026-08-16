/**
 * The markets where Mountain Connects is open for BUSINESS signups and can
 * take payments. Drives /for-employers and /for-employers/[country].
 *
 * Deliberately only the live markets — an employer landing page advertises a
 * service, so we only publish one where a business can actually sign up,
 * post, and pay today. Add a market here when it opens.
 *
 * `country` must match the resort `country` string in lib/data/resorts.ts
 * ("USA", not "United States") so resort/town lookups line up.
 */
export interface EmployerMarket {
  slug: string;
  country: string;
  /** Short display name for headlines ("the US" reads better than "USA"). */
  displayName: string;
  /** Adjective for "X employers" / "X ski resorts". */
  adjective: string;
  hemisphere: "Northern" | "Southern";
  season: string;
  /** When most businesses should be hiring for that season. */
  hiringWindow: string;
  /** The visa/worker programme that supplies most seasonal staff — this is a
   *  selling point to employers: "we reach these workers". */
  workforce: string;
  /** Currency businesses in this market think in (display only; billing is USD). */
  localCurrency: string;
  /** Headline resort/town names — also what makes the page rank locally. */
  highlights: string[];
}

export const EMPLOYER_MARKETS: EmployerMarket[] = [
  {
    slug: "canada",
    country: "Canada",
    displayName: "Canada",
    adjective: "Canadian",
    hemisphere: "Northern",
    season: "November – April",
    hiringWindow: "September – November",
    workforce:
      "IEC Working Holiday makers from Australia, the UK, Ireland, France, Germany and Japan — the backbone of Canadian resort staffing every winter.",
    localCurrency: "CAD",
    highlights: ["Whistler", "Banff & Lake Louise", "Revelstoke", "Fernie", "Sun Peaks", "Big White", "Kicking Horse", "Mont-Tremblant"],
  },
  {
    slug: "japan",
    country: "Japan",
    displayName: "Japan",
    adjective: "Japanese",
    hemisphere: "Northern",
    season: "December – March",
    hiringWindow: "September – November",
    workforce:
      "English-speaking Working Holiday makers from Australia, New Zealand, Canada and the UK who come specifically for the powder season — ideal for guest-facing roles at international resorts.",
    localCurrency: "JPY",
    highlights: ["Niseko", "Hakuba", "Furano", "Nozawa Onsen", "Myoko", "Rusutsu", "Madarao", "Appi Kogen"],
  },
  {
    slug: "usa",
    country: "USA",
    displayName: "the USA",
    adjective: "American",
    hemisphere: "Northern",
    season: "December – April",
    hiringWindow: "August – October",
    workforce:
      "J-1 exchange visitors and Australian/Kiwi working-holiday makers — the international crews that keep Colorado, Utah, Tahoe and Vermont resorts running all season.",
    localCurrency: "USD",
    highlights: ["Vail", "Breckenridge", "Aspen Snowmass", "Park City", "Jackson Hole", "Palisades Tahoe", "Heavenly", "Stowe"],
  },
  {
    slug: "australia",
    country: "Australia",
    displayName: "Australia",
    adjective: "Australian",
    hemisphere: "Southern",
    season: "June – October",
    hiringWindow: "March – May",
    workforce:
      "Working Holiday makers (subclass 417/462) and domestic seasonal workers heading to the Snowy Mountains and Victorian Alps each winter.",
    localCurrency: "AUD",
    highlights: ["Thredbo", "Perisher", "Falls Creek", "Mt Buller", "Mt Hotham", "Charlotte Pass"],
  },
];

export function getEmployerMarket(slug: string): EmployerMarket | undefined {
  return EMPLOYER_MARKETS.find((m) => m.slug === slug);
}

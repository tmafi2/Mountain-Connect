/**
 * Per-country copy for the worker-facing side of the site.
 *
 * ⚠️ THIS LIVED INSIDE app/(public)/ski-resort-jobs/[country]/page.tsx as a
 * private const, which is why the globe could not show a word about any
 * country without someone re-typing it. That is the same shape as the four
 * hand-written copies of JOB_CATEGORIES (00125) and COUNTRY_CURRENCY sitting
 * inside the post-job form (00109): content a second screen needs, locked in
 * the file of the first screen that happened to want it.
 *
 * `country` must match the resort `country` string in lib/data/resorts.ts
 * ("USA", not "United States"), which is what lets the globe and the country
 * pages agree.
 */

export interface CountryConfig {
  slug: string;
  country: string;
  hemisphere: "Northern" | "Southern";
  season: string;
  visaNote: string;
  intro: string;
}

export const COUNTRIES: CountryConfig[] = [
  {
    slug: "australia",
    country: "Australia",
    hemisphere: "Southern",
    season: "June – October",
    visaNote: "Working Holiday Visa (subclass 417 / 462) is the most common path for under-35s.",
    intro:
      "Australian ski resort jobs are concentrated in the Snowy Mountains (Thredbo, Perisher) and the Victorian Alps (Falls Creek, Mt Buller, Mt Hotham). Most seasonal workers live in Jindabyne (NSW) or Mount Beauty (VIC). The 2026 winter season runs late June through early October.",
  },
  {
    slug: "new-zealand",
    country: "New Zealand",
    hemisphere: "Southern",
    season: "June – October",
    visaNote: "Working Holiday Visa available for under-35s from many countries. Some resort employer-sponsored work visas also exist.",
    intro:
      "New Zealand's ski jobs span both islands — Queenstown and Wakatipu (Coronet Peak, The Remarkables, Cardrona) on the South Island, and Mt Ruapehu on the North. The country has some of the most international ski crews in the world.",
  },
  {
    slug: "canada",
    country: "Canada",
    hemisphere: "Northern",
    season: "November – April",
    visaNote: "International Experience Canada (IEC) Working Holiday is the standard path for under-35s.",
    intro:
      "Canadian ski resort jobs run from late November to mid-April. Whistler Blackcomb, the Banff trio of Mount Norquay, Sunshine Village and Lake Louise, and Revelstoke see thousands of seasonal workers each year. Big resort operators sponsor specialist roles.",
  },
  {
    slug: "japan",
    country: "Japan",
    hemisphere: "Northern",
    season: "December – March",
    visaNote: "Working Holiday Visa available for citizens of select countries. Some specialist roles offer Designated Activities visas.",
    intro:
      "Japan's powder belt — Hakuba, Niseko, Furano, Nozawa Onsen — hires English-speaking workers for the December through March season. Roles concentrate in chalet hosting, ski school, and lift operations.",
  },
  {
    slug: "usa",
    country: "USA",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "J-1 Cultural Exchange and H-2B Seasonal Worker visas dominate. Some specialist roles offer H-2A or O-1.",
    intro:
      "US ski resort jobs span Colorado (Vail, Breckenridge, Aspen, Telluride), Utah (Park City), Vermont (Stowe), California (Mammoth, Tahoe), and Wyoming (Jackson Hole). The season runs December through April, with most hiring done August–October.",
  },
  {
    slug: "france",
    country: "France",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "EU/EEA citizens can work without a visa. Non-EU workers need a working visa or chalet operator sponsorship.",
    intro:
      "French alpine resorts — Chamonix, Val d'Isère, Méribel, Val Thorens, Courchevel — run their season from mid-December to late April. Chalet hosts, ski instructors, and ski-tech roles dominate the British and Australian-staffed operators.",
  },
  {
    slug: "switzerland",
    country: "Switzerland",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "EU/EEA citizens can work freely. Non-EU workers need an employer-sponsored work permit.",
    intro:
      "Swiss ski resort jobs (Verbier, Zermatt, St. Moritz, Sölden, Verbier) run mid-December through April. Pay rates are among the highest in the alps but the cost of living matches.",
  },
  {
    slug: "austria",
    country: "Austria",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "EU/EEA citizens work freely. Non-EU workers need a Red-White-Red Card or sponsored work permit.",
    intro:
      "Austrian ski resort jobs (St. Anton, Kitzbühel, Mayrhofen, Ischgl, Sölden) run early December to mid-April. Conversational German is often required for guest-facing roles.",
  },
  {
    slug: "italy",
    country: "Italy",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "EU/EEA citizens work freely. Non-EU workers need an Italian work visa.",
    intro:
      "Italian Dolomites resorts (Cortina d'Ampezzo, Madonna di Campiglio, Livigno) run from late November through early April. Hospitality and chalet roles dominate; Italian language is a plus but not always essential.",
  },
  {
    slug: "andorra",
    country: "Andorra",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "EU citizens preferred. Non-EU workers need an Andorran working permit.",
    intro:
      "Andorran resorts (Soldeu, Pas de la Casa, Grandvalira) run from early December through mid-April. Spanish, French, or Catalan language is often required.",
  },
  {
    slug: "argentina",
    country: "Argentina",
    hemisphere: "Southern",
    season: "June – October",
    visaNote: "Working Holiday Visa available for citizens of select countries.",
    intro:
      "Argentine ski jobs (Bariloche / Cerro Catedral, Las Leñas, Cerro Bayo) run June through October — perfect for back-to-back ski seasons with the northern hemisphere.",
  },
  {
    slug: "chile",
    country: "Chile",
    hemisphere: "Southern",
    season: "June – October",
    visaNote: "Working Holiday Visa available for select nationalities. Sponsored work permits common at large resorts.",
    intro:
      "Chilean resorts (Portillo, Valle Nevado, La Parva, Termas de Chillán) run June through October. International instructor and hospitality programs are common.",
  },
  {
    slug: "georgia",
    country: "Georgia",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "Many nationalities can stay 365 days visa-free and work without restriction.",
    intro:
      "Gudauri and Bakuriani run December through April. Georgian ski jobs are increasingly popular thanks to long visa-free stays for most passports.",
  },
  {
    slug: "sweden",
    country: "Sweden",
    hemisphere: "Northern",
    season: "December – April",
    visaNote: "EU/EEA citizens work freely. Non-EU workers need a Swedish work permit.",
    intro:
      "Swedish ski resorts (Åre, Sälen, Riksgränsen) run December through April, with the northern resorts staying open later into May. English is widely spoken.",
  },
];

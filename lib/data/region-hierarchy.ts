// Continent → Country → (optional state sub-region) → Resorts hierarchy.
// Resort `state` is optional — when present, the explore page groups
// the country's resorts under sub-region headings (e.g. New South
// Wales, Victoria, Tasmania for Australia; Queenstown, Wanaka,
// Canterbury, Ruapehu for New Zealand). Countries without state
// values render as a flat alphabetical list (the previous default).

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

export const regionHierarchy: ContinentEntry[] = [
  {
    name: "Asia",
    countries: [
      {
        name: "Japan",
        resorts: [
          // Hokkaido
          { id: "45", name: "Furano", state: "Hokkaido" },
          { id: "92", name: "Kiroro", state: "Hokkaido" },
          { id: "3", name: "Niseko United", state: "Hokkaido" },
          { id: "44", name: "Rusutsu", state: "Hokkaido" },
          // Honshu (Aomori)
          { id: "101", name: "Hakkoda", state: "Aomori" },
          // Honshu (Akita)
          { id: "102", name: "Tazawako", state: "Akita" },
          // Honshu (Iwate)
          { id: "95", name: "Appi Kogen", state: "Iwate" },
          { id: "100", name: "Hachimantai", state: "Iwate" },
          { id: "93", name: "Okunakayama Kogen", state: "Iwate" },
          { id: "96", name: "Shizukuishi", state: "Iwate" },
          // Honshu (Niigata)
          { id: "98", name: "Hakkaisan", state: "Niigata" },
          { id: "47", name: "Myoko Kogen", state: "Niigata" },
          { id: "49", name: "Naeba", state: "Niigata" },
          // Honshu (Nagano)
          { id: "43", name: "Hakuba Valley", state: "Nagano" },
          { id: "97", name: "Karuizawa", state: "Nagano" },
          { id: "94", name: "Madarao Kogen", state: "Nagano" },
          { id: "46", name: "Nozawa Onsen", state: "Nagano" },
          { id: "48", name: "Shiga Kogen", state: "Nagano" },
          // Honshu (Gunma)
          { id: "99", name: "Manza Onsen", state: "Gunma" },
        ],
      },
    ],
  },
  {
    name: "Europe",
    countries: [
      {
        name: "Andorra",
        resorts: [
          { id: "10", name: "Grandvalira" },
        ],
      },
      {
        name: "Austria",
        resorts: [
          { id: "37", name: "Ischgl" },
          { id: "36", name: "Kitzbühel" },
          { id: "39", name: "Mayrhofen" },
          { id: "38", name: "Sölden" },
          { id: "35", name: "St. Anton am Arlberg" },
        ],
      },
      {
        name: "France",
        resorts: [
          { id: "2", name: "Chamonix Mont-Blanc" },
          { id: "30", name: "Courchevel" },
          { id: "32", name: "Les Arcs / La Plagne" },
          { id: "29", name: "Méribel" },
          { id: "31", name: "Morzine / Avoriaz" },
          { id: "27", name: "Val d'Isère" },
          { id: "28", name: "Val Thorens" },
        ],
      },
      {
        name: "Georgia",
        resorts: [
          { id: "9", name: "Gudauri" },
        ],
      },
      {
        name: "Italy",
        resorts: [
          { id: "42", name: "Cervinia" },
          { id: "41", name: "Cortina d'Ampezzo" },
          { id: "40", name: "Livigno" },
        ],
      },
      {
        name: "Sweden",
        resorts: [
          { id: "8", name: "Åre" },
        ],
      },
      {
        name: "Switzerland",
        resorts: [
          { id: "34", name: "St. Moritz" },
          { id: "33", name: "Verbier" },
          { id: "4", name: "Zermatt" },
        ],
      },
    ],
  },
  {
    name: "North America",
    countries: [
      {
        name: "Canada",
        resorts: [
          // British Columbia
          { id: "58", name: "Big White Ski Resort", state: "British Columbia" },
          { id: "108", name: "Fernie", state: "British Columbia" },
          { id: "107", name: "Kicking Horse", state: "British Columbia" },
          { id: "15", name: "Revelstoke", state: "British Columbia" },
          { id: "59", name: "Silver Star Mountain Resort", state: "British Columbia" },
          { id: "57", name: "Sun Peaks Resort", state: "British Columbia" },
          { id: "1", name: "Whistler Blackcomb", state: "British Columbia" },
          // Alberta
          { id: "11", name: "Banff / Lake Louise", state: "Alberta" },
          { id: "60", name: "Lake Louise Ski Resort", state: "Alberta" },
          { id: "63", name: "Marmot Basin", state: "Alberta" },
          { id: "62", name: "Nakiska Ski Area", state: "Alberta" },
          { id: "61", name: "Sunshine Village", state: "Alberta" },
          // Quebec
          { id: "65", name: "Le Massif de Charlevoix", state: "Quebec" },
          { id: "66", name: "Mont-Sainte-Anne", state: "Quebec" },
          { id: "64", name: "Mont-Tremblant", state: "Quebec" },
          { id: "67", name: "Stoneham Mountain Resort", state: "Quebec" },
          // Ontario
          { id: "68", name: "Blue Mountain Resort", state: "Ontario" },
          // Manitoba
          { id: "69", name: "Asessippi Ski Area", state: "Manitoba" },
        ],
      },
      {
        name: "USA",
        resorts: [
          // Wyoming
          { id: "18", name: "Jackson Hole", state: "Wyoming" },
          // Montana
          { id: "20", name: "Big Sky", state: "Montana" },
          // Idaho
          { id: "24", name: "Sun Valley", state: "Idaho" },
          // Utah
          { id: "19", name: "Park City", state: "Utah" },
          { id: "103", name: "Snowbird", state: "Utah" },
          // Colorado
          { id: "16", name: "Aspen Snowmass", state: "Colorado" },
          { id: "104", name: "Beaver Creek", state: "Colorado" },
          { id: "17", name: "Breckenridge", state: "Colorado" },
          { id: "26", name: "Crested Butte", state: "Colorado" },
          { id: "21", name: "Steamboat Springs", state: "Colorado" },
          { id: "23", name: "Telluride", state: "Colorado" },
          { id: "5", name: "Vail", state: "Colorado" },
          // California
          { id: "106", name: "Heavenly", state: "California" },
          { id: "25", name: "Mammoth Mountain", state: "California" },
          { id: "105", name: "Palisades Tahoe", state: "California" },
          // Vermont
          { id: "22", name: "Stowe", state: "Vermont" },
        ],
      },
    ],
  },
  {
    name: "Australia / New Zealand",
    countries: [
      {
        name: "Australia",
        resorts: [
          // New South Wales
          { id: "70", name: "Charlotte's Pass", state: "New South Wales" },
          { id: "50", name: "Perisher", state: "New South Wales" },
          { id: "71", name: "Selwyn Snow Resort", state: "New South Wales" },
          { id: "52", name: "Thredbo", state: "New South Wales" },
          // Victoria
          { id: "51", name: "Falls Creek", state: "Victoria" },
          { id: "75", name: "Lake Mountain", state: "Victoria" },
          { id: "74", name: "Mount Baw Baw", state: "Victoria" },
          { id: "53", name: "Mt Hotham", state: "Victoria" },
          { id: "72", name: "Mt Buller", state: "Victoria" },
          { id: "73", name: "Mount Stirling", state: "Victoria" },
          // Tasmania
          { id: "77", name: "Ben Lomond", state: "Tasmania" },
          { id: "76", name: "Mount Mawson", state: "Tasmania" },
        ],
      },
      {
        name: "New Zealand",
        resorts: [
          // Queenstown
          { id: "78", name: "Coronet Peak", state: "Queenstown" },
          { id: "7", name: "The Remarkables", state: "Queenstown" },
          // Wanaka
          { id: "79", name: "Cardrona", state: "Wanaka" },
          { id: "80", name: "Treble Cone", state: "Wanaka" },
          // Canterbury
          { id: "84", name: "Broken River", state: "Canterbury" },
          { id: "85", name: "Craigieburn", state: "Canterbury" },
          { id: "87", name: "Hanmer Springs", state: "Canterbury" },
          { id: "83", name: "Mount Cheeseman", state: "Canterbury" },
          { id: "88", name: "Mount Lyford", state: "Canterbury" },
          { id: "82", name: "Mount Olympus", state: "Canterbury" },
          { id: "54", name: "Mt Hutt", state: "Canterbury" },
          { id: "81", name: "Porters", state: "Canterbury" },
          { id: "86", name: "Temple Basin", state: "Canterbury" },
          // Ruapehu
          { id: "90", name: "Tukino", state: "Ruapehu" },
          { id: "91", name: "Turoa", state: "Ruapehu" },
          { id: "89", name: "Whakapapa", state: "Ruapehu" },
        ],
      },
    ],
  },
  {
    name: "South America",
    countries: [
      {
        name: "Argentina",
        resorts: [
          { id: "55", name: "Cerro Catedral" },
        ],
      },
      {
        name: "Chile",
        resorts: [
          { id: "56", name: "Portillo" },
          { id: "6", name: "Valle Nevado" },
        ],
      },
    ],
  },
];

// Continent → Country → Resorts hierarchy
// Add more countries and resorts here over time

export interface ResortEntry {
  id: string;
  name: string;
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
          { id: "45", name: "Furano" },
          { id: "43", name: "Hakuba Valley" },
          { id: "47", name: "Myoko Kogen" },
          { id: "49", name: "Naeba" },
          { id: "3", name: "Niseko United" },
          { id: "46", name: "Nozawa Onsen" },
          { id: "44", name: "Rusutsu" },
          { id: "48", name: "Shiga Kogen" },
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
          { id: "11", name: "Banff / Lake Louise" },
          { id: "15", name: "Revelstoke" },
          { id: "1", name: "Whistler Blackcomb" },
        ],
      },
      {
        name: "USA",
        resorts: [
          { id: "16", name: "Aspen Snowmass" },
          { id: "20", name: "Big Sky" },
          { id: "17", name: "Breckenridge" },
          { id: "26", name: "Crested Butte" },
          { id: "18", name: "Jackson Hole" },
          { id: "25", name: "Mammoth Mountain" },
          { id: "19", name: "Park City" },
          { id: "21", name: "Steamboat Springs" },
          { id: "22", name: "Stowe" },
          { id: "24", name: "Sun Valley" },
          { id: "23", name: "Telluride" },
          { id: "5", name: "Vail" },
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
          { id: "51", name: "Falls Creek" },
          { id: "53", name: "Mt Hotham" },
          { id: "50", name: "Perisher" },
          { id: "52", name: "Thredbo" },
        ],
      },
      {
        name: "New Zealand",
        resorts: [
          { id: "54", name: "Mt Hutt" },
          { id: "7", name: "Queenstown / The Remarkables" },
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

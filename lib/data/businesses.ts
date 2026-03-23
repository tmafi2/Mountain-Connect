import { BusinessProfile, BusinessCategory, BusinessVerificationStatus } from "@/types/database";

// ── Demo Business Seed Data ─────────────────────────────────

export interface SeedBusinessPhoto {
  id: string;
  url: string;
  caption?: string;
}

export interface SeedBusiness extends BusinessProfile {
  resort_ids: string[]; // which resorts this business operates at
  open_positions: number; // count of active job listings
  tagline: string;
  photos: SeedBusinessPhoto[];
}

const CATEGORIES: Record<BusinessCategory, string> = {
  ski_school: "Ski School",
  hospitality: "Hospitality",
  food_beverage: "Food & Beverage",
  retail: "Retail",
  resort_operations: "Resort Operations",
  accommodation: "Accommodation",
  rental_shop: "Rental & Equipment",
  transport: "Transport",
  entertainment: "Entertainment",
  other: "Other",
};

export function getCategoryLabel(category: BusinessCategory | null): string {
  if (!category) return "Other";
  return CATEGORIES[category] || "Other";
}

export const seedBusinesses: SeedBusiness[] = [
  // ─── Whistler Blackcomb businesses ────────────────────
  {
    id: "biz-1",
    user_id: "demo-user-biz-1",
    business_name: "Whistler Blackcomb Ski & Snowboard School",
    description:
      "North America's largest ski and snowboard school, offering group and private lessons for all ages and abilities across two mountains. We pride ourselves on world-class instruction and creating unforgettable mountain experiences for guests from around the globe.",
    website: "https://www.whistlerblackcomb.com/lessons",
    location: "Whistler, BC, Canada",
    is_verified: true,
    verification_status: "verified" as BusinessVerificationStatus,
    slug: "whistler-blackcomb-ski-school",
    category: "ski_school" as BusinessCategory,
    year_established: 1966,
    logo_url: null,
    social_links: { instagram: "@whistlerblackcomb", facebook: "WhistlerBlackcomb" },
    standard_perks: ["Season ski pass", "Staff housing", "Pro deals on gear", "Free lessons"],
    phone: "+1 604-967-8950",
    email: "jobs@whistlerblackcomb.com",
    timezone: "America/Vancouver",
    created_at: "2025-06-01T00:00:00Z",
    resort_ids: ["1"],
    open_positions: 12,
    tagline: "North America's largest ski & snowboard school",
    photos: [
      { id: "ph-1a", url: "https://picsum.photos/seed/wbss1/600/450", caption: "Group lesson on Blackcomb" },
      { id: "ph-1b", url: "https://picsum.photos/seed/wbss2/600/450", caption: "Our team of instructors" },
      { id: "ph-1c", url: "https://picsum.photos/seed/wbss3/600/450", caption: "Kids ski camp" },
      { id: "ph-1d", url: "https://picsum.photos/seed/wbss4/600/450", caption: "Powder day on Whistler" },
    ],
  },
  {
    id: "biz-2",
    user_id: "demo-user-biz-2",
    business_name: "Fairmont Chateau Whistler",
    description:
      "A landmark luxury hotel at the base of Blackcomb Mountain, offering five-star accommodation, dining, and spa services. We employ over 600 seasonal staff each winter across housekeeping, food & beverage, front desk, spa, and guest services.",
    website: "https://www.fairmont.com/whistler",
    location: "Whistler, BC, Canada",
    is_verified: true,
    verification_status: "verified" as BusinessVerificationStatus,
    slug: "fairmont-chateau-whistler",
    category: "accommodation" as BusinessCategory,
    year_established: 1989,
    logo_url: null,
    social_links: { instagram: "@faaborirmonthotels", facebook: "FairmontChateauWhistler" },
    standard_perks: ["Staff housing at $500/mo", "Ski pass", "Meals included", "Gym access", "Career development"],
    phone: "+1 604-938-8000",
    email: "careers.whistler@fairmont.com",
    timezone: "America/Vancouver",
    created_at: "2025-05-15T00:00:00Z",
    resort_ids: ["1"],
    open_positions: 24,
    tagline: "Luxury mountain hospitality at the base of Blackcomb",
    photos: [
      { id: "ph-2a", url: "https://picsum.photos/seed/fcw1/600/450", caption: "Hotel exterior in winter" },
      { id: "ph-2b", url: "https://picsum.photos/seed/fcw2/600/450", caption: "Grand lobby" },
      { id: "ph-2c", url: "https://picsum.photos/seed/fcw3/600/450", caption: "Fine dining restaurant" },
    ],
  },
  {
    id: "biz-3",
    user_id: "demo-user-biz-3",
    business_name: "Garibaldi Lift Co.",
    description:
      "Whistler's iconic apres-ski bar and restaurant located right at the base of the gondola. Famous for its lively atmosphere, craft cocktails, and legendary DJ nights. We're looking for high-energy staff who love the mountain lifestyle.",
    website: "https://www.gibbonsgroupinc.com/glc",
    location: "Whistler, BC, Canada",
    is_verified: true,
    verification_status: "verified" as BusinessVerificationStatus,
    slug: "garibaldi-lift-co",
    category: "food_beverage" as BusinessCategory,
    year_established: 1996,
    logo_url: null,
    social_links: { instagram: "@garibaldiliftco" },
    standard_perks: ["Staff meals", "Industry nights off", "Pro deals"],
    phone: "+1 604-905-2220",
    email: "jobs@garibaldiliftco.com",
    timezone: "America/Vancouver",
    created_at: "2025-07-01T00:00:00Z",
    resort_ids: ["1"],
    open_positions: 8,
    tagline: "Whistler's legendary apres-ski bar",
    photos: [
      { id: "ph-3a", url: "https://picsum.photos/seed/glc1/600/450", caption: "Apres-ski vibes" },
      { id: "ph-3b", url: "https://picsum.photos/seed/glc2/600/450", caption: "Our famous patio" },
    ],
  },
  {
    id: "biz-4",
    user_id: "demo-user-biz-4",
    business_name: "Vail Resorts",
    description:
      "The world's largest ski resort operator, managing Whistler Blackcomb along with Vail, Park City, and dozens of other resorts globally. Our mountain operations team keeps the lifts spinning, the snow groomed, and the resort running smoothly every day of the season.",
    website: "https://www.vailresorts.com",
    location: "Whistler, BC, Canada",
    is_verified: true,
    verification_status: "verified" as BusinessVerificationStatus,
    slug: "vail-resorts-whistler",
    category: "resort_operations" as BusinessCategory,
    year_established: 1962,
    logo_url: null,
    social_links: { instagram: "@vaborailresorts", linkedin: "vail-resorts" },
    standard_perks: ["Epic Pass", "Staff housing", "401(k)", "Health benefits", "Career progression"],
    phone: "+1 604-967-8950",
    email: "careers@vailresorts.com",
    timezone: "America/Vancouver",
    created_at: "2025-04-01T00:00:00Z",
    resort_ids: ["1", "16"],
    open_positions: 35,
    tagline: "World's largest ski resort operator",
    photos: [
      { id: "ph-4a", url: "https://picsum.photos/seed/vr1/600/450", caption: "Mountain operations crew" },
      { id: "ph-4b", url: "https://picsum.photos/seed/vr2/600/450", caption: "Grooming at sunrise" },
      { id: "ph-4c", url: "https://picsum.photos/seed/vr3/600/450", caption: "Lift maintenance team" },
    ],
  },
  {
    id: "biz-5",
    user_id: "demo-user-biz-5",
    business_name: "Summit Sport Whistler",
    description:
      "Premium ski and snowboard rental, retail, and repair shop in the heart of Whistler Village. We carry top brands and provide expert boot fitting, tuning, and gear advice. Great opportunity for gear enthusiasts who want to work on the mountain.",
    website: "https://www.summitsport.com",
    location: "Whistler, BC, Canada",
    is_verified: true,
    verification_status: "verified" as BusinessVerificationStatus,
    slug: "summit-sport-whistler",
    category: "rental_shop" as BusinessCategory,
    year_established: 2003,
    logo_url: null,
    social_links: { instagram: "@summitsportwhistler" },
    standard_perks: ["Pro deals on gear", "Ski pass discount", "Flexible schedules"],
    phone: "+1 604-932-6225",
    email: "jobs@summitsport.com",
    timezone: "America/Vancouver",
    created_at: "2025-08-01T00:00:00Z",
    resort_ids: ["1"],
    open_positions: 5,
    tagline: "Premium rentals & retail in Whistler Village",
    photos: [
      { id: "ph-5a", url: "https://picsum.photos/seed/ssw1/600/450", caption: "Our shop in Whistler Village" },
      { id: "ph-5b", url: "https://picsum.photos/seed/ssw2/600/450", caption: "Expert boot fitting" },
    ],
  },

  // ─── Chamonix businesses ──────────────────────────────
  {
    id: "biz-6",
    user_id: "demo-user-biz-6",
    business_name: "Le Refuge Alpine",
    description:
      "A highly regarded mountain restaurant in Chamonix known for its modern take on traditional Savoyard cuisine. Located mid-mountain with stunning views of Mont Blanc, we serve both lunching skiers and fine dining guests in the evening.",
    website: "https://www.lerefugealpine.fr",
    location: "Chamonix, France",
    is_verified: true,
    verification_status: "verified" as BusinessVerificationStatus,
    slug: "le-refuge-alpine",
    category: "food_beverage" as BusinessCategory,
    year_established: 2008,
    logo_url: null,
    social_links: { instagram: "@lerefugealpine", facebook: "LeRefugeAlpine" },
    standard_perks: ["Staff accommodation", "Ski pass", "Meals on shift", "French language classes"],
    phone: "+33 4 50 53 00 00",
    email: "emploi@lerefugealpine.fr",
    timezone: "Europe/Paris",
    created_at: "2025-06-15T00:00:00Z",
    resort_ids: ["25"],
    open_positions: 6,
    tagline: "Modern Savoyard cuisine with Mont Blanc views",
    photos: [
      { id: "ph-6a", url: "https://picsum.photos/seed/lra1/600/450", caption: "Terrace with Mont Blanc views" },
      { id: "ph-6b", url: "https://picsum.photos/seed/lra2/600/450", caption: "Savoyard fondue" },
    ],
  },
  {
    id: "biz-7",
    user_id: "demo-user-biz-7",
    business_name: "Compagnie du Mont-Blanc",
    description:
      "The company operating the lifts and mountain infrastructure of the Chamonix valley ski areas including Les Grands Montets, Brevent-Flegere, and the Aiguille du Midi. We employ hundreds of seasonal workers in lift operations, grooming, ski patrol, and guest services.",
    website: "https://www.montblancnaturalresort.com",
    location: "Chamonix, France",
    is_verified: true,
    verification_status: "verified" as BusinessVerificationStatus,
    slug: "compagnie-du-mont-blanc",
    category: "resort_operations" as BusinessCategory,
    year_established: 1920,
    logo_url: null,
    social_links: { instagram: "@compagniedumontblanc", facebook: "CompagnieDuMontBlanc" },
    standard_perks: ["Season pass all areas", "Staff housing assistance", "French social benefits", "Training programs"],
    phone: "+33 4 50 53 22 75",
    email: "recrutement@compagniedumontblanc.fr",
    timezone: "Europe/Paris",
    created_at: "2025-05-01T00:00:00Z",
    resort_ids: ["25"],
    open_positions: 18,
    tagline: "Operating Chamonix's legendary ski areas since 1920",
    photos: [
      { id: "ph-7a", url: "https://picsum.photos/seed/cmb1/600/450", caption: "Aiguille du Midi cable car" },
      { id: "ph-7b", url: "https://picsum.photos/seed/cmb2/600/450", caption: "Grooming Les Grands Montets" },
      { id: "ph-7c", url: "https://picsum.photos/seed/cmb3/600/450", caption: "Team at Brevent summit" },
    ],
  },

  // ─── Niseko businesses ────────────────────────────────
  {
    id: "biz-8",
    user_id: "demo-user-biz-8",
    business_name: "Niseko United",
    description:
      "The unified resort pass system connecting Niseko's four interconnected ski areas: Grand Hirafu, Hanazono, Niseko Village, and Annupuri. We employ seasonal staff across all four areas for lift operations, rental services, and guest experience.",
    website: "https://www.nisekounited.com",
    location: "Niseko, Hokkaido, Japan",
    is_verified: true,
    verification_status: "verified" as BusinessVerificationStatus,
    slug: "niseko-united",
    category: "resort_operations" as BusinessCategory,
    year_established: 2011,
    logo_url: null,
    social_links: { instagram: "@nisekounited" },
    standard_perks: ["All-mountain pass", "Staff housing", "Hot spring access", "Japanese lessons"],
    phone: "+81 136-22-0109",
    email: "jobs@nisekounited.com",
    timezone: "Asia/Tokyo",
    created_at: "2025-07-15T00:00:00Z",
    resort_ids: ["30"],
    open_positions: 22,
    tagline: "Four mountains, one legendary powder experience",
    photos: [
      { id: "ph-8a", url: "https://picsum.photos/seed/nu1/600/450", caption: "Deep powder at Grand Hirafu" },
      { id: "ph-8b", url: "https://picsum.photos/seed/nu2/600/450", caption: "Night skiing" },
    ],
  },

  // ─── Queenstown businesses ────────────────────────────
  {
    id: "biz-9",
    user_id: "demo-user-biz-9",
    business_name: "NZSki",
    description:
      "New Zealand's largest ski company operating The Remarkables, Coronet Peak, and Mt Hutt. Based in Queenstown, we offer some of the Southern Hemisphere's best skiing with stunning alpine scenery. We hire hundreds of seasonal workers each year.",
    website: "https://www.nzski.com",
    location: "Queenstown, New Zealand",
    is_verified: true,
    verification_status: "verified" as BusinessVerificationStatus,
    slug: "nzski",
    category: "resort_operations" as BusinessCategory,
    year_established: 2002,
    logo_url: null,
    social_links: { instagram: "@naborazski", facebook: "NZSki" },
    standard_perks: ["Season pass 3 mountains", "Pro deals", "Staff events", "NZ work experience"],
    phone: "+64 3-450-1970",
    email: "careers@nzski.com",
    timezone: "Pacific/Auckland",
    created_at: "2025-03-01T00:00:00Z",
    resort_ids: ["39", "40"],
    open_positions: 15,
    tagline: "New Zealand's premier ski company",
    photos: [
      { id: "ph-9a", url: "https://picsum.photos/seed/nzs1/600/450", caption: "The Remarkables" },
      { id: "ph-9b", url: "https://picsum.photos/seed/nzs2/600/450", caption: "Coronet Peak sunset" },
      { id: "ph-9c", url: "https://picsum.photos/seed/nzs3/600/450", caption: "Staff training day" },
    ],
  },

  // ─── Unverified business (for testing) ────────────────
  {
    id: "biz-10",
    user_id: "demo-user-biz-10",
    business_name: "Mountain Burger Co.",
    description:
      "A new burger joint opening at the base of Whistler Village. We're just getting started and looking for kitchen and front-of-house staff for our first season.",
    website: null,
    location: "Whistler, BC, Canada",
    is_verified: false,
    verification_status: "pending_review" as BusinessVerificationStatus,
    slug: "mountain-burger-co",
    category: "food_beverage" as BusinessCategory,
    year_established: 2025,
    logo_url: null,
    social_links: {},
    standard_perks: ["Staff meals", "Flexible hours"],
    phone: null,
    email: "info@mountainburger.co",
    timezone: "America/Vancouver",
    created_at: "2025-09-01T00:00:00Z",
    resort_ids: ["1"],
    open_positions: 3,
    tagline: "Fresh burgers at the base of the mountain",
    photos: [],
  },
];

// Helper: get verified businesses for a specific resort
export function getVerifiedBusinessesForResort(resortId: string): SeedBusiness[] {
  return seedBusinesses.filter(
    (b) => b.verification_status === "verified" && b.resort_ids.includes(resortId)
  );
}

// Helper: get a business by slug
export function getBusinessBySlug(slug: string): SeedBusiness | undefined {
  return seedBusinesses.find((b) => b.slug === slug);
}

// Helper: get a business by ID
export function getBusinessById(id: string): SeedBusiness | undefined {
  return seedBusinesses.find((b) => b.id === id);
}

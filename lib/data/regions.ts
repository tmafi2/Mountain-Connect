import { Region } from "@/types/database";

// Seed data — will be replaced with Supabase queries once connected
export const regions: (Region & { image_placeholder: string; image_url: string })[] = [
  {
    id: "1",
    name: "The Alps",
    country: "Europe",
    description:
      "Home to world-renowned resorts across France, Switzerland, Austria, and Italy.",
    image_placeholder: "/images/regions/alps.jpg",
    image_url: "https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&q=80",
  },
  {
    id: "2",
    name: "Rocky Mountains",
    country: "North America",
    description:
      "Stretching from Canada to New Mexico, featuring legendary resorts like Whistler, Vail, and Aspen.",
    image_placeholder: "/images/regions/rockies.jpg",
    image_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
  },
  {
    id: "3",
    name: "Japanese Alps",
    country: "Japan",
    description:
      "Famous for deep powder snow and unique cultural experiences in Hokkaido and Honshu.",
    image_placeholder: "/images/regions/japan.jpg",
    image_url: "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?w=800&q=80",
  },
  {
    id: "4",
    name: "Scandinavian Mountains",
    country: "Europe",
    description:
      "Norway and Sweden offer stunning fjord-side skiing and the magic of the Northern Lights.",
    image_placeholder: "/images/regions/scandinavia.jpg",
    image_url: "https://images.unsplash.com/photo-1520769669658-f07657f5a307?w=800&q=80",
  },
  {
    id: "5",
    name: "Andes",
    country: "South America",
    description:
      "Chile and Argentina provide Southern Hemisphere ski seasons from June to October.",
    image_placeholder: "/images/regions/andes.jpg",
    image_url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
  },
  {
    id: "6",
    name: "Southern Alps",
    country: "New Zealand",
    description:
      "Breathtaking scenery and uncrowded slopes in the heart of New Zealand's South Island.",
    image_placeholder: "/images/regions/nz.jpg",
    image_url: "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=800&q=80",
  },
  {
    id: "7",
    name: "Caucasus Mountains",
    country: "Georgia / Russia",
    description:
      "Emerging ski destinations with affordable resorts and dramatic mountain terrain.",
    image_placeholder: "/images/regions/caucasus.jpg",
    image_url: "https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?w=800&q=80",
  },
  {
    id: "8",
    name: "Pyrenees",
    country: "Europe",
    description:
      "The border range between France and Spain, offering diverse skiing in a warm climate.",
    image_placeholder: "/images/regions/pyrenees.jpg",
    image_url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80",
  },
  {
    id: "9",
    name: "Snowy Mountains",
    country: "Australia",
    description:
      "Australia's alpine region in New South Wales and Victoria, offering a unique Southern Hemisphere ski season.",
    image_placeholder: "/images/regions/snowy-mountains.jpg",
    image_url: "https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=800&q=80",
  },
  {
    id: "10",
    name: "Eastern US Mountains",
    country: "USA",
    description:
      "The Green Mountains, White Mountains, and Appalachian ranges of the northeastern United States.",
    image_placeholder: "/images/regions/eastern-us.jpg",
    image_url: "https://images.unsplash.com/photo-1418985991508-e47386d96a71?w=800&q=80",
  },
];

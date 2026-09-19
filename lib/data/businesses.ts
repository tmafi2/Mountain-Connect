import { BusinessCategory } from "@/types/database";

// Display labels for business_profiles.category.
//
// This file used to hold demo seed businesses, which presented real companies
// (Vail Resorts, Fairmont, NZSki…) as "Verified Employer" on public pages at
// /employers/{slug}. None of them had ever signed up. The seed data and that
// route were removed on 2026-09-19. Do not bring demo businesses back: any
// page a visitor can reach must show real business_profiles rows only.

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

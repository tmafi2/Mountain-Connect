// This script generates a SQL migration that seeds all resorts and regions into Supabase.
// Run with: node scripts/generate-resort-seed.mjs > supabase/migrations/00012_seed_resorts.sql

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

// Read and parse the static resort data by evaluating the TypeScript as JavaScript
const resortsFile = readFileSync(join(rootDir, "lib/data/resorts.ts"), "utf-8");
const regionsFile = readFileSync(join(rootDir, "lib/data/regions.ts"), "utf-8");

// Extract resort data using regex — each createResort({...}) block
function parseResorts(content) {
  const resorts = [];
  // Match each createResort({...}) call
  const regex = /createResort\(\{([\s\S]*?)\}\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const block = match[1];
    const resort = {};

    // Parse simple string fields
    const strFields = ["id", "name", "country", "description", "state_province", "nearest_town",
      "website", "banner_image_url", "logo_url", "region_id", "season_start", "season_end",
      "estimated_seasonal_staff", "visa_requirements", "recruitment_timeline",
      "staff_housing_avg_rent", "cost_of_living_weekly", "public_transport",
      "apres_scene", "healthcare_access", "shops_and_services", "international_community_size",
      "snow_reliability"];

    for (const field of strFields) {
      // Match field: "value" or field: 'value' — handle multiline
      const r = new RegExp(`${field}:\\s*(?:"([^"]*(?:"[^"]*)*?)"|'([^']*)')`, "s");
      const m = block.match(r);
      if (m) resort[field] = m[1] || m[2];

      // Also try template literals and multiline strings
      if (!resort[field]) {
        const r2 = new RegExp(`${field}:\\s*\n\\s*"([\\s\\S]*?)"`, "m");
        const m2 = block.match(r2);
        if (m2) resort[field] = m2[1];
      }
    }

    // Parse number fields
    const numFields = ["latitude", "longitude", "skiable_terrain_ha", "num_runs", "runs_green",
      "runs_blue", "runs_black", "runs_double_black", "vertical_drop_m", "base_elevation_m",
      "summit_elevation_m", "num_lifts", "snowfall_avg_cm", "staff_housing_capacity",
      "avg_winter_temp_min_c", "avg_winter_temp_max_c", "artificial_snow_coverage_pct"];

    for (const field of numFields) {
      const r = new RegExp(`${field}:\\s*(-?[\\d.]+)`);
      const m = block.match(r);
      if (m) resort[field] = parseFloat(m[1]);
    }

    // Parse boolean fields
    const boolFields = ["staff_housing_available", "is_verified"];
    for (const field of boolFields) {
      const r = new RegExp(`${field}:\\s*(true|false)`);
      const m = block.match(r);
      if (m) resort[field] = m[1] === "true";
    }

    // Parse array fields
    const arrFields = ["main_employers", "common_jobs", "languages_required", "staff_perks",
      "outdoor_activities"];
    for (const field of arrFields) {
      const r = new RegExp(`${field}:\\s*\\[([\\s\\S]*?)\\]`);
      const m = block.match(r);
      if (m) {
        const items = m[1].match(/"([^"]*)"/g);
        if (items) resort[field] = items.map(s => s.replace(/"/g, ""));
      }
    }

    // Parse lift_types object
    const ltMatch = block.match(/lift_types:\s*\{([^}]*)\}/);
    if (ltMatch) {
      const lt = {};
      const gondolas = ltMatch[1].match(/gondolas:\s*(\d+)/);
      const chairlifts = ltMatch[1].match(/chairlifts:\s*(\d+)/);
      const surface = ltMatch[1].match(/surface_lifts:\s*(\d+)/);
      if (gondolas) lt.gondolas = parseInt(gondolas[1]);
      if (chairlifts) lt.chairlifts = parseInt(chairlifts[1]);
      if (surface) lt.surface_lifts = parseInt(surface[1]);
      resort.lift_types = lt;
    }

    if (resort.id && resort.name) resorts.push(resort);
  }
  return resorts;
}

function parseRegions(content) {
  const regions = [];
  const regex = /\{[\s\S]*?id:\s*"(\d+)"[\s\S]*?name:\s*"([^"]*)"[\s\S]*?country:\s*"([^"]*)"[\s\S]*?description:\s*"([^"]*)"[\s\S]*?\}/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    regions.push({ id: match[1], name: match[2], country: match[3], description: match[4] });
  }
  return regions;
}

function esc(s) {
  if (s === null || s === undefined) return "NULL";
  return "'" + String(s).replace(/'/g, "''") + "'";
}

function escArr(arr) {
  if (!arr || arr.length === 0) return "NULL";
  return "ARRAY[" + arr.map(s => esc(s)).join(", ") + "]::text[]";
}

function escJson(obj) {
  if (!obj) return "NULL";
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
}

function escNum(n) {
  if (n === null || n === undefined) return "NULL";
  return String(n);
}

function escBool(b) {
  if (b === null || b === undefined) return "NULL";
  return b ? "true" : "false";
}

const resorts = parseResorts(resortsFile);
const regions = parseRegions(regionsFile);

// Generate SQL
let sql = `-- ============================================================
-- Migration 00012: Seed Regions & Resorts
-- ============================================================
-- Inserts all platform regions and resorts into Supabase.
-- Adds legacy_id column for backward compatibility with URL routes.

-- Add legacy_id column for mapping old string IDs to UUIDs
ALTER TABLE public.resorts ADD COLUMN IF NOT EXISTS legacy_id text;
CREATE INDEX IF NOT EXISTS idx_resorts_legacy_id ON public.resorts(legacy_id);

-- Also add legacy_id to regions
ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS legacy_id text;

-- ── Seed Regions ────────────────────────────────────────────
`;

for (const r of regions) {
  sql += `INSERT INTO public.regions (name, country, description, legacy_id)
  VALUES (${esc(r.name)}, ${esc(r.country)}, ${esc(r.description)}, ${esc(r.id)})
  ON CONFLICT DO NOTHING;\n\n`;
}

sql += `-- ── Seed Resorts ────────────────────────────────────────────\n`;

for (const r of resorts) {
  sql += `INSERT INTO public.resorts (
  legacy_id, name, region_id, country, description, latitude, longitude,
  state_province, nearest_town, website, banner_image_url,
  skiable_terrain_ha, num_runs, runs_green, runs_blue, runs_black, runs_double_black,
  vertical_drop_m, base_elevation_m, summit_elevation_m, num_lifts, lift_types,
  snowfall_avg_cm, season_start, season_end,
  main_employers, common_jobs, estimated_seasonal_staff, languages_required,
  visa_requirements, recruitment_timeline,
  staff_housing_available, staff_housing_capacity, staff_housing_avg_rent,
  cost_of_living_weekly, public_transport, staff_perks,
  apres_scene, outdoor_activities, healthcare_access, shops_and_services,
  international_community_size,
  avg_winter_temp_min_c, avg_winter_temp_max_c, snow_reliability, artificial_snow_coverage_pct
) VALUES (
  ${esc(r.id)}, ${esc(r.name)},
  (SELECT id FROM public.regions WHERE legacy_id = ${esc(r.region_id)} LIMIT 1),
  ${esc(r.country)}, ${esc(r.description)}, ${escNum(r.latitude)}, ${escNum(r.longitude)},
  ${esc(r.state_province || null)}, ${esc(r.nearest_town || null)}, ${esc(r.website || null)}, ${esc(r.banner_image_url || null)},
  ${escNum(r.skiable_terrain_ha)}, ${escNum(r.num_runs)}, ${escNum(r.runs_green)}, ${escNum(r.runs_blue)}, ${escNum(r.runs_black)}, ${escNum(r.runs_double_black)},
  ${escNum(r.vertical_drop_m)}, ${escNum(r.base_elevation_m)}, ${escNum(r.summit_elevation_m)}, ${escNum(r.num_lifts)}, ${escJson(r.lift_types)},
  ${escNum(r.snowfall_avg_cm)}, ${r.season_start ? esc(r.season_start) : "NULL"}, ${r.season_end ? esc(r.season_end) : "NULL"},
  ${escArr(r.main_employers)}, ${escArr(r.common_jobs)}, ${esc(r.estimated_seasonal_staff || null)}, ${escArr(r.languages_required)},
  ${esc(r.visa_requirements || null)}, ${esc(r.recruitment_timeline || null)},
  ${escBool(r.staff_housing_available)}, ${escNum(r.staff_housing_capacity)}, ${esc(r.staff_housing_avg_rent || null)},
  ${esc(r.cost_of_living_weekly || null)}, ${esc(r.public_transport || null)}, ${escArr(r.staff_perks)},
  ${esc(r.apres_scene || null)}, ${escArr(r.outdoor_activities)}, ${esc(r.healthcare_access || null)}, ${esc(r.shops_and_services || null)},
  ${esc(r.international_community_size || null)},
  ${escNum(r.avg_winter_temp_min_c)}, ${escNum(r.avg_winter_temp_max_c)}, ${esc(r.snow_reliability || null)}, ${escNum(r.artificial_snow_coverage_pct)}
) ON CONFLICT DO NOTHING;\n\n`;
}

// Add helper to update business_resorts to use UUID resort IDs
sql += `-- ── Update business_resorts to support UUID resort references ──
-- Change resort_id column type from text to uuid if needed
-- (keeping as text for now since it may have existing data)

-- Create a view for easy resort lookup by legacy_id
CREATE OR REPLACE VIEW public.resort_lookup AS
SELECT id, legacy_id, name, country FROM public.resorts;
`;

console.log(sql);

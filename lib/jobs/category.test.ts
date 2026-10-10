/**
 * `job_posts.category` was empty on 354 of 355 open listings — the single
 * value present was "Maintenance". Nothing wrote it for imported listings,
 * and imports are 349 of the board.
 *
 * It looked fine on the site, which is why it lasted: /jobs maps a blank to
 * "Other" in its view model, so the category filter rendered and offered two
 * options for 355 jobs. A worker reads that as "there are no chef jobs here".
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { categoryForTitle, JOB_CATEGORIES } from "./category";

test("the obvious roles land where a worker would look for them", () => {
  const cases: Array<[string, string]> = [
    ["Line Cook", "Food & Beverage"],
    ["Bartender", "Food & Beverage"],
    ["Pizza Shop Team Member", "Food & Beverage"],
    ["Housekeeper", "Housekeeping"],
    ["Linen Runner", "Housekeeping"],
    ["Ski Instructor", "Ski Instruction"],
    ["Ski / Snowboard Instructor", "Ski Instruction"],
    ["Lift Operator", "Lift Operations"],
    ["Retail Sales Assistant", "Retail"],
    ["Carpentry Apprentice", "Maintenance"],
    ["HVAC Technician", "Maintenance"],
    ["Snow Plow Truck Operator", "Resort Operations"],
    ["Front Desk Agent", "Hospitality"],
    ["Operations Manager", "Resort Operations"],
    ["Night Manager", "Administration"],
    ["Content Creator", "Entertainment"],
  ];
  for (const [title, expected] of cases) {
    assert.equal(categoryForTitle(title), expected, `"${title}"`);
  }
});

/**
 * ⚠️ ORDER BUGS, both found by reading the ASSIGNMENTS rather than the rules.
 * Maintenance's `technician` was swallowing "Aesthetician/Nail Technician",
 * and Ski Instruction's bare `instructor|coach` was swallowing Pilates, swim,
 * skating and bike coaches — none of which involves a mountain.
 */
test("a wellness role is not maintenance, and a Pilates coach is not a ski instructor", () => {
  assert.equal(categoryForTitle("Aesthetician/Nail Technician"), "Hospitality");
  assert.equal(categoryForTitle("Nail Technician"), "Hospitality");
  assert.equal(categoryForTitle("Reformer Pilates Instructor"), "Hospitality");
  assert.equal(categoryForTitle("Head Swim Coach"), "Hospitality");
  assert.equal(categoryForTitle("Skating Coach"), "Hospitality");
  assert.equal(categoryForTitle("Bike Coach"), "Hospitality");
  // ...but the wellness rule must not reach past coaching into the workshop.
  assert.equal(categoryForTitle("Bike Mechanic"), "Maintenance");
});

/**
 * ⚠️ A THIRD ROUND OF ORDER BUGS, found the same way as the first two — by
 * reading what real titles were ASSIGNED, not by reading the rules. These
 * matter more than they look: `occupationalCategory` is published in the
 * JobPosting schema on ~98% of the board, so a wrong bin is a wrong claim to
 * Google rather than just an odd filter result.
 */
test("a machinery lift is not a chairlift", () => {
  // "Man-Lift Operator" was the ONLY job in Lift Operations — a category made
  // to look populated by an aerial work platform.
  assert.equal(categoryForTitle("Man-Lift Operator"), "Maintenance");
  assert.equal(categoryForTitle("Forklift Operator"), "Maintenance");
  assert.equal(categoryForTitle("Scissor Lift Operator"), "Maintenance");
  // ...and the real thing still lands in Lift Operations.
  assert.equal(categoryForTitle("Lift Operator"), "Lift Operations");
  assert.equal(categoryForTitle("Lift Attendant"), "Lift Operations");
});

test("a ski school role is instruction, and a restaurant floor is F&B", () => {
  // Both fell to Administration via `manager`/`supervisor`: the slash in
  // "Ski/Snowboard School" means "ski school" never appears as contiguous
  // text, and "floor supervisor" did not match the "floor staff" rule that
  // already caught its colleagues.
  assert.equal(categoryForTitle("Ski/Snowboard School Manager"), "Ski Instruction");
  assert.equal(categoryForTitle("Snowboard School Manager"), "Ski Instruction");
  assert.equal(categoryForTitle("Floor Supervisor"), "Food & Beverage");
  assert.equal(categoryForTitle("Floor Staff"), "Food & Beverage");
  // The seniority word still wins where the job has no other signal.
  assert.equal(categoryForTitle("Night Manager"), "Administration");
});

test("nothing it cannot read becomes a category", () => {
  // NULL means "could not classify", which is a rule worth adding. "Other"
  // would mean "classified as miscellaneous", which is not. Collapsing the
  // two loses the only signal that says which.
  for (const t of ["Team Member", "Support Staff", "Dental Assistant", "", "   ", null, undefined]) {
    assert.equal(categoryForTitle(t), null, JSON.stringify(t));
  }
});

test("every category it can return is one the post-job form offers", () => {
  const titles = [
    "Line Cook", "Housekeeper", "Ski Instructor", "Lift Operator", "Cashier",
    "Carpenter", "Snow Plow Truck Operator", "Front Desk Agent", "Night Manager",
    "Content Creator", "Nail Technician",
  ];
  for (const t of titles) {
    const c = categoryForTitle(t);
    assert.ok(c && (JOB_CATEGORIES as readonly string[]).includes(c), `${t} -> ${c}`);
  }
});

test("the category list lives in one place", () => {
  // It was a private const in the business post-job form, which is how the
  // importer came to write nothing at all: there was nothing to import.
  const form = readFileSync(
    join(process.cwd(), "app/(business)/business/post-job/page.tsx"),
    "utf8"
  );
  assert.ok(
    !/const JOB_CATEGORIES\s*=\s*\[/.test(form),
    "post-job redeclares JOB_CATEGORIES — import it from lib/jobs/category.ts"
  );
});

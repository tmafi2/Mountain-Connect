/**
 * scripts/fb-monitor/import.ts
 *
 *   npm run fb:import -- --file <extraction.json>            # dry run
 *   npm run fb:import -- --file <extraction.json> --commit    # actually write
 *
 * The last step: takes an extraction result file and routes each post to where
 * it belongs.
 *
 *   hiring        -> POST /api/admin/job-listings/import, landing as
 *                    draft + pending_approval so it appears in /admin/jobs
 *   seeking_work  -> lead_posts, via the same FNV-1a dedup key the
 *                    lead-monitor CLI uses
 *   other         -> discarded
 *
 * DRY RUN BY DEFAULT. Writing to production needs --commit, matching the house
 * convention in scripts/send-paid-plans-announcement.ts.
 *
 * RESORT MATCHING. The extractor returns a resort as a human would write it
 * ("Niseko", "Banff"); the resorts table has "Niseko United" and
 * "Mount Norquay". The import endpoint does an exact ilike and 400s on a
 * miss, so unmatched names would silently cost us listings. Matching therefore
 * happens here, against the live table, in three passes: exact, then a small
 * alias table for the cases we have actually seen, then token overlap. A post
 * whose resort cannot be matched is REPORTED, not guessed at — a listing filed
 * under the wrong mountain is worse than one held back for you to place.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO YET. The endpoint requires businessEmail
 * and uses it as the business identity key, so hiring posts that only offer
 * "DM me" or an Instagram handle are held back rather than imported under a
 * synthesised address. They are listed in the summary so the gap is visible
 * rather than silent.
 */
import { readFileSync } from "node:fs";

import { buildDedupKey, fnv1a64Hex, utf8Bytes } from "../lead-monitor/dedup-key";
import {
  loadEnvFile,
  normaliseRegion,
  restSelectAll,
  restUpsertIgnoreDuplicates,
  resolveTarget,
  type Region,
  type SupabaseTarget,
} from "../lead-monitor/common";
import type { ExtractedPost } from "./schema";

type ExtractionRow = {
  ok: boolean;
  post: { id: string; group: string; author: string | null; text: string; permalink: string | null; collectedAt?: string };
  extracted?: ExtractedPost;
};

type Resort = { id: string; name: string; country: string };

const SOURCE_LABEL = "Facebook";

/**
 * Pull a single usable address out of whatever the model put in
 * contactValue. Returns null when there is nothing address-shaped in there.
 */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
function extractEmail(raw: string): string | null {
  const match = raw.match(EMAIL_RE);
  return match ? match[0].toLowerCase() : null;
}

/** Cases seen in real posts where the common name differs from the table. */
const RESORT_ALIASES: Readonly<Record<string, string>> = {
  niseko: "Niseko United",
  "niseko grand hirafu": "Niseko United",
  hirafu: "Niseko United",
  // "Banff / Lake Louise" was renamed to Mount Norquay in migration 00091 —
  // Banff is a town, not a resort, and that record was the three Banff ski
  // areas summed. Both aliases would now 400 on the endpoint's exact ilike.
  //
  // Lake Louise gains by the split: it now points at its own record instead
  // of a composite. A bare "Banff" is a genuine judgement call — the town has
  // three ski areas — and goes to Norquay, which is the hill in Banff itself
  // and the same row the alias resolved to before.
  banff: "Mount Norquay",
  "mt norquay": "Mount Norquay",
  "mount norquay": "Mount Norquay",
  norquay: "Mount Norquay",
  "lake louise": "Lake Louise Ski Resort",
  "sunshine village": "Sunshine Village",
  "revelstoke mountain resort": "Revelstoke",
  whistler: "Whistler Blackcomb",
  hakuba: "Hakuba Valley",
  nozawa: "Nozawa Onsen",
  "sun peaks": "Sun Peaks Resort",
  "big white": "Big White Ski Resort",
  "silver star": "Silver Star Mountain Resort",
};

function fail(message: string): never {
  process.stderr.write(`\nfb-import: ${message}\n\n`);
  process.exit(1);
}

function note(message: string): void {
  process.stderr.write(`${message}\n`);
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Exact, then alias, then token overlap. Returns null rather than guessing. */
function matchResort(name: string | null, resorts: readonly Resort[]): Resort | null {
  if (!name) return null;
  const target = normalise(name);

  const exact = resorts.find((r) => normalise(r.name) === target);
  if (exact) return exact;

  const aliased = RESORT_ALIASES[target];
  if (aliased) {
    const hit = resorts.find((r) => normalise(r.name) === normalise(aliased));
    if (hit) return hit;
  }

  // Token overlap: every word of the shorter name appears in the longer.
  // "Revelstoke" vs "Revelstoke Mountain Resort" matches; "Big Sky" vs
  // "Big White Ski Resort" does not, because "sky" is absent.
  const targetWords = target.split(" ").filter((w) => w.length > 2);
  if (targetWords.length === 0) return null;

  const candidates = resorts.filter((r) => {
    const words = normalise(r.name).split(/[\s/]+/).filter((w) => w.length > 2);
    const shorter = targetWords.length <= words.length ? targetWords : words;
    const longer = shorter === targetWords ? words : targetWords;
    return shorter.every((w) => longer.includes(w));
  });

  // Ambiguity is a reason to stop, not to pick the first one.
  return candidates.length === 1 ? candidates[0] : null;
}

/**
 * Work out which market a post belongs to.
 *
 * Resort country first, since that is authoritative. Failing that, the group
 * name — a post in "Ski Resort Jobs Canada" is a Canadian lead whether or not
 * the author happened to name a mountain, and requiring a resort threw away
 * 7 of 10 real leads on the first run.
 */
/**
 * Requirements text, with the visa detail folded in.
 *
 * job_posts.visa_sponsorship is a boolean, so "J-1, H-2B" would be reduced to
 * `true` and the useful part thrown away. Keeping it in the prose means the
 * flag stays filterable and the specifics survive for whoever reads the ad.
 */
function buildRequirements(role: ExtractedPost["roles"][number]): string {
  const parts: string[] = [];
  if (role.requirements) parts.push(role.requirements);
  if (role.visaSponsorship) parts.push(`Visa: ${role.visaSponsorship}`);
  return parts.join(" — ");
}

function regionFor(resort: Resort | null, groupName: string): Region | null {
  if (resort) {
    const fromResort = normaliseRegion(resort.country);
    if (fromResort) return fromResort;
  }

  const haystack = groupName.toLowerCase();
  for (const [needle, region] of [
    ["canada", "Canada"],
    ["japan", "Japan"],
    ["niseko", "Japan"],
    ["hakuba", "Japan"],
    ["usa", "USA"],
    ["united states", "USA"],
    ["america", "USA"],
    ["australia", "Australia"],
  ] as const) {
    if (haystack.includes(needle)) return normaliseRegion(region);
  }

  return null;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let file: string | null = null;
  let commit = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--file") file = argv[++i];
    else if (argv[i] === "--commit") commit = true;
    else if (argv[i] === "--help") {
      process.stderr.write(`\nUsage: npm run fb:import -- --file <extraction.json> [--commit]\n\n`);
      return;
    }
  }
  if (!file) fail(`--file is required (an extraction result file from fb:extract).`);

  loadEnvFile(".env.local");
  const importKey = process.env.IMPORT_API_KEY?.trim();
  if (!importKey) fail(`IMPORT_API_KEY missing from .env.local — needed to post listings.`);
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.mountainconnects.com").replace(/\/+$/, "");

  const target: SupabaseTarget = resolveTarget();

  let rows: ExtractionRow[];
  try {
    rows = JSON.parse(readFileSync(file, "utf8")) as ExtractionRow[];
  } catch (error) {
    fail(`could not read ${file}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const resorts = await restSelectAll<Resort>(target, "resorts", "select=id,name,country");
  note(`\nresorts loaded   ${resorts.length}`);
  note(`mode             ${commit ? "COMMIT — will write" : "DRY RUN — writes nothing"}`);
  note(`endpoint         ${baseUrl}/api/admin/job-listings/import\n`);

  const ok = rows.filter((r) => r.ok && r.extracted);

  // --- worker leads ---------------------------------------------------------
  const leadRows: Record<string, unknown>[] = [];
  const leadSkips: string[] = [];

  for (const row of ok) {
    const e = row.extracted!;
    if (e.classification !== "seeking_work") continue;

    const resort = matchResort(e.resortName, resorts);
    const region = regionFor(resort, row.post.group);
    if (!region) {
      leadSkips.push(`${row.post.id}: no region — resort ${JSON.stringify(e.resortName)} unmatched and group name gives no country`);
      continue;
    }

    leadRows.push({
      dedup_key: buildDedupKey(row.post.group, row.post.author, row.post.text),
      region,
      source_group: row.post.group,
      post_type: "Seeking Work",
      role_category: e.roles[0]?.roleCategory ?? null,
      poster_name: row.post.author,
      post_content: row.post.text.slice(0, 500),
      post_url: row.post.permalink,
      availability: null,
      language: e.postLanguage || "en",
      date_posted: null,
    });
  }

  // --- hiring listings ------------------------------------------------------
  type Pending = { row: ExtractionRow; e: ExtractedPost; resort: Resort; payload: Record<string, unknown> };
  const pending: Pending[] = [];
  const held: string[] = [];

  for (const row of ok) {
    const e = row.extracted!;
    if (e.classification !== "hiring") continue;

    const label = `${row.post.id} (${e.businessName ?? "unnamed"})`;

    if (!e.businessName) { held.push(`${label}: no business name`); continue; }
    if (e.contactMethod !== "email" || !e.contactValue) {
      held.push(`${label}: contact is ${e.contactMethod} — endpoint requires an email`);
      continue;
    }
    // contactMethod="email" does not guarantee contactValue is only an
    // address. The model returns what the post said, and posts say things
    // like "canrocent@gmail.com; text 2042289737". Storing that verbatim
    // gives the business an unmailable address and every claim email to
    // them bounces, so take the first real address and drop the rest.
    const businessEmail = extractEmail(e.contactValue);
    if (!businessEmail) {
      held.push(`${label}: contact ${JSON.stringify(e.contactValue)} has no usable email address`);
      continue;
    }
    const resort = matchResort(e.resortName, resorts);
    if (!resort) { held.push(`${label}: resort ${JSON.stringify(e.resortName)} did not match`); continue; }
    if (e.roles.length === 0) { held.push(`${label}: no roles extracted`); continue; }

    for (const role of e.roles) {
      // One listing per role, so each is discoverable by category and alert.
      //
      // Hash the FULL tuple rather than calling buildDedupKey: that function
      // truncates its text component to 120 code points, which is correct for
      // lead dedup and wrong here. An earlier version passed
      // `${text}|${jobTitle}|${index}` as its text argument, so truncation ate
      // the discriminator and every role in a post produced an identical id.
      // The endpoint then upserted them all onto one row, turning 23 listings
      // into 8 while honestly reporting 23 successes.
      // IDENTITY OF A LISTING: group + business + job title. Nothing else.
      //
      // Two earlier attempts got this wrong in opposite directions. Including
      // the post text truncated to 120 chars collapsed every role in a post
      // onto one row. Including the full text AND the role's array index went
      // the other way and created duplicates on re-run, because the model does
      // not guarantee role ordering and the scraped text shifts slightly
      // between passes as "See more" expands — either variation mints a new id
      // for a listing that already exists.
      //
      // A scheduled job runs this three times a day, so stability across runs
      // matters more than distinguishing two same-titled roles at one business,
      // which is vanishingly rare and harmless to merge.
      const externalId = fnv1a64Hex(
        utf8Bytes([row.post.group, e.businessName, role.jobTitle].join(" ~|~ ").toLowerCase()),
      );

      pending.push({
        row,
        e,
        resort,
        payload: {
          notionId: `fb-${externalId}`,
          businessName: e.businessName,
          jobTitle: role.jobTitle,
          description: row.post.text.slice(0, 5000),
          businessEmail,
          applicationEmail: businessEmail,
          source: SOURCE_LABEL,
          sourceUrl: row.post.permalink ?? "",
          resortName: resort.name,
          country: resort.country,
          location: e.townName ?? "",

          // Everything the extractor already worked out. Omitted from an
          // earlier version, which is why perks and requirements arrived empty
          // on listings whose posts plainly stated them.
          requirements: buildRequirements(role),
          positionType: role.employmentType ?? "",
          payAmount: role.payAmount ?? "",
          payCurrency: role.payCurrency ?? "",
          // pay_amount alone loses "per what", so keep a readable form too.
          salaryRange:
            role.payAmount !== null && role.payPeriod
              ? `${role.payCurrency ?? ""} ${role.payAmount}/${role.payPeriod}`.trim()
              : "",
          positionsAvailable: role.positionsAvailable ?? "",
          accommodationIncluded: role.accommodationIncluded,
          accommodationType: role.accommodationType ?? "",
          skiPassIncluded: role.skiPassIncluded,
          mealPerks: role.mealPerks,
          // The column is a boolean; the extractor returns which programmes
          // were named. Record the flag here and keep the detail in
          // requirements rather than losing it.
          visaSponsorship: role.visaSponsorship !== null ? true : undefined,
          startDate: role.startDate ?? "",
          endDate: role.endDate ?? "",
        },
      });
    }
  }

  // --- businesses already on MC --------------------------------------------
  const emails = [...new Set(pending.map((p) => String(p.payload.businessEmail).toLowerCase()))];
  const claimed = new Set<string>();
  if (emails.length > 0) {
    const existing = await restSelectAll<{ email: string; is_claimed: boolean }>(
      target,
      "business_profiles",
      // encodeURIComponent is not decoration. These values come from a model
      // reading Facebook posts, and a ";" inside one truncated this query at
      // exactly the character the server stopped parsing on, failing a whole
      // canada run after collect and extract had already succeeded. Quotes
      // inside a value are backslash-escaped first, which is what PostgREST
      // expects inside a double-quoted `in.()` element.
      `select=email,is_claimed&email=` +
        encodeURIComponent(
          `in.(${emails.map((e) => `"${e.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")})`,
        ),
    );
    for (const b of existing) if (b.is_claimed) claimed.add(b.email.toLowerCase());
  }

  const toImport = pending.filter((p) => !claimed.has(String(p.payload.businessEmail).toLowerCase()));
  const skippedClaimed = pending.length - toImport.length;

  // --- report ---------------------------------------------------------------
  note(`listings ready   ${toImport.length}`);
  for (const p of toImport) {
    note(`  ${p.payload.businessName} — ${p.payload.jobTitle} @ ${p.resort.name}`);
  }
  if (skippedClaimed > 0) note(`\nskipped (already on MC)  ${skippedClaimed}`);
  if (held.length > 0) {
    note(`\nheld back        ${held.length}`);
    for (const h of held) note(`  ${h}`);
  }
  note(`\nworker leads     ${leadRows.length}`);
  if (leadSkips.length > 0) {
    note(`leads skipped    ${leadSkips.length}`);
    for (const s of leadSkips) note(`  ${s}`);
  }

  if (!commit) {
    note(`\nDry run — nothing written. Re-run with --commit to import.\n`);
    return;
  }

  // --- write ----------------------------------------------------------------
  let imported = 0;
  const failures: string[] = [];

  for (const p of toImport) {
    try {
      const response = await fetch(`${baseUrl}/api/admin/job-listings/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${importKey}` },
        body: JSON.stringify(p.payload),
      });
      if (!response.ok) {
        failures.push(`${p.payload.businessName} / ${p.payload.jobTitle}: ${response.status} ${(await response.text()).slice(0, 160)}`);
        continue;
      }
      imported += 1;
    } catch (error) {
      failures.push(`${p.payload.businessName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  let leadsInserted = 0;
  if (leadRows.length > 0) {
    const returned = await restUpsertIgnoreDuplicates<Record<string, unknown>, { id: string }>(
      target,
      "lead_posts",
      "dedup_key",
      leadRows,
    );
    leadsInserted = returned.length;
  }

  note(`\nimported         ${imported}/${toImport.length} listing(s)`);
  note(`leads inserted   ${leadsInserted}/${leadRows.length} (rest already stored)`);
  if (failures.length > 0) {
    note(`\nfailures         ${failures.length}`);
    for (const f of failures) note(`  ${f}`);
  }
  note(`\nReview at ${baseUrl}/admin/jobs (Pending filter)\n`);
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});

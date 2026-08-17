/**
 * scripts/lead-monitor/fetch-keys.ts
 *
 *   npx tsx scripts/lead-monitor/fetch-keys.ts --region Canada
 *   npx tsx scripts/lead-monitor/fetch-keys.ts --region Japan --days 30
 *
 * Prints the dedup_keys we already hold for one region, as a JSON array, so
 * the browser collector can skip posts it has already seen.
 *
 * stdout is ONLY the array. Counts, warnings and progress go to stderr, so
 * this is safe to pipe:
 *
 *   npx tsx scripts/lead-monitor/fetch-keys.ts --region Canada > keys.json
 *   npx tsx scripts/lead-monitor/fetch-keys.ts --region Canada | pbcopy
 */
import {
  fail,
  intFlag,
  normaliseRegion,
  note,
  parseArgs,
  REGIONS,
  restSelectAll,
  resolveTarget,
  stringFlag,
} from "./common";

const USAGE = `
Usage: npx tsx scripts/lead-monitor/fetch-keys.ts --region <region> [--days 90]

  --region  Canada | USA | Japan | Australia   (required)
  --days    look back this many days           (default 90)

stdout: a JSON array of dedup_key strings, nothing else.
stderr: diagnostics.
`.trimStart();

const KNOWN_FLAGS = new Set(["region", "days", "help"]);

async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2));

  if (flags.has("help")) {
    process.stderr.write(USAGE);
    return;
  }

  for (const name of flags.keys()) {
    if (!KNOWN_FLAGS.has(name)) {
      fail(`Unknown flag --${name}.\n\n${USAGE}`);
    }
  }

  const rawRegion = stringFlag(flags, "region");
  if (!rawRegion) fail(`--region is required.\n\n${USAGE}`);

  const region = normaliseRegion(rawRegion);
  if (!region) {
    fail(
      `Unknown region ${JSON.stringify(rawRegion)}. Expected one of: ${REGIONS.join(", ")}.`,
    );
  }

  const days = intFlag(flags, "days", 90);
  const target = resolveTarget();

  // The window is on created_at — when WE recorded the lead — not on
  // date_posted, which is nullable and reflects when the author wrote it.
  // Dedup cares about "have we stored this recently", and created_at is the
  // leading-edge column of the (region, created_at desc) index.
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  note(`region=${region} days=${days} cutoff=${cutoff}`);

  // A deterministic total order matters: offset paging over an unordered
  // result set can repeat or skip rows between requests. created_at can tie,
  // so id breaks it.
  const query =
    `select=dedup_key` +
    `&region=eq.${encodeURIComponent(region)}` +
    `&created_at=gte.${encodeURIComponent(cutoff)}` +
    `&order=created_at.desc,id.desc`;

  const rows = await restSelectAll<{ dedup_key: string }>(
    target,
    "lead_posts",
    query,
  );

  const keys = rows.map((row) => row.dedup_key);

  note(`${keys.length} key${keys.length === 1 ? "" : "s"} for ${region}`);

  process.stdout.write(`${JSON.stringify(keys)}\n`);
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});

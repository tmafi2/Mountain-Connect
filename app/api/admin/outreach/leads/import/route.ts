import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { rateLimit } from "@/lib/rate-limit";

interface IncomingRow {
  email?: string;
  business_name?: string;
  resort_name?: string | null;
  town_name?: string | null;
  notes?: string | null;
  /** Original row number from the CSV (1-indexed, after header) so the
   *  UI can highlight the right row in the preview table. */
  row?: number;
}

interface RowResult {
  row: number;
  email: string;
  business_name: string;
  status: "created" | "skipped" | "error";
  message?: string;
  leadId?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/admin/outreach/leads/import
 * Body: { rows: IncomingRow[], dryRun?: boolean }
 *
 * Bulk-imports outreach leads from a parsed CSV. The client parses the
 * file itself and POSTs structured rows so we can return per-row
 * results for a preview-then-confirm flow.
 *
 * For each row:
 *   - Validates email + business_name shape
 *   - Resolves resort_name and/or town_name (case-insensitive) to IDs
 *   - Dedupes by lower(email) against existing outreach_leads
 *   - Inserts when new; skips silently when a duplicate exists
 *
 * When dryRun=true, returns the would-create / would-skip plan without
 * touching the database. The UI uses dryRun for the preview table.
 */
export async function POST(request: Request) {
  const rateLimited = await rateLimit(request, { identifier: "admin" });
  if (rateLimited) return rateLimited;

  const auth = await requireAdmin();
  if (auth instanceof NextResponse) return auth;
  const { admin, user } = auth;

  let body: { rows?: IncomingRow[]; dryRun?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rows = Array.isArray(body.rows) ? body.rows : [];
  const dryRun = !!body.dryRun;
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows supplied" }, { status: 400 });
  }
  if (rows.length > 1000) {
    return NextResponse.json(
      { error: `Too many rows (${rows.length}). Cap is 1000 per import.` },
      { status: 400 }
    );
  }

  // Build lookup maps for resorts and towns once so per-row resolution
  // is O(1). Keep names lowercased for case-insensitive matching.
  const [{ data: resorts }, { data: towns }, { data: existingLeads }] = await Promise.all([
    admin.from("resorts").select("id, name"),
    admin.from("nearby_towns").select("id, name"),
    admin.from("outreach_leads").select("id, email"),
  ]);
  const resortByName = new Map<string, string>();
  for (const r of resorts ?? []) resortByName.set((r.name as string).toLowerCase(), r.id as string);
  const townByName = new Map<string, string>();
  for (const t of towns ?? []) townByName.set((t.name as string).toLowerCase(), t.id as string);
  const existingEmails = new Set(
    (existingLeads ?? []).map((l) => (l.email as string).toLowerCase())
  );

  // Track emails we've seen earlier in THIS import too so an in-batch
  // duplicate is also flagged as skipped.
  const seenInBatch = new Set<string>();
  const results: RowResult[] = [];
  const toInsert: {
    email: string;
    business_name: string;
    resort_id: string | null;
    town_id: string | null;
    notes: string | null;
    added_by: string;
    /** Index back into `results` so we can stamp the leadId after insert. */
    resultIdx: number;
  }[] = [];

  rows.forEach((raw, idx) => {
    const rowNum = raw.row ?? idx + 1;
    const email = raw.email?.trim().toLowerCase() ?? "";
    const businessName = raw.business_name?.trim() ?? "";

    if (!email) {
      results.push({
        row: rowNum,
        email,
        business_name: businessName,
        status: "error",
        message: "Missing email",
      });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      results.push({
        row: rowNum,
        email,
        business_name: businessName,
        status: "error",
        message: "Invalid email",
      });
      return;
    }
    if (!businessName) {
      results.push({
        row: rowNum,
        email,
        business_name: businessName,
        status: "error",
        message: "Missing business_name",
      });
      return;
    }
    if (email.length > 200 || businessName.length > 200) {
      results.push({
        row: rowNum,
        email,
        business_name: businessName,
        status: "error",
        message: "Email or business_name exceeds 200 chars",
      });
      return;
    }

    if (existingEmails.has(email) || seenInBatch.has(email)) {
      results.push({
        row: rowNum,
        email,
        business_name: businessName,
        status: "skipped",
        message: existingEmails.has(email) ? "Already exists in DB" : "Duplicate within file",
      });
      return;
    }
    seenInBatch.add(email);

    let resortId: string | null = null;
    if (raw.resort_name?.trim()) {
      const lookup = resortByName.get(raw.resort_name.trim().toLowerCase());
      if (!lookup) {
        results.push({
          row: rowNum,
          email,
          business_name: businessName,
          status: "error",
          message: `Unknown resort_name "${raw.resort_name.trim()}"`,
        });
        return;
      }
      resortId = lookup;
    }

    let townId: string | null = null;
    if (raw.town_name?.trim()) {
      const lookup = townByName.get(raw.town_name.trim().toLowerCase());
      if (!lookup) {
        results.push({
          row: rowNum,
          email,
          business_name: businessName,
          status: "error",
          message: `Unknown town_name "${raw.town_name.trim()}"`,
        });
        return;
      }
      townId = lookup;
    }

    const placeholderIdx = results.length;
    results.push({
      row: rowNum,
      email,
      business_name: businessName,
      status: "created", // tentative — flipped to error later if insert fails
    });
    toInsert.push({
      email,
      business_name: businessName,
      resort_id: resortId,
      town_id: townId,
      notes: raw.notes?.trim() || null,
      added_by: user.id,
      resultIdx: placeholderIdx,
    });
  });

  // Compute summary upfront — accurate for dryRun and for real runs
  // (real runs only flip individual rows to error if their insert fails).
  const summary = {
    total: rows.length,
    created: results.filter((r) => r.status === "created").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errored: results.filter((r) => r.status === "error").length,
  };

  if (dryRun || toInsert.length === 0) {
    return NextResponse.json({ dryRun, summary, results });
  }

  // One bulk insert for all the valid rows. We re-stamp `created` →
  // `error` for any rows the DB rejects (e.g. unique constraint race).
  const { data: inserted, error: insertErr } = await admin
    .from("outreach_leads")
    .insert(
      toInsert.map((r) => ({
        email: r.email,
        business_name: r.business_name,
        resort_id: r.resort_id,
        town_id: r.town_id,
        notes: r.notes,
        added_by: r.added_by,
      }))
    )
    .select("id, email");

  if (insertErr) {
    // Whole batch failed — mark them all as errored so the admin sees why.
    for (const r of toInsert) {
      results[r.resultIdx] = {
        ...results[r.resultIdx],
        status: "error",
        message: insertErr.message,
      };
    }
    summary.created = 0;
    summary.errored = results.filter((r) => r.status === "error").length;
    return NextResponse.json({ dryRun: false, summary, results }, { status: 500 });
  }

  // Map insert results back to the rows by email so we can attach leadIds.
  const insertedByEmail = new Map<string, string>();
  for (const row of inserted ?? []) {
    insertedByEmail.set((row.email as string).toLowerCase(), row.id as string);
  }
  for (const r of toInsert) {
    const id = insertedByEmail.get(r.email);
    if (id) results[r.resultIdx].leadId = id;
  }

  return NextResponse.json({ dryRun: false, summary, results });
}

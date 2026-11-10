"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { coverLetterExcerpt } from "@/lib/email/cover-letter-excerpt";

/**
 * What the claim cadence is about to send, and to whom.
 *
 * Two things email unclaimed businesses on their own: the apply route, the
 * moment an application lands, and the dormancy cron at 09:00 UTC daily,
 * which catches anyone the live trigger missed. Both are one-shot per
 * business — `first_applicant_email_sent_at` and `eoi_nudge_sent_at` are
 * stamped on send and never cleared — so every business is somewhere on a
 * short track, and nothing in the admin showed where.
 *
 * This page is that track. It is READ-ONLY on purpose: it sends nothing,
 * stamps nothing and queues nothing. Both senders already exist and keep
 * their own ledgers; what was missing was the ability to look first.
 *
 * ⚠️ IT RECOMPUTES WHAT THE CRON WOULD DO, it does not read a queue, because
 * there is no queue — the cadence derives everything from counts and two
 * timestamps each run. So the thresholds here (1 and 5) must stay in step
 * with EOI_NUDGE_THRESHOLD in app/api/cron/unclaimed-dormancy-sweep/route.ts
 * and app/api/jobs/[id]/express-interest/route.ts. If those change and this
 * does not, the page lies confidently.
 *
 * ⚠️ EVERY READ IS PAGED. This project caps a select at 1000 rows with no
 * error (see lib/supabase/fetch-all.ts). Applications and job posts are both
 * heading for that line, and a short read here would quietly under-report
 * what is about to be sent — which is the one thing the page exists to show.
 */

/** Must match EOI_NUDGE_THRESHOLD in both send paths. */
const THRESHOLD = 5;

type Stage = "queued-threshold" | "queued-first" | "waiting" | "blocked" | "done";

interface Row {
  id: string;
  name: string;
  country: string;
  email: string | null;
  claimToken: string | null;
  apps: number;
  quote: string | null;
  sentFirst: boolean;
  sentThreshold: boolean;
  stage: Stage;
  reason: string;
}

interface Preview {
  subject: string;
  html: string;
  due: string;
  type: string;
  apps: number;
  hasQuote: boolean;
  canSend: boolean;
}

const STAGE_LABEL: Record<Stage, string> = {
  "queued-threshold": "Sends next run",
  "queued-first": "Sends next run",
  waiting: "Waiting",
  blocked: "Blocked",
  done: "Nothing due",
};

export default function AdminEmailPipelinePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"queued" | "waiting" | "blocked" | "all">("queued");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewFor, setPreviewFor] = useState<Row | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();

        const jobs = await fetchAllRows<Record<string, unknown>>(
          (from, to) =>
            supabase
              .from("job_posts")
              .select(
                "id, business_id, resorts(country), business_profiles!inner(id, business_name, email, is_claimed, claim_token, first_applicant_email_sent_at, eoi_nudge_sent_at)",
              )
              .eq("status", "active")
              .range(from, to),
          "email pipeline: jobs",
        );

        const biz = new Map<string, Row>();
        const jobToBiz = new Map<string, string>();
        for (const j of jobs) {
          const b = j.business_profiles as unknown as {
            id: string; business_name: string | null; email: string | null;
            is_claimed: boolean | null; claim_token: string | null;
            first_applicant_email_sent_at: string | null; eoi_nudge_sent_at: string | null;
          } | null;
          const r = j.resorts as unknown as { country: string } | null;
          if (!b) continue;
          jobToBiz.set(j.id as string, b.id);
          if (b.is_claimed) continue;
          if (!biz.has(b.id)) {
            biz.set(b.id, {
              id: b.id,
              name: b.business_name ?? "(unnamed)",
              country: r?.country ?? "—",
              email: b.email,
              claimToken: b.claim_token,
              apps: 0,
              quote: null,
              sentFirst: !!b.first_applicant_email_sent_at,
              sentThreshold: !!b.eoi_nudge_sent_at,
              stage: "done",
              reason: "",
            });
          }
        }

        const eois = await fetchAllRows<Record<string, unknown>>(
          (from, to) =>
            supabase
              .from("expressions_of_interest")
              .select("job_post_id, message, share_with_employer, created_at")
              .order("created_at", { ascending: false })
              .range(from, to),
          "email pipeline: applications",
        );
        for (const e of eois) {
          const bid = jobToBiz.get(e.job_post_id as string);
          if (!bid) continue;
          const b = biz.get(bid);
          if (!b) continue;
          b.apps++;
          if (!b.quote) {
            b.quote = coverLetterExcerpt({
              message: e.message as string | null,
              consent: e.share_with_employer as boolean | null,
            });
          }
        }

        // The same decision the cron makes, in the same order: threshold wins
        // over first-applicant when a business qualifies for both.
        const out: Row[] = [];
        for (const b of biz.values()) {
          if (b.apps === 0) {
            b.stage = "done";
            b.reason = "no applications yet";
          } else if (!b.email || !b.claimToken) {
            b.stage = "blocked";
            b.reason = !b.email ? "no email address on file" : "no claim token";
          } else if (!b.sentThreshold && b.apps >= THRESHOLD) {
            b.stage = "queued-threshold";
            b.reason = `${b.apps} applications — threshold email`;
          } else if (!b.sentFirst) {
            b.stage = "queued-first";
            b.reason = b.apps === 1 ? "first application" : `${b.apps} applications — first-applicant email`;
          } else if (!b.sentThreshold) {
            b.stage = "waiting";
            b.reason = `${THRESHOLD - b.apps} more application${THRESHOLD - b.apps === 1 ? "" : "s"} to the threshold email`;
          } else {
            b.stage = "done";
            b.reason = "both emails already sent";
          }
          out.push(b);
        }

        out.sort((a, b) => b.apps - a.apps);
        setRows(out);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts = useMemo(() => {
    const queued = rows.filter((r) => r.stage.startsWith("queued"));
    return {
      queued: queued.length,
      queuedWithQuote: queued.filter((r) => r.quote).length,
      waiting: rows.filter((r) => r.stage === "waiting").length,
      blocked: rows.filter((r) => r.stage === "blocked").length,
      unclaimed: rows.length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "queued" && !r.stage.startsWith("queued")) return false;
      if (filter === "waiting" && r.stage !== "waiting") return false;
      if (filter === "blocked" && r.stage !== "blocked") return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.country.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, search]);

  // Renders through the API rather than in the browser so the preview is
  // built by the same code the sender uses, with the same data — a preview
  // assembled separately is a second implementation that can drift.
  async function openPreview(row: Row) {
    setPreviewFor(row);
    setPreview(null);
    setPreviewing(true);
    try {
      const res = await fetch(`/api/admin/claim-pipeline/preview?businessId=${row.id}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText);
      setPreview(await res.json());
    } catch (e) {
      setPreview({
        subject: "Could not render",
        html: `<p style="font-family:system-ui;padding:24px;color:#b91c1c">${e instanceof Error ? e.message : String(e)}</p>`,
        due: "", type: "", apps: row.apps, hasQuote: false, canSend: false,
      });
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="text-2xl font-bold text-primary">Email pipeline</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/70">
        What the claim cadence will send next. The apply route emails a business the moment it
        crosses a threshold, and the dormancy cron sweeps up the rest daily at{" "}
        <strong>09:00 UTC</strong>. Each email is one-shot per business. This page sends nothing —
        it recomputes what those two would do.
      </p>

      {loading && <p className="mt-8 text-sm text-foreground/60">Reading the board…</p>}
      {error && (
        <p className="mt-8 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load: {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <Tile label="Sends next run" value={counts.queued} tone="amber"
                  note={`${counts.queuedWithQuote} carry a quote`} />
            <Tile label="Waiting" value={counts.waiting} tone="plain"
                  note="need more applications" />
            <Tile label="Blocked" value={counts.blocked} tone="red"
                  note="cannot be emailed" />
            <Tile label="Unclaimed businesses" value={counts.unclaimed} tone="plain"
                  note="with a live listing" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            {(["queued", "waiting", "blocked", "all"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition ${
                  filter === f ? "bg-primary text-white" : "bg-accent/30 text-foreground/70 hover:bg-accent/50"
                }`}
              >
                {f}
              </button>
            ))}
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business or country"
              className="ml-auto w-full max-w-xs rounded-lg border border-accent bg-white px-3 py-1.5 text-sm focus:border-secondary focus:outline-none sm:w-auto"
            />
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-accent bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-accent bg-background/60 text-left">
                  <Th>Business</Th>
                  <Th>Country</Th>
                  <Th right>Applications</Th>
                  <Th>Quote</Th>
                  <Th>Status</Th>
                  <Th>Why</Th>
                  <Th>Email</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-b border-accent/50 last:border-0">
                    <td className="px-3 py-2.5">
                      <Link href={`/business/${r.id}`} className="font-medium text-primary hover:text-secondary hover:underline">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-foreground/70">{r.country}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{r.apps}</td>
                    <td className="px-3 py-2.5">
                      {r.quote ? (
                        <span title={r.quote} className="cursor-help text-xs font-semibold text-green-700">
                          yes
                        </span>
                      ) : (
                        <span className="text-xs text-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          r.stage.startsWith("queued")
                            ? "bg-amber-100 text-amber-800"
                            : r.stage === "blocked"
                              ? "bg-red-100 text-red-700"
                              : "bg-accent/40 text-foreground/60"
                        }`}
                      >
                        {STAGE_LABEL[r.stage]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-foreground/70">{r.reason}</td>
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => openPreview(r)}
                        className="rounded-lg border border-accent px-2.5 py-1 text-xs font-semibold text-secondary transition hover:border-secondary/50 hover:bg-secondary/5"
                      >
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-sm text-foreground/50">
                      Nothing in this group.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {previewFor && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => { setPreviewFor(null); setPreview(null); }}
              />
              <div className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-3 border-b border-accent px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-primary">{previewFor.name}</p>
                    {preview && (
                      <p className="mt-0.5 text-xs text-foreground/60">
                        <span className="font-semibold">{preview.subject}</span>
                      </p>
                    )}
                    {preview?.due && (
                      <p className="mt-1 text-xs text-foreground/55">
                        {preview.due}
                        {preview.hasQuote
                          ? " · includes an applicant's words"
                          : " · no quote — reads as a count"}
                        {preview.canSend ? "" : " · cannot be emailed"}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPreviewFor(null); setPreview(null); }}
                    className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-foreground/50 hover:bg-accent/30"
                  >
                    Close
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-auto bg-[#f0f4f8]">
                  {previewing && <p className="p-6 text-sm text-foreground/60">Rendering…</p>}
                  {preview && (
                    <iframe
                      title={`Email preview for ${previewFor.name}`}
                      srcDoc={preview.html}
                      className="h-[1150px] w-full border-0"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed text-foreground/50">
            A quote is an applicant&apos;s own words, shown in the email. It only appears when the
            letter carries no name, email address, phone number or link — see
            lib/email/cover-letter-excerpt.ts. A queued business with no quote still gets its email;
            it just reads as a count rather than a person.
          </p>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, note, tone }: { label: string; value: number; note: string; tone: "amber" | "red" | "plain" }) {
  const ring =
    tone === "amber" ? "border-amber-200 bg-amber-50/60"
    : tone === "red" ? "border-red-200 bg-red-50/60"
    : "border-accent bg-white";
  return (
    <div className={`rounded-xl border p-4 ${ring}`}>
      <p className="text-2xl font-bold text-primary tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground/80">{label}</p>
      <p className="mt-0.5 text-xs text-foreground/55">{note}</p>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-foreground/50 ${right ? "text-right" : ""}`}>
      {children}
    </th>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/**
 * Every expression of interest, and — the point of the page — whether anyone
 * is on the other end to receive it.
 *
 * An EOI against an unclaimed business is a real person who asked about a job
 * and will hear nothing until that business claims its account. On 4
 * September one job seeker expressed interest in six bar roles across four
 * businesses in a single session, and every one of those businesses was
 * unclaimed. That is invisible in a plain list of rows, so it is the first
 * thing this page says.
 */

interface EoiRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  created_at: string;
  job_id: string;
  job_title: string;
  job_status: string;
  business_id: string;
  business_name: string;
  business_claimed: boolean;
  business_notified: boolean;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function AdminExpressionsOfInterestPage() {
  const [rows, setRows] = useState<EoiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyUnreachable, setOnlyUnreachable] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("expressions_of_interest")
        .select(
          "id, name, email, phone, message, created_at, job_post_id, job_posts(id, title, status, business_id)"
        )
        .order("created_at", { ascending: false });

      const eois = (data ?? []) as unknown as Array<
        Omit<EoiRow, "job_id" | "job_title" | "job_status" | "business_id" | "business_name" | "business_claimed" | "business_notified"> & {
          job_posts: { id: string; title: string; status: string; business_id: string } | null;
        }
      >;

      const bizIds = [...new Set(eois.map((e) => e.job_posts?.business_id).filter(Boolean))] as string[];
      const bizMap: Record<string, { name: string; claimed: boolean; notified: boolean }> = {};
      if (bizIds.length > 0) {
        const { data: bizes } = await supabase
          .from("business_profiles")
          .select("id, business_name, user_id, first_applicant_email_sent_at")
          .in("id", bizIds);
        for (const b of bizes ?? []) {
          bizMap[b.id as string] = {
            name: (b.business_name as string) ?? "Unknown",
            claimed: !!b.user_id,
            notified: !!b.first_applicant_email_sent_at,
          };
        }
      }

      setRows(
        eois.map((e) => {
          const jp = e.job_posts;
          const biz = jp ? bizMap[jp.business_id] : undefined;
          return {
            id: e.id,
            name: e.name,
            email: e.email,
            phone: e.phone,
            message: e.message,
            created_at: e.created_at,
            job_id: jp?.id ?? "",
            job_title: jp?.title ?? "(listing removed)",
            job_status: jp?.status ?? "",
            business_id: jp?.business_id ?? "",
            business_name: biz?.name ?? "Unknown",
            business_claimed: !!biz?.claimed,
            business_notified: !!biz?.notified,
          };
        })
      );
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const thisMonth = new Date();
    thisMonth.setUTCDate(1);
    thisMonth.setUTCHours(0, 0, 0, 0);
    // Same person, counted once — the raw row count flatters the numbers when
    // one motivated applicant hits six listings in an evening.
    const people = new Set(
      rows.map((r) => (r.email || r.name || r.id).trim().toLowerCase())
    );
    return {
      total: rows.length,
      month: rows.filter((r) => new Date(r.created_at) >= thisMonth).length,
      people: people.size,
      unreachable: rows.filter((r) => !r.business_claimed).length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyUnreachable && r.business_claimed) return false;
      if (!q) return true;
      return (
        (r.name ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        r.job_title.toLowerCase().includes(q) ||
        r.business_name.toLowerCase().includes(q)
      );
    });
  }, [rows, search, onlyUnreachable, ]);

  /** Which listings attract interest — the useful view for deciding what to scrape. */
  const byListing = useMemo(() => {
    const m = new Map<string, { title: string; business: string; claimed: boolean; count: number }>();
    for (const r of rows) {
      const key = `${r.business_name}|${r.job_title}`;
      const e = m.get(key) ?? { title: r.job_title, business: r.business_name, claimed: r.business_claimed, count: 0 };
      e.count += 1;
      m.set(key, e);
    }
    return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 12);
  }, [rows]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-primary">Expressions of Interest</h1>
        <p className="mt-1 text-sm text-foreground/60">
          People who asked about a job without creating an account. An unclaimed business
          can&apos;t see them until it claims.
        </p>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { n: stats.total, l: "total, all time", flag: false },
          { n: stats.month, l: "this month", flag: false },
          { n: stats.people, l: "unique people", flag: false },
          { n: stats.unreachable, l: "waiting on an unclaimed business", flag: stats.unreachable > 0 },
        ].map((s) => (
          <div
            key={s.l}
            className={`rounded-2xl border p-5 ${s.flag ? "border-amber-300 bg-amber-50" : "border-accent/40 bg-white"}`}
          >
            <p className={`text-3xl font-bold tabular-nums ${s.flag ? "text-amber-700" : "text-primary"}`}>{s.n}</p>
            <p className="mt-1 text-sm text-foreground/60">{s.l}</p>
          </div>
        ))}
      </div>

      {stats.unreachable > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <strong>{stats.unreachable}</strong> of {stats.total} are waiting on a business that
          hasn&apos;t claimed its account. They&apos;ve been emailed that someone applied, but nobody
          has logged in to see who. Their listings are exempt from takedown.
        </div>
      )}

      {/* Which listings attract interest */}
      {byListing.length > 0 && (
        <div className="mb-6 rounded-2xl border border-accent/40 bg-white p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground/50">
            Listings attracting interest
          </h2>
          <div className="flex flex-wrap gap-2">
            {byListing.map((l) => (
              <span
                key={`${l.business}|${l.title}`}
                className="inline-flex items-center gap-2 rounded-full border border-accent/50 bg-background px-3 py-1.5 text-xs"
                title={l.business}
              >
                <span className="font-semibold text-primary">{l.title}</span>
                <span className="text-foreground/45">{l.business}</span>
                <span className="rounded-full bg-secondary/15 px-1.5 py-0.5 font-bold text-secondary">{l.count}</span>
                {!l.claimed && <span className="text-amber-600" title="business hasn't claimed">●</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search person, listing or business…"
          className="flex-1 min-w-[240px] rounded-xl border border-accent bg-white px-4 py-2.5 text-sm text-primary placeholder:text-foreground/40 focus:border-secondary focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setOnlyUnreachable(!onlyUnreachable)}
          className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            onlyUnreachable
              ? "border-amber-300 bg-amber-100 text-amber-900"
              : "border-accent bg-white text-foreground/70 hover:text-primary"
          }`}
        >
          Unclaimed only
        </button>
        <span className="text-sm text-foreground/50">{filtered.length} shown</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-accent/40 bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-accent/40 text-left text-xs uppercase tracking-wider text-foreground/50">
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Person</th>
              <th className="px-5 py-3 font-semibold">Listing</th>
              <th className="px-5 py-3 font-semibold">Business</th>
              <th className="px-5 py-3 font-semibold">Reaches them?</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-foreground/50">
                  No expressions of interest match.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr
                key={r.id}
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                className="cursor-pointer border-b border-accent/20 transition-colors last:border-0 hover:bg-accent/5"
              >
                <td className="whitespace-nowrap px-5 py-3 text-foreground/60">{fmtDate(r.created_at)}</td>
                <td className="px-5 py-3">
                  <p className="font-medium text-primary">{r.name || "(no name)"}</p>
                  <p className="text-xs text-foreground/50">{r.email || "no email"}</p>
                  {expanded === r.id && r.message && (
                    <p className="mt-2 max-w-md rounded-lg bg-background px-3 py-2 text-xs text-foreground/70">
                      {r.message}
                    </p>
                  )}
                  {expanded === r.id && r.phone && (
                    <p className="mt-1 text-xs text-foreground/50">{r.phone}</p>
                  )}
                </td>
                <td className="px-5 py-3">
                  {r.job_id ? (
                    <Link
                      href={`/jobs/${r.job_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-primary hover:text-secondary hover:underline"
                    >
                      {r.job_title}
                    </Link>
                  ) : (
                    <span className="text-foreground/40">{r.job_title}</span>
                  )}
                  {r.job_status && r.job_status !== "active" && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                      {r.job_status}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3 text-foreground/70">{r.business_name}</td>
                <td className="px-5 py-3">
                  {r.business_claimed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
                      Claimed — can see it
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"
                      title={
                        r.business_notified
                          ? "Emailed that someone applied, but has never logged in"
                          : "Not yet emailed about this applicant"
                      }
                    >
                      Unclaimed{r.business_notified ? " — emailed" : " — not emailed"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

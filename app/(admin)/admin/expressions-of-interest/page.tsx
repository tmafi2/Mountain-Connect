"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchAllRows, fetchAllByIds } from "@/lib/supabase/fetch-all";

/**
 * Which businesses and which job ads are getting expressions of interest.
 *
 * That is the whole job of this page: who is attracting applicants, how many,
 * from which ads, over what period — so a list can be exported and worked
 * through by hand.
 *
 * ⚠️ IT SAYS NOTHING ABOUT EMAIL, DELIBERATELY. What the claim cadence has
 * sent, what it will send next, and whether an applicant's letter can be
 * quoted back to a business all live on /admin/outreach/pipeline. Those are
 * decisions about a message; this is a count of interest. They were briefly
 * one page and it answered neither question cleanly.
 *
 * ⚠️ EVERY READ IS PAGED, and the business lookup is CHUNKED. Applications and
 * job posts are both approaching the 1000-row cap this project sets silently
 * (lib/supabase/fetch-all.ts), and a short read would under-report how many
 * people are waiting — the only number here that matters. The `.in(...)` list
 * grows with the board, which is the other half of the same trap: a long
 * enough id list builds a URL that fails quietly.
 *
 * ⚠️ THE COUNTRY COMES FROM THE JOB'S RESORT, NOT THE BUSINESS'S, and it has
 * to. `business_profiles.resort_id` is a plain column with NO foreign key, so
 * PostgREST cannot see a relationship and `business_profiles(…, resorts(…))`
 * fails the WHOLE select — it returns zero rows with an error that is easy to
 * discard, not a row with a null country. An earlier draft did exactly that
 * and rendered all 65 businesses as "Unknown / —" with every claimed flag
 * false, which looks like real data. `job_posts → resorts` does have the
 * relationship, and carries the resort name as well.
 *
 * ⚠️ WE HOLD NO PHONE NUMBERS. `business_profiles.phone` and `.website` are
 * empty on all 65 businesses that have applications, and only one of the 96
 * ads has anything phone-shaped in its text — the board is almost entirely
 * scraped imports, which never carried one. So the export carries every
 * ADDRESS we hold (the business's own, plus an ad's apply-to address where it
 * differs) and the public profile url. A number has to be looked up.
 */

interface EoiRow {
  id: string;
  name: string | null;
  email: string | null;
  created_at: string;
  job_id: string;
  job_title: string;
  job_live: boolean;
  job_apply_email: string | null;
  business_id: string;
  business_name: string;
  business_country: string;
  resort: string;
  business_claimed: boolean;
  business_email: string | null;
}

interface AdRow {
  id: string;
  title: string;
  live: boolean;
  applyEmail: string | null;
  businessId: string;
  business: string;
  country: string;
  resort: string;
  total: number;
  first: string;
  latest: string;
}

interface BizRow {
  id: string;
  name: string;
  country: string;
  resort: string;
  email: string | null;
  claimed: boolean;
  total: number;
  ads: number;
  deadAds: number;
  onDeadAds: number;
  first: string;
  latest: string;
  applyEmails: string[];
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const daysSince = (iso: string) =>
  Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

/**
 * ⚠️ LOCAL date parts, not `toISOString()`. The two date inputs are parsed as
 * LOCAL midnight in `inRange`, so a UTC-derived day string would disagree with
 * them by a day for anyone west of Greenwich in the evening — the preset would
 * silently cover 29 or 31 days and the chip would still look right.
 */
const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type Filter = "all" | "unclaimed" | "five-plus";

/**
 * ⚠️ NO "never emailed" FILTER, DELIBERATELY. Measured 2026-11-10: of the 61
 * unclaimed businesses with someone waiting, *zero* have not had the
 * first-applicant email. A filter that can never match is worse than no
 * filter — it reads as "nobody is un-emailed yet" when it means "this control
 * does nothing", the same mistake as the category filter that offered two
 * options for 355 jobs. The live distinction is how MUCH is waiting, which is
 * wildly uneven: one business has 109 applications, 33 have exactly one.
 */
const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  unclaimed: "Unclaimed",
  "five-plus": "5+ applications",
};

/** Quick spans; the two date boxes cover anything else. */
const PRESETS: Array<{ label: string; days: number | null }> = [
  { label: "All time", days: null },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];





export default function AdminExpressionsOfInterestPage() {
  const [rows, setRows] = useState<EoiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("unclaimed");
  const [country, setCountry] = useState("all");
  const [from, setFrom] = useState("");
  const [includeDead, setIncludeDead] = useState(false);
  const [to, setTo] = useState("");
  const [view, setView] = useState<"business" | "ads" | "applications">(
    "business",
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      try {
        const eois = await fetchAllRows<Record<string, unknown>>(
          (lo, hi) =>
            supabase
              .from("expressions_of_interest")
              .select(
                "id, name, email, created_at, job_post_id, job_posts(id, title, status, business_id, application_email, resorts(name, country))",
              )
              .order("created_at", { ascending: false })
              .range(lo, hi),
          "expressions of interest",
        );

        const bizIds = [
          ...new Set(
            eois
              .map(
                (e) =>
                  (e.job_posts as { business_id?: string } | null)?.business_id,
              )
              .filter(Boolean) as string[],
          ),
        ];

        const bizMap = new Map<
          string,
          { name: string; claimed: boolean; email: string | null }
        >();
        if (bizIds.length) {
          const bizes = await fetchAllByIds<Record<string, unknown>>(
            bizIds,
            (chunk, lo, hi) =>
              supabase
                .from("business_profiles")
                .select("id, business_name, email, is_claimed")
                .in("id", chunk)
                .range(lo, hi),
            "businesses behind applications",
          );
          for (const b of bizes) {
            bizMap.set(b.id as string, {
              name: (b.business_name as string) ?? "Unknown",
              claimed: Boolean(b.is_claimed),
              email: (b.email as string) ?? null,
            });
          }
        }

        setRows(
          eois.map((e) => {
            const jp = e.job_posts as {
              id: string;
              title: string;
              status: string;
              business_id: string;
              application_email: string | null;
              resorts: { name?: string; country?: string } | null;
            } | null;
            const biz = jp ? bizMap.get(jp.business_id) : undefined;
            return {
              id: e.id as string,
              name: (e.name as string) ?? null,
              email: (e.email as string) ?? null,
              created_at: e.created_at as string,
              job_id: jp?.id ?? "",
              job_title: jp?.title ?? "(ad removed)",
              job_live: jp?.status === "active",
              job_apply_email: jp?.application_email ?? null,
              business_id: jp?.business_id ?? "",
              business_name: biz?.name ?? "Unknown",
              business_country: jp?.resorts?.country ?? "—",
              resort: jp?.resorts?.name ?? "—",
              business_claimed: Boolean(biz?.claimed),
              business_email: biz?.email ?? null,
            };
          }),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /**
   * The date range narrows the APPLICATIONS, and everything else is derived
   * from what survives — so a business with nothing in the window drops out of
   * the table and out of the export rather than appearing with a count of 0.
   * `to` is inclusive of its whole day: a range ending "today" must not
   * exclude this morning.
   */
  const inRange = useMemo(() => {
    const lo = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity;
    const hi = to ? new Date(`${to}T23:59:59.999`).getTime() : Infinity;
    return (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= lo && t <= hi;
    };
  }, [from, to]);

  /**
   * Applications on an ad that is no longer live are EXCLUDED by default.
   *
   * ⚠️ THE TEST IS `status = 'active'`, not a list of paused_reasons, and that
   * is deliberate. Today the non-live ads carrying applications are 12
   * `stale_cleanup` (last season's listings, retired by 00092) and 3
   * `claim_gated`; there are ZERO `expired` and ZERO `dormant_unclaimed` so
   * far, but the expiry sweep and the dormancy takedown will both produce
   * them. Testing the status catches those the day they appear, where an
   * enumerated list would silently keep showing them until someone noticed.
   *
   * ⚠️ IT HIDES REAL PEOPLE, so it is a toggle and not a deletion: 34
   * applications sit on retired ads and nobody ever read them. Default off
   * because a call list should not be padded with listings that are gone;
   * reachable because they still happened.
   *
   * The 3 `claim_gated` ads are OUR parking, not a takedown — but all 5 of
   * their applications are at CLAIMED businesses, which the default Unclaimed
   * filter already excludes, so the simple rule costs nothing here. Revisit if
   * a parked listing ever turns up at an unclaimed business.
   */
  const dated = useMemo(
    () => rows.filter((r) => inRange(r.created_at) && (includeDead || r.job_live)),
    [rows, inRange, includeDead],
  );

  /** Never hide a number silently: say how many the toggle is holding back. */
  const hiddenByDeadAds = useMemo(
    () => rows.filter((r) => inRange(r.created_at) && !r.job_live).length,
    [rows, inRange],
  );

  const activePreset = useMemo(() => {
    if (!from && !to) return "All time";
    for (const p of PRESETS) {
      if (p.days === null) continue;
      const start = new Date();
      start.setDate(start.getDate() - p.days);
      if (from === isoDay(start) && !to) return p.label;
    }
    return null;
  }, [from, to]);

  function applyPreset(days: number | null) {
    if (days === null) {
      setFrom("");
      setTo("");
      return;
    }
    const start = new Date();
    start.setDate(start.getDate() - days);
    setFrom(isoDay(start));
    setTo("");
  }

  const stats = useMemo(() => {
    // Same person counted once — a raw row count flatters the numbers when one
    // motivated applicant hits six ads in an evening.
    const people = new Set(
      dated.map((r) => (r.email || r.name || r.id).trim().toLowerCase()),
    );
    const unread = dated.filter((r) => !r.business_claimed);
    const oldest = unread.reduce<string | null>(
      (acc, r) => (!acc || r.created_at < acc ? r.created_at : acc),
      null,
    );
    return {
      total: dated.length,
      people: people.size,
      businesses: new Set(dated.map((r) => r.business_id).filter(Boolean)).size,
      ads: new Set(dated.map((r) => r.job_id).filter(Boolean)).size,
      unread: unread.length,
      oldestDays: oldest ? daysSince(oldest) : 0,
    };
  }, [dated]);

  const businesses = useMemo(() => {
    const m = new Map<
      string,
      BizRow & {
        adIds: Set<string>;
        deadIds: Set<string>;
        applySet: Set<string>;
      }
    >();
    for (const r of dated) {
      if (!r.business_id) continue;
      let e = m.get(r.business_id);
      if (!e) {
        e = {
          id: r.business_id,
          name: r.business_name,
          country: r.business_country,
          resort: r.resort,
          email: r.business_email,
          claimed: r.business_claimed,
          total: 0,
          ads: 0,
          deadAds: 0,
          onDeadAds: 0,
          first: r.created_at,
          latest: r.created_at,
          applyEmails: [],
          adIds: new Set(),
          deadIds: new Set(),
          applySet: new Set(),
        };
        m.set(r.business_id, e);
      }
      e.total += 1;
      if (!r.job_live) e.onDeadAds += 1;
      if (r.created_at < e.first) e.first = r.created_at;
      if (r.created_at > e.latest) e.latest = r.created_at;
      if (r.job_id) {
        e.adIds.add(r.job_id);
        if (!r.job_live) e.deadIds.add(r.job_id);
      }
      // Only worth carrying when it differs from the business's own address.
      if (r.job_apply_email && r.job_apply_email !== r.business_email) {
        e.applySet.add(r.job_apply_email);
      }
    }
    return [...m.values()]
      .map(({ adIds, deadIds, applySet, ...b }) => ({
        ...b,
        ads: adIds.size,
        deadAds: deadIds.size,
        applyEmails: [...applySet],
      }))
      .sort((a, b) => b.total - a.total);
  }, [dated]);

  const countries = useMemo(
    () => [...new Set(businesses.map((b) => b.country))].sort(),
    [businesses],
  );

  const inCountry = (b: { country: string }, c: string) =>
    c === "all" || b.country === c;

  const matchesFilter = (b: BizRow, f: Filter) => {
    if (f === "unclaimed") return !b.claimed;
    if (f === "five-plus") return b.total >= 5;
    return true;
  };

  const visibleBusinesses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return businesses.filter(
      (b) =>
        matchesFilter(b, filter) &&
        inCountry(b, country) &&
        (!q ||
          b.name.toLowerCase().includes(q) ||
          b.country.toLowerCase().includes(q) ||
          b.resort.toLowerCase().includes(q)),
    );
  }, [businesses, filter, country, search]);

  /** The number on each chip, so an empty filter is visible before it is
   *  clicked rather than looking like an empty board. */
  const filterCounts = useMemo(() => {
    const out = {} as Record<Filter, number>;
    for (const f of Object.keys(FILTER_LABEL) as Filter[]) {
      out[f] = businesses.filter(
        (b) => matchesFilter(b, f) && inCountry(b, country),
      ).length;
    }
    return out;
  }, [businesses, country]);

  const allowedBiz = useMemo(
    () => new Set(visibleBusinesses.map((b) => b.id)),
    [visibleBusinesses],
  );

  /** Ads, built from the same filtered set so the two views never disagree. */
  const visibleAds = useMemo(() => {
    const m = new Map<string, AdRow>();
    for (const r of dated) {
      if (!allowedBiz.has(r.business_id) || !r.job_id) continue;
      let a = m.get(r.job_id);
      if (!a) {
        a = {
          id: r.job_id,
          title: r.job_title,
          live: r.job_live,
          applyEmail:
            r.job_apply_email && r.job_apply_email !== r.business_email
              ? r.job_apply_email
              : null,
          businessId: r.business_id,
          business: r.business_name,
          country: r.business_country,
          resort: r.resort,
          total: 0,
          first: r.created_at,
          latest: r.created_at,
        };
        m.set(r.job_id, a);
      }
      a.total += 1;
      if (r.created_at < a.first) a.first = r.created_at;
      if (r.created_at > a.latest) a.latest = r.created_at;
    }
    return [...m.values()].sort((x, y) => y.total - x.total);
  }, [dated, allowedBiz]);

  const adsByBusiness = useMemo(() => {
    const m = new Map<string, AdRow[]>();
    for (const a of visibleAds) {
      const list = m.get(a.businessId);
      if (list) list.push(a);
      else m.set(a.businessId, [a]);
    }
    return m;
  }, [visibleAds]);

  const visibleApplications = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dated.filter(
      (r) =>
        allowedBiz.has(r.business_id) &&
        (!q ||
          (r.name ?? "").toLowerCase().includes(q) ||
          (r.email ?? "").toLowerCase().includes(q) ||
          r.job_title.toLowerCase().includes(q) ||
          r.business_name.toLowerCase().includes(q)),
    );
  }, [dated, allowedBiz, search]);

  const rangeLabel =
    !from && !to ? "all time" : `${from || "the start"} to ${to || "today"}`;

  /** The filtered business list, as a file you can work a call list from. */
  function exportCsv() {
    // Kept column-per-column alongside the row below: these two lists must
    // stay in the same order, and that is only checkable by eye.
    const header = [
      "business", "country", "resort", "email", "ad_apply_emails",
      "applications", "ads_with_applications", "ads_no_longer_live",
      "first_application", "latest_application", "days_since_first",
      "claimed", "profile_url",
    ];
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = visibleBusinesses.map((b) =>
      [
        b.name, b.country, b.resort, b.email ?? "", b.applyEmails.join("; "),
        b.total, b.ads, b.deadAds,
        b.first.slice(0, 10), b.latest.slice(0, 10), daysSince(b.first),
        b.claimed ? "yes" : "no",
        `https://www.mountainconnects.com/business/${b.id}`,
      ].map(esc).join(","),
    );
    const span =
      from || to
        ? `${from || "start"}_to_${to || isoDay(new Date())}`
        : "all-time";
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `businesses-with-interest-${span}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-16">
        <h1 className="text-2xl font-bold text-primary">
          Expressions of Interest
        </h1>
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Could not read the board: {error}
        </p>
        <p className="mt-3 text-sm text-foreground/60">
          Nothing is shown rather than a partial count — a short read here would
          under-report how many people are waiting.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">
            Expressions of Interest
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-foreground/60">
            Which businesses and which job ads are attracting applicants. An
            unclaimed business can&apos;t see any of them until it claims.
          </p>
        </div>
        <Link
          href="/admin/outreach/pipeline"
          className="rounded-xl border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:border-secondary/50 hover:bg-secondary/5"
        >
          What we&apos;re emailing them →
        </Link>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile n={stats.total} l={`applications · ${rangeLabel}`} />
        <Tile n={stats.people} l="unique people" />
        <Tile n={stats.businesses} l="businesses getting interest" />
        <Tile n={stats.ads} l="job ads getting interest" />
        <Tile
          n={stats.oldestDays}
          l="days the oldest unread has waited"
          flag={stats.oldestDays > 60}
        />
      </div>

      {stats.unread > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <strong>{stats.unread}</strong> of {stats.total} applications are
          against a business that has never claimed its account, so nobody has
          read them. The oldest has been waiting{" "}
          <strong>{stats.oldestDays} days</strong>.
        </div>
      )}

      {/* Row 1 — what you are looking at, and how to get it out. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-accent bg-white p-0.5">
          {(
            [
              ["business", "By business"],
              ["ads", "By job ad"],
              ["applications", "Every application"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                view === v
                  ? "bg-primary text-white"
                  : "text-foreground/60 hover:text-primary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search business, resort, applicant"
          className="w-full max-w-xs rounded-lg border border-accent bg-white px-3 py-1.5 text-sm focus:border-secondary focus:outline-none sm:w-auto"
        />

        <button
          type="button"
          onClick={exportCsv}
          disabled={visibleBusinesses.length === 0}
          className="ml-auto rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-40"
        >
          Export {visibleBusinesses.length} businesses (CSV)
        </button>
      </div>

      {/* Row 2 — filters. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === f
                ? "bg-secondary text-white"
                : "bg-accent/30 text-foreground/70 hover:bg-accent/50"
            }`}
          >
            {FILTER_LABEL[f]}
            <span
              className={`ml-1.5 tabular-nums ${filter === f ? "text-white/70" : "text-foreground/45"}`}
            >
              {filterCounts[f]}
            </span>
          </button>
        ))}
      </div>

      {/* Row 3 — country. */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-foreground/45">
          Country
        </span>
        {["all", ...countries].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCountry(c)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              country === c
                ? "bg-primary text-white"
                : "bg-accent/25 text-foreground/65 hover:bg-accent/45"
            }`}
          >
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      {/* Row 3b — whether taken-down ads count at all. */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-foreground/45">
          Ads
        </span>
        {(
          [
            [false, "Live only"],
            [true, "Include taken down"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setIncludeDead(v)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              includeDead === v
                ? "bg-primary text-white"
                : "bg-accent/25 text-foreground/65 hover:bg-accent/45"
            }`}
          >
            {label}
          </button>
        ))}
        {!includeDead && hiddenByDeadAds > 0 && (
          <span className="text-xs text-foreground/45">
            {hiddenByDeadAds} application{hiddenByDeadAds === 1 ? "" : "s"} hidden — expired,
            retired or taken down
          </span>
        )}
      </div>

      {/* Row 4 — when they applied. */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-foreground/45">
          Applied
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.days)}
            className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
              activePreset === p.label
                ? "bg-primary text-white"
                : "bg-accent/25 text-foreground/65 hover:bg-accent/45"
            }`}
          >
            {p.label}
          </button>
        ))}
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-accent bg-white px-2 py-1 text-xs focus:border-secondary focus:outline-none"
        />
        <span className="text-xs text-foreground/45">to</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-accent bg-white px-2 py-1 text-xs focus:border-secondary focus:outline-none"
        />
        {(from || to) && (
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="rounded-full px-2 py-1 text-xs font-medium text-secondary hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {view === "business" && (
        <div className="overflow-x-auto rounded-2xl border border-accent/40 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-accent/50 bg-background/60 text-left">
                <Th>Business</Th>
                <Th>Country</Th>
                <Th right>Applications</Th>
                <Th right>Job ads</Th>
                <Th>First</Th>
                <Th>Latest</Th>
                <Th>State</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {visibleBusinesses.map((b) => (
                <BusinessRow
                  key={b.id}
                  b={b}
                  expanded={expanded === b.id}
                  onToggle={() => setExpanded(expanded === b.id ? null : b.id)}
                  ads={adsByBusiness.get(b.id) ?? []}
                />
              ))}
              {visibleBusinesses.length === 0 && <Empty cols={8} />}
            </tbody>
          </table>
        </div>
      )}

      {view === "ads" && (
        <div className="overflow-x-auto rounded-2xl border border-accent/40 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-accent/50 bg-background/60 text-left">
                <Th>Job ad</Th>
                <Th>Business</Th>
                <Th>Country</Th>
                <Th right>Applications</Th>
                <Th>First</Th>
                <Th>Latest</Th>
              </tr>
            </thead>
            <tbody>
              {visibleAds.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-accent/40 last:border-0"
                >
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/jobs/${a.id}`}
                      className="font-medium text-primary hover:text-secondary hover:underline"
                    >
                      {a.title}
                    </Link>
                    {!a.live && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        no longer live
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-foreground/70">
                    {a.business}
                  </td>
                  <td className="px-4 py-2.5 text-foreground/70">
                    {a.country}
                    {a.resort !== "—" && (
                      <p className="text-xs text-foreground/45">{a.resort}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold">
                    {a.total}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-foreground/60">
                    {fmtDate(a.first)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-foreground/60">
                    {fmtDate(a.latest)}
                  </td>
                </tr>
              ))}
              {visibleAds.length === 0 && <Empty cols={6} />}
            </tbody>
          </table>
        </div>
      )}

      {view === "applications" && (
        <div className="overflow-x-auto rounded-2xl border border-accent/40 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-accent/50 bg-background/60 text-left">
                <Th>Applicant</Th>
                <Th>Job ad</Th>
                <Th>Business</Th>
                <Th>When</Th>
                <Th>State</Th>
              </tr>
            </thead>
            <tbody>
              {visibleApplications.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-accent/40 last:border-0 align-top"
                >
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-primary">{r.name ?? "—"}</p>
                    <p className="text-xs text-foreground/55">
                      {r.email ?? ""}
                    </p>
                  </td>
                  <td className="px-4 py-2.5">
                    {r.job_title}
                    {!r.job_live && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                        no longer live
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-foreground/70">
                    {r.business_name}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-foreground/60">
                    {fmtDate(r.created_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.business_claimed ? (
                      <span className="text-xs font-semibold text-green-700">
                        claimed
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-amber-700">
                        unread
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {visibleApplications.length === 0 && <Empty cols={5} />}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BusinessRow({
  b,
  expanded,
  onToggle,
  ads,
}: {
  b: BizRow;
  expanded: boolean;
  onToggle: () => void;
  ads: AdRow[];
}) {
  const waited = daysSince(b.first);
  return (
    <>
      <tr className="border-b border-accent/40 last:border-0">
        <td className="px-4 py-2.5">
          <Link
            href={`/business/${b.id}`}
            className="font-medium text-primary hover:text-secondary hover:underline"
          >
            {b.name}
          </Link>
          {b.email && <p className="text-xs text-foreground/50">{b.email}</p>}
        </td>
        <td className="px-4 py-2.5 text-foreground/70">
          {b.country}
          {b.resort !== "—" && (
            <p className="text-xs text-foreground/45">{b.resort}</p>
          )}
        </td>
        <td className="px-4 py-2.5 text-right">
          <span className="font-mono tabular-nums font-semibold">
            {b.total}
          </span>
          {b.onDeadAds > 0 && (
            <p className="text-[11px] font-medium text-red-700">
              {b.onDeadAds} on a dead ad
            </p>
          )}
        </td>
        <td className="px-4 py-2.5 text-right">
          <span className="font-mono tabular-nums text-foreground/70">
            {b.ads}
          </span>
          {b.deadAds > 0 && (
            <p className="text-[11px] font-medium text-foreground/45">
              {b.deadAds} no longer live
            </p>
          )}
        </td>
        <td
          className={`px-4 py-2.5 whitespace-nowrap ${waited > 60 ? "font-semibold text-amber-700" : "text-foreground/60"}`}
        >
          {fmtDate(b.first)}
          <p className="text-[11px] font-normal text-foreground/45">
            {waited}d ago
          </p>
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap text-foreground/60">
          {fmtDate(b.latest)}
        </td>
        <td className="px-4 py-2.5">
          {b.claimed ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              claimed
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              unclaimed
            </span>
          )}
        </td>
        <td className="px-4 py-2.5 text-right">
          <button
            type="button"
            onClick={onToggle}
            className="rounded-lg border border-accent px-2.5 py-1 text-xs font-semibold text-secondary transition hover:border-secondary/50 hover:bg-secondary/5"
          >
            {expanded ? "Hide" : `${b.ads} ad${b.ads === 1 ? "" : "s"}`}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-accent/40 bg-background/40">
          <td colSpan={8} className="px-4 py-3">
            <div className="space-y-2">
              {ads.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-accent/50 bg-white px-3 py-2"
                >
                  <Link
                    href={`/jobs/${a.id}`}
                    className="text-sm font-semibold text-primary hover:text-secondary hover:underline"
                  >
                    {a.title}
                  </Link>
                  {!a.live && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                      no longer live
                    </span>
                  )}
                  {a.applyEmail && (
                    <span className="text-xs text-foreground/50">
                      applies to {a.applyEmail}
                    </span>
                  )}
                  <span className="ml-auto text-xs text-foreground/60">
                    <strong className="tabular-nums text-primary">
                      {a.total}
                    </strong>{" "}
                    application
                    {a.total === 1 ? "" : "s"} · {fmtDate(a.first)} –{" "}
                    {fmtDate(a.latest)}
                  </span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Tile({ n, l, flag }: { n: number; l: string; flag?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${flag ? "border-amber-300 bg-amber-50" : "border-accent/40 bg-white"}`}
    >
      <p
        className={`text-3xl font-bold tabular-nums ${flag ? "text-amber-700" : "text-primary"}`}
      >
        {n}
      </p>
      <p className="mt-1 text-sm text-foreground/60">{l}</p>
    </div>
  );
}

function Empty({ cols }: { cols: number }) {
  return (
    <tr>
      <td
        colSpan={cols}
        className="px-4 py-10 text-center text-sm text-foreground/50"
      >
        Nothing matches these filters.
      </td>
    </tr>
  );
}

function Th({
  children,
  right,
}: {
  children?: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-foreground/50 ${right ? "text-right" : ""}`}
    >
      {children}
    </th>
  );
}

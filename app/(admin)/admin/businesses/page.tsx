"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BusinessVerificationStatus } from "@/types/database";

const STATUS_STYLES: Record<BusinessVerificationStatus, { bg: string; text: string; label: string }> = {
  unverified: { bg: "bg-gray-50", text: "text-gray-600", label: "Unverified" },
  pending_review: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Pending" },
  verified: { bg: "bg-green-50", text: "text-green-700", label: "Verified" },
  rejected: { bg: "bg-red-50", text: "text-red-600", label: "Rejected" },
};

interface BusinessRow {
  id: string;
  business_name: string;
  category: string | null;
  industries: string[] | null;
  location: string | null;
  country: string | null;
  email: string | null;
  logo_url: string | null;
  verification_status: BusinessVerificationStatus;
  created_at: string;
}

export default function AdminBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BusinessVerificationStatus>("all");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, business_name, category, industries, location, country, email, logo_url, verification_status, created_at")
        .order("created_at", { ascending: false });

      if (error) console.error("Error loading businesses:", error);
      setBusinesses((data as BusinessRow[]) || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let results = [...businesses];
    if (statusFilter !== "all") {
      results = results.filter((b) => b.verification_status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (b) =>
          b.business_name.toLowerCase().includes(q) ||
          (b.location && b.location.toLowerCase().includes(q)) ||
          (b.country && b.country.toLowerCase().includes(q)) ||
          (b.email && b.email.toLowerCase().includes(q))
      );
    }
    return results;
  }, [businesses, search, statusFilter]);

  const getIndustryLabel = (biz: BusinessRow): string => {
    if (biz.industries && biz.industries.length > 0) {
      return biz.industries[0].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    if (biz.category) {
      return biz.category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return "—";
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-primary">All Businesses</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Browse and manage all registered businesses on the platform.
      </p>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search businesses..."
          className="w-64 rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | BusinessVerificationStatus)}
          className="rounded-lg border border-accent bg-white px-4 py-2.5 text-sm text-primary focus:border-secondary focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="verified">Verified</option>
          <option value="pending_review">Pending Review</option>
          <option value="unverified">Unverified</option>
          <option value="rejected">Rejected</option>
        </select>
        <span className="text-sm text-foreground/50">{filtered.length} businesses</span>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-accent bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-accent bg-accent/10 text-left text-xs uppercase tracking-wider text-foreground/50">
              <th className="px-5 py-3">Business</th>
              <th className="px-5 py-3">Industry</th>
              <th className="px-5 py-3">Location</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Registered</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((biz) => {
              const style = STATUS_STYLES[biz.verification_status];
              return (
                <tr key={biz.id} className="border-b border-accent/30 transition-colors hover:bg-accent/5">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {biz.logo_url ? (
                        <img src={biz.logo_url} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                          {biz.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-primary">{biz.business_name}</p>
                        {biz.email && <p className="text-xs text-foreground/40">{biz.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-foreground/70">{getIndustryLabel(biz)}</td>
                  <td className="px-5 py-3 text-foreground/70">
                    {biz.location}{biz.country ? `, ${biz.country}` : ""}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
                      {style.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-foreground/50">
                    {new Date(biz.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-sm text-foreground/40">No businesses found.</div>
        )}
      </div>
    </div>
  );
}

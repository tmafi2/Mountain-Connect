"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

interface MonthlyGrowth {
  month: string;
  workers: number;
  businesses: number;
  jobs: number;
  applications: number;
}

interface CountryData {
  name: string;
  value: number;
}

const COLORS = ["#3b9ede", "#22d3ee", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#ec4899", "#6366f1"];

export default function AdminAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [monthlyGrowth, setMonthlyGrowth] = useState<MonthlyGrowth[]>([]);
  const [countryData, setCountryData] = useState<CountryData[]>([]);
  const [totals, setTotals] = useState({
    workers: 0, businesses: 0, jobs: 0, applications: 0,
    interviews: 0, verified: 0, blogPosts: 0, newsletterSubs: 0,
  });
  const [verificationStats, setVerificationStats] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const supabase = createClient();

      // Parallel fetch all counts
      const [
        workers, businesses, jobs, applications, interviews,
        verified, blogPosts, newsletterSubs,
      ] = await Promise.all([
        supabase.from("worker_profiles").select("id, created_at"),
        supabase.from("business_profiles").select("id, created_at, country, verification_status"),
        supabase.from("job_posts").select("id, created_at, status"),
        supabase.from("applications").select("id, applied_at"),
        supabase.from("interviews").select("id", { count: "exact", head: true }),
        supabase.from("business_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "verified"),
        supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);

      setTotals({
        workers: workers.data?.length || 0,
        businesses: businesses.data?.length || 0,
        jobs: jobs.data?.length || 0,
        applications: applications.data?.length || 0,
        interviews: interviews.count || 0,
        verified: verified.count || 0,
        blogPosts: blogPosts.count || 0,
        newsletterSubs: newsletterSubs.count || 0,
      });

      // Monthly growth (last 6 months)
      const months: MonthlyGrowth[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const start = d.toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();

        months.push({
          month: label,
          workers: workers.data?.filter((w) => w.created_at >= start && w.created_at < end).length || 0,
          businesses: businesses.data?.filter((b) => b.created_at >= start && b.created_at < end).length || 0,
          jobs: jobs.data?.filter((j) => j.created_at >= start && j.created_at < end).length || 0,
          applications: applications.data?.filter((a) => a.applied_at >= start && a.applied_at < end).length || 0,
        });
      }
      setMonthlyGrowth(months);

      // Country distribution
      if (businesses.data) {
        const countryCounts: Record<string, number> = {};
        for (const b of businesses.data) {
          const c = (b as any).country || "Unknown";
          countryCounts[c] = (countryCounts[c] || 0) + 1;
        }
        setCountryData(
          Object.entries(countryCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, value]) => ({ name, value }))
        );

        // Verification status breakdown
        const vCounts: Record<string, number> = {};
        for (const b of businesses.data) {
          const s = (b as any).verification_status || "unverified";
          const label = s === "verified" ? "Verified" :
                       s === "pending_review" ? "Pending" :
                       s === "rejected" ? "Rejected" : "Unverified";
          vCounts[label] = (vCounts[label] || 0) + 1;
        }
        setVerificationStats(Object.entries(vCounts).map(([name, value]) => ({ name, value })));
      }
    } catch (err) {
      console.error("Admin analytics error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-primary">Platform Analytics</h1>
      <p className="mt-1 text-sm text-foreground/50">Overview of Mountain Connects growth and activity</p>

      {/* Key Metrics */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Workers", value: totals.workers, color: "text-secondary", bg: "bg-secondary/10" },
          { label: "Businesses", value: totals.businesses, color: "text-primary", bg: "bg-primary/10" },
          { label: "Active Jobs", value: totals.jobs, color: "text-highlight", bg: "bg-highlight/10" },
          { label: "Applications", value: totals.applications, color: "text-warm", bg: "bg-warm/10" },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-accent/30 bg-white p-5 shadow-sm">
            <p className={`text-3xl font-bold ${m.color}`}>{m.value.toLocaleString()}</p>
            <p className="mt-1 text-xs text-foreground/50">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Secondary Metrics */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Interviews", value: totals.interviews },
          { label: "Verified Businesses", value: totals.verified },
          { label: "Published Blog Posts", value: totals.blogPosts },
          { label: "Newsletter Subscribers", value: totals.newsletterSubs },
        ].map((m) => (
          <div key={m.label} className="rounded-xl border border-accent/20 bg-white p-4 shadow-sm">
            <p className="text-xl font-bold text-primary">{m.value.toLocaleString()}</p>
            <p className="mt-0.5 text-xs text-foreground/40">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Growth Chart */}
      <div className="mt-8 rounded-xl border border-accent/30 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-primary mb-4">Growth Trends (Last 6 Months)</h3>
        {monthlyGrowth.some((m) => m.workers > 0 || m.businesses > 0 || m.applications > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8899a6" }} />
              <YAxis tick={{ fontSize: 11, fill: "#8899a6" }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e8edf2", fontSize: 12 }} />
              <Area type="monotone" dataKey="workers" stackId="1" stroke="#3b9ede" fill="#3b9ede" fillOpacity={0.3} name="Workers" />
              <Area type="monotone" dataKey="businesses" stackId="2" stroke="#0a1e33" fill="#0a1e33" fillOpacity={0.2} name="Businesses" />
              <Area type="monotone" dataKey="applications" stackId="3" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} name="Applications" />
              <Area type="monotone" dataKey="jobs" stackId="4" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} name="Jobs" />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[280px] items-center justify-center text-sm text-foreground/40">
            Not enough data to show trends yet
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Business by Country */}
        <div className="rounded-xl border border-accent/30 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-primary mb-4">Businesses by Country</h3>
          {countryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={countryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#8899a6" }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#8899a6" }} width={100} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e8edf2", fontSize: 12 }} />
                <Bar dataKey="value" fill="#3b9ede" radius={[0, 4, 4, 0]} name="Businesses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-foreground/40">No data yet</div>
          )}
        </div>

        {/* Verification Status */}
        <div className="rounded-xl border border-accent/30 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-primary mb-4">Verification Status</h3>
          {verificationStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={verificationStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {verificationStats.map((_, i) => (
                    <Cell key={i} fill={["#10b981", "#f59e0b", "#ef4444", "#94a3b8"][i] || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[250px] items-center justify-center text-sm text-foreground/40">No data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

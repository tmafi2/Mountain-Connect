"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface JobStat {
  id: string;
  title: string;
  status: string;
  applications: number;
  interviews: number;
  offers: number;
  accepted: number;
}

interface MonthlyData {
  month: string;
  applications: number;
  interviews: number;
}

const FUNNEL_COLORS = ["#3b9ede", "#22d3ee", "#f59e0b", "#10b981"];
const STATUS_COLORS: Record<string, string> = {
  new: "#3b9ede",
  viewed: "#8b5cf6",
  interview: "#f59e0b",
  offered: "#22d3ee",
  accepted: "#10b981",
  rejected: "#ef4444",
};

export default function BusinessAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [jobStats, setJobStats] = useState<JobStat[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<{ name: string; value: number }[]>([]);
  const [totals, setTotals] = useState({ applications: 0, interviews: 0, offers: 0, accepted: 0, avgDaysToHire: 0 });

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("business_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      // Get all jobs
      const { data: jobs } = await supabase
        .from("job_posts")
        .select("id, title, status")
        .eq("business_id", profile.id);

      if (!jobs || jobs.length === 0) {
        setLoading(false);
        return;
      }

      const jobIds = jobs.map((j) => j.id);

      // Get all applications for these jobs
      const { data: apps } = await supabase
        .from("applications")
        .select("id, status, applied_at, job_post_id")
        .in("job_post_id", jobIds);

      // Get all interviews
      const { data: interviews } = await supabase
        .from("interviews")
        .select("id, status, application_id, applications!inner(job_post_id)")
        .eq("business_id", profile.id);

      // Build per-job stats
      const statsMap: Record<string, JobStat> = {};
      for (const job of jobs) {
        statsMap[job.id] = {
          id: job.id,
          title: job.title,
          status: job.status,
          applications: 0,
          interviews: 0,
          offers: 0,
          accepted: 0,
        };
      }

      // Status breakdown
      const statusCounts: Record<string, number> = {};

      if (apps) {
        for (const app of apps) {
          if (statsMap[app.job_post_id]) {
            statsMap[app.job_post_id].applications++;
          }
          const label = app.status === "new" ? "New" :
                       app.status === "viewed" ? "Viewed" :
                       app.status === "interview" || app.status === "interview_pending" ? "Interview" :
                       app.status === "offered" ? "Offered" :
                       app.status === "accepted" ? "Accepted" :
                       app.status === "rejected" ? "Rejected" : app.status;
          statusCounts[label] = (statusCounts[label] || 0) + 1;

          if (app.status === "offered") {
            if (statsMap[app.job_post_id]) statsMap[app.job_post_id].offers++;
          }
          if (app.status === "accepted") {
            if (statsMap[app.job_post_id]) {
              statsMap[app.job_post_id].offers++;
              statsMap[app.job_post_id].accepted++;
            }
          }
        }
      }

      if (interviews) {
        for (const iv of interviews) {
          const jobPostId = (iv.applications as unknown as { job_post_id: string })?.job_post_id;
          if (jobPostId && statsMap[jobPostId]) {
            statsMap[jobPostId].interviews++;
          }
        }
      }

      const allJobStats = Object.values(statsMap).sort((a, b) => b.applications - a.applications);
      setJobStats(allJobStats);

      // Totals
      const totalApps = apps?.length || 0;
      const totalInterviews = interviews?.length || 0;
      const totalOffers = allJobStats.reduce((s, j) => s + j.offers, 0);
      const totalAccepted = allJobStats.reduce((s, j) => s + j.accepted, 0);
      setTotals({ applications: totalApps, interviews: totalInterviews, offers: totalOffers, accepted: totalAccepted, avgDaysToHire: 0 });

      // Status breakdown for pie chart
      setStatusBreakdown(
        Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
      );

      // Monthly application trend (last 6 months)
      const months: MonthlyData[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        const start = d.toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();

        const monthApps = apps?.filter((a) => a.applied_at >= start && a.applied_at < end).length || 0;

        months.push({ month: label, applications: monthApps, interviews: 0 });
      }

      setMonthlyData(months);
    } catch (err) {
      console.error("Analytics load error:", err);
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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-primary">Analytics</h1>
      <p className="mt-1 text-sm text-foreground/50">Track your hiring performance and application trends</p>

      {/* Hiring Funnel */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Applications", value: totals.applications, color: "bg-secondary/15 text-secondary", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
          { label: "Interviews", value: totals.interviews, color: "bg-highlight/15 text-highlight", icon: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" },
          { label: "Offers Made", value: totals.offers, color: "bg-warm/15 text-warm", icon: "M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 12l2 2 4-4" },
          { label: "Accepted", value: totals.accepted, color: "bg-green-100 text-green-700", icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-accent/30 bg-white p-5 shadow-sm">
            <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
              </svg>
            </div>
            <p className="mt-3 text-2xl font-bold text-primary">{stat.value}</p>
            <p className="text-xs text-foreground/50">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Conversion rates */}
      {totals.applications > 0 && (
        <div className="mt-4 rounded-xl border border-accent/30 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-primary mb-3">Conversion Funnel</h3>
          <div className="flex items-center gap-2">
            {[
              { label: "App \u2192 Interview", rate: totals.interviews > 0 ? Math.round((totals.interviews / totals.applications) * 100) : 0 },
              { label: "Interview \u2192 Offer", rate: totals.offers > 0 && totals.interviews > 0 ? Math.round((totals.offers / totals.interviews) * 100) : 0 },
              { label: "Offer \u2192 Accepted", rate: totals.accepted > 0 && totals.offers > 0 ? Math.round((totals.accepted / totals.offers) * 100) : 0 },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 flex-1">
                <div className="flex-1">
                  <p className="text-xs text-foreground/50">{step.label}</p>
                  <div className="mt-1 h-2 rounded-full bg-accent/20 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${step.rate}%`, backgroundColor: FUNNEL_COLORS[i] }}
                    />
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-primary">{step.rate}%</p>
                </div>
                {i < 2 && (
                  <svg className="h-4 w-4 text-foreground/20 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Application Trend Chart */}
        <div className="rounded-xl border border-accent/30 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-primary mb-4">Applications (Last 6 Months)</h3>
          {monthlyData.length > 0 && monthlyData.some((m) => m.applications > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#8899a6" }} />
                <YAxis tick={{ fontSize: 11, fill: "#8899a6" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e8edf2", fontSize: 12 }}
                />
                <Bar dataKey="applications" fill="#3b9ede" radius={[4, 4, 0, 0]} name="Applications" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-foreground/40">
              No application data yet
            </div>
          )}
        </div>

        {/* Application Status Pie */}
        <div className="rounded-xl border border-accent/30 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-primary mb-4">Application Status Breakdown</h3>
          {statusBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {statusBreakdown.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={STATUS_COLORS[entry.name.toLowerCase()] || FUNNEL_COLORS[i % FUNNEL_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-foreground/40">
              No application data yet
            </div>
          )}
        </div>
      </div>

      {/* Per-Job Performance Table */}
      <div className="mt-8 rounded-xl border border-accent/30 bg-white shadow-sm overflow-hidden">
        <div className="p-5 border-b border-accent/20">
          <h3 className="text-sm font-semibold text-primary">Job Performance</h3>
          <p className="text-xs text-foreground/40 mt-0.5">How each listing is performing</p>
        </div>
        {jobStats.length === 0 ? (
          <div className="p-8 text-center text-sm text-foreground/40">No job listings yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-accent/20 bg-background/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-foreground/40">Job Title</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground/40">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground/40">Apps</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground/40">Interviews</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground/40">Offers</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-foreground/40">Accepted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-accent/10">
                {jobStats.map((job) => (
                  <tr key={job.id} className="hover:bg-accent/5">
                    <td className="px-5 py-3 font-medium text-primary max-w-[200px] truncate">{job.title}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        job.status === "active" ? "bg-green-100 text-green-700" :
                        job.status === "draft" ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center font-medium">{job.applications}</td>
                    <td className="px-5 py-3 text-center font-medium">{job.interviews}</td>
                    <td className="px-5 py-3 text-center font-medium">{job.offers}</td>
                    <td className="px-5 py-3 text-center font-medium text-green-600">{job.accepted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

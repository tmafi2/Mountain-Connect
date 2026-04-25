import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import PrintTrigger from "./PrintTrigger";

export const dynamic = "force-dynamic";

const BASE_URL = "https://www.mountainconnects.com";

interface PosterPageProps {
  params: Promise<{ id: string }>;
}

export default async function ListingPosterPage({ params }: PosterPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Find the caller's business profile so we can scope the listing read to
  // their own jobs — prevents anyone from generating a poster for someone
  // else's listing by guessing the URL.
  const { data: profile } = await supabase
    .from("business_profiles")
    .select("id, business_name, logo_url, location")
    .eq("user_id", user.id)
    .single();

  if (!profile) redirect("/business/dashboard");

  const { data: job } = await supabase
    .from("job_posts")
    .select(`
      id, title, description, pay_amount, pay_currency, salary_range,
      position_type, accommodation_included, ski_pass_included, meal_perks,
      start_date, end_date, status, business_id,
      resorts(name, country),
      nearby_towns(name)
    `)
    .eq("id", id)
    .eq("business_id", profile.id)
    .single();

  if (!job) notFound();

  const resort = job.resorts as { name?: string; country?: string } | null;
  const town = job.nearby_towns as { name?: string } | null;

  const locationLabel = [town?.name, resort?.name, resort?.country, profile.location]
    .filter(Boolean)
    .join(" · ") || profile.location || "";

  const payLabel = job.salary_range
    ?? (job.pay_amount
      ? `${job.pay_currency || "$"}${job.pay_amount}`
      : null);

  const perks: string[] = [];
  if (job.accommodation_included) perks.push("Housing");
  if (job.ski_pass_included) perks.push("Ski Pass");
  if (job.meal_perks) perks.push("Meals");

  const jobUrl = `${BASE_URL}/jobs/${job.id}`;
  const shortUrl = `mountainconnects.com/jobs/${job.id.slice(0, 8)}`;

  // High-error-correction QR so the centered logo and any reasonable scuff
  // on the printout still scans cleanly. 360px renders crisply at A4.
  const qrDataUrl = await QRCode.toDataURL(jobUrl, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: 480,
    color: { dark: "#0a1e33", light: "#ffffff" },
  });

  const businessInitials = profile.business_name
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="poster-root bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          .no-print { display: none !important; }
          html, body { background: #ffffff; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .poster-root { color: #0a1e33; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .poster-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 22mm 18mm;
          background: #ffffff;
          display: flex;
          flex-direction: column;
        }
      `}</style>

      <PrintTrigger />

      {/* Screen-only action bar */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <p className="text-sm text-slate-500">
          Preview — use your browser print dialog to save as PDF or print.
        </p>
        <div className="flex items-center gap-2">
          <a
            href={`/business/manage-listings/${job.id}`}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </a>
          <button
            type="button"
            className="rounded-lg bg-[#0a1e33] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#132d4a]"
            data-print-button
          >
            Print
          </button>
        </div>
      </div>

      <div className="poster-page">
        {/* Top masthead */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-source.png" alt="Mountain Connects" className="h-8 w-8 rounded-lg" />
            <span className="text-[13px] font-bold tracking-tight text-[#0a1e33]">Mountain Connects</span>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Now Hiring</span>
        </div>

        {/* Business identity */}
        <div className="mt-10 flex flex-col items-center text-center">
          {profile.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logo_url}
              alt={`${profile.business_name} logo`}
              className="h-28 w-28 rounded-2xl object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-[#0a1e33] text-3xl font-extrabold text-white ring-1 ring-slate-200">
              {businessInitials}
            </div>
          )}
          <p className="mt-4 text-base font-semibold text-slate-700">{profile.business_name}</p>
        </div>

        {/* Eyebrow + title */}
        <div className="mt-8 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#3b9ede]">We&apos;re hiring</p>
          <h1 className="mt-3 text-5xl font-extrabold leading-tight tracking-tight text-[#0a1e33]">
            {job.title}
          </h1>
        </div>

        {/* Meta line */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-sm text-slate-600">
          {locationLabel && <span>📍 {locationLabel}</span>}
          {locationLabel && payLabel && <span className="text-slate-300">·</span>}
          {payLabel && <span>💰 {payLabel}</span>}
          {(locationLabel || payLabel) && job.position_type && <span className="text-slate-300">·</span>}
          {job.position_type && (
            <span className="capitalize">{job.position_type.replace(/_/g, " ")}</span>
          )}
        </div>

        {/* Perks */}
        {perks.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {perks.map((perk) => (
              <span
                key={perk}
                className="rounded-full border border-[#22d3ee]/40 bg-[#22d3ee]/10 px-3 py-1 text-xs font-semibold text-[#0a1e33]"
              >
                ★ {perk}
              </span>
            ))}
          </div>
        )}

        {/* QR — pushes to bottom of available space */}
        <div className="mt-auto flex flex-col items-center pt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`Scan to apply for ${job.title}`}
            className="h-60 w-60"
          />
          <p className="mt-4 text-base font-bold uppercase tracking-[0.25em] text-[#0a1e33]">
            Scan to apply
          </p>
          <p className="mt-1 text-xs text-slate-500">{shortUrl}</p>
        </div>

        {/* Footer */}
        <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-4 text-[10px] text-slate-400">
          <span>Powered by Mountain Connects</span>
          <span>{BASE_URL.replace("https://", "")}</span>
        </div>
      </div>
    </div>
  );
}

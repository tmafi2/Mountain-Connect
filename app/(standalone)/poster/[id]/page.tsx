import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QRCode from "qrcode";
import PrintTrigger from "./PrintTrigger";

export const dynamic = "force-dynamic";

const BASE_URL = "https://www.mountainconnects.com";

interface PosterPageProps {
  params: Promise<{ id: string }>;
}

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return "";
  // Collapse 2+ blank lines down to a single newline so the poster doesn't
  // render gaping vertical gaps for paragraph breaks the original copy used
  // for screen readability.
  const trimmed = text.replace(/\n\s*\n+/g, "\n").trim();
  if (trimmed.length <= max) return trimmed;
  // Cut at the last sentence end before max, falling back to last word boundary.
  const sub = trimmed.slice(0, max);
  const lastStop = Math.max(sub.lastIndexOf(". "), sub.lastIndexOf("! "), sub.lastIndexOf("? "));
  if (lastStop > max * 0.6) return sub.slice(0, lastStop + 1).trim();
  const lastSpace = sub.lastIndexOf(" ");
  return (lastSpace > 0 ? sub.slice(0, lastSpace) : sub).trim() + "…";
}

export default async function ListingPosterPage({ params }: PosterPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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
      how_to_apply, application_email, application_url,
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
  if (job.accommodation_included) perks.push("Housing included");
  if (job.ski_pass_included) perks.push("Ski pass");
  if (job.meal_perks) perks.push("Meals");

  const jobUrl = `${BASE_URL}/jobs/${job.id}`;
  const shortUrl = `mountainconnects.com/jobs/${job.id.slice(0, 8)}`;

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

  const description = truncate(job.description, 1100);

  // Build the "how to apply" steps. If the business set custom instructions on
  // the listing, lead with those; otherwise just walk them through the QR flow.
  const applySteps: string[] = job.how_to_apply
    ? job.how_to_apply.split("\n").map((s: string) => s.trim()).filter((s: string) => s.length > 0).slice(0, 4)
    : [
        "Scan the QR code with your phone",
        "Tap Apply on the Mountain Connects listing",
        "Sign in or create a free account",
        "Send your application — easy",
      ];

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
          height: 297mm;
          margin: 0 auto;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        @media print {
          .poster-page { box-shadow: none; }
        }
        .hero {
          background:
            radial-gradient(circle at 85% 15%, rgba(34,211,238,0.35) 0%, transparent 45%),
            radial-gradient(circle at 10% 90%, rgba(245,158,11,0.25) 0%, transparent 50%),
            linear-gradient(135deg, #0a1e33 0%, #0f2942 35%, #1a3a5c 70%, #1d4682 100%);
        }
        .hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0);
          background-size: 18px 18px;
          pointer-events: none;
        }
        .hiring-eyebrow {
          background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
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
        {/* ───────── Hero ───────── */}
        <section className="hero relative overflow-hidden px-12 pb-6 pt-7 text-white">
          <div className="relative z-10">
            {/* Top row: brand + chip */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo-source.png" alt="Mountain Connects" className="h-7 w-7 rounded-lg" />
                <span className="text-[11px] font-bold tracking-tight text-white">Mountain Connects</span>
              </div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.25em] text-white backdrop-blur-sm">
                Local Job
              </span>
            </div>

            {/* Hiring eyebrow */}
            <div className="mt-6 inline-block rounded-full px-4 py-1 hiring-eyebrow">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.3em] text-[#0a1e33]">
                We&apos;re Hiring
              </span>
            </div>

            {/* Title */}
            <h1 className="mt-3 text-[44px] font-black leading-[1.02] tracking-tight text-white">
              {job.title}
            </h1>

            {/* Business identity row */}
            <div className="mt-4 flex items-center gap-3">
              {profile.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logo_url}
                  alt={`${profile.business_name} logo`}
                  className="h-12 w-12 rounded-xl bg-white/10 object-cover ring-2 ring-white/40"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-base font-extrabold text-[#0a1e33] ring-2 ring-white/40">
                  {businessInitials}
                </div>
              )}
              <div>
                <p className="text-base font-bold text-white">{profile.business_name}</p>
                {locationLabel && (
                  <p className="mt-0.5 text-xs text-white/75">📍 {locationLabel}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ───────── Pay + perks band ───────── */}
        <section className="grid grid-cols-12 gap-0 border-b-2 border-[#0a1e33]">
          <div className="col-span-5 bg-[#22d3ee] px-9 py-4 text-[#0a1e33]">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.3em] opacity-70">Pay</p>
            <p className="mt-0.5 text-xl font-black leading-tight">
              {payLabel || "Competitive"}
            </p>
            {job.position_type && (
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide capitalize opacity-80">
                {job.position_type.replace(/_/g, " ")}
              </p>
            )}
          </div>
          <div className="col-span-7 bg-[#0a1e33] px-9 py-4 text-white">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-[#22d3ee]">
              What you get
            </p>
            {perks.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {perks.map((perk) => (
                  <span
                    key={perk}
                    className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white ring-1 ring-white/30"
                  >
                    ★ {perk}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-white/70">A great seasonal opportunity.</p>
            )}
          </div>
        </section>

        {/* ───────── About the role ───────── */}
        {description && (
          <section className="px-12 py-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-[#3b9ede]">
              About the role
            </p>
            <p className="mt-1.5 whitespace-pre-line text-[12px] leading-[1.5] text-[#1f2d3d]">
              {description}
            </p>
          </section>
        )}

        {/* ───────── How to apply ───────── */}
        <section className="mt-auto bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#1a3a5c] px-12 py-5 text-white">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.4em] text-[#22d3ee]">
            How to apply
          </p>
          <h2 className="mt-0.5 text-2xl font-black tracking-tight">Scan to apply in seconds</h2>

          <div className="mt-3 flex items-stretch gap-5">
            {/* QR with white frame so it always reads on dark */}
            <div className="flex shrink-0 items-center justify-center rounded-xl bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={`Scan to apply for ${job.title}`}
                className="h-32 w-32"
              />
            </div>

            {/* Steps */}
            <ol className="flex flex-1 flex-col justify-center gap-1.5">
              {applySteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22d3ee] text-[10px] font-extrabold text-[#0a1e33]">
                    {i + 1}
                  </span>
                  <span className="text-[12px] font-medium leading-snug text-white">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Fallback contact / URL row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/15 pt-2.5 text-[11px]">
            <span className="font-semibold uppercase tracking-[0.2em] text-[#22d3ee]">
              No phone?
            </span>
            <span className="text-white/85">
              Visit <strong className="font-bold text-white">{shortUrl}</strong>
            </span>
            {job.application_email && (
              <span className="text-white/85">
                or email <strong className="font-bold text-white">{job.application_email}</strong>
              </span>
            )}
          </div>
        </section>

        {/* ───────── Footer ───────── */}
        <footer className="flex shrink-0 items-center justify-between bg-white px-12 py-2 text-[9px] text-slate-400">
          <span>Powered by Mountain Connects · {BASE_URL.replace("https://", "")}</span>
          <span>{profile.business_name}</span>
        </footer>
      </div>
    </div>
  );
}

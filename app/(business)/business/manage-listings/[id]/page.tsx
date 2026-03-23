"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

/* ─── Types ──────────────────────────────────────────────── */

interface ListingDetail {
  id: string;
  title: string;
  status: "active" | "paused" | "closed";
  resort: string;
  location: string;
  businessName: string;
  description: string;
  requirements: string;
  pay: string;
  type: string;
  startDate: string;
  endDate: string;
  posted: string;
  housing: boolean;
  housingDetails: string | null;
  skiPass: boolean;
  meals: boolean;
  language: string;
  visaSponsorship: boolean;
  urgent: boolean;
  applicants: number;
  interviews: number;
  views: number;
}

/* ─── Demo data ──────────────────────────────────────────── */

const demoListings: Record<string, ListingDetail> = {
  j1: {
    id: "j1",
    title: "Ski Instructor — All Levels",
    status: "active",
    resort: "Whistler Blackcomb",
    location: "Whistler, Canada",
    businessName: "Whistler Blackcomb Ski School",
    description:
      "Join the Whistler Blackcomb Ski School for the 2025/26 winter season. We are looking for certified ski instructors to teach group and private lessons across all ability levels. You'll work with guests from around the world in one of North America's premier resorts.\n\nAs a ski instructor, you'll be responsible for delivering high-quality lessons, ensuring guest safety on the mountain, and representing the ski school with professionalism and enthusiasm. Our team works in a supportive, fun environment with opportunities for professional development.",
    requirements:
      "• CSIA Level 2+ or equivalent international certification\n• First Aid certification (current)\n• Fluent English required; French or Japanese a plus\n• Must be available November through April\n• Previous teaching experience preferred\n• Strong communication and interpersonal skills",
    pay: "CAD $22–30/hr + tips",
    type: "Full-time",
    startDate: "Nov 20, 2025",
    endDate: "Apr 15, 2026",
    posted: "Sep 1, 2025",
    housing: true,
    housingDetails: "Shared staff housing available at $600/month. Walking distance to village. Includes Wi-Fi, laundry, and communal kitchen.",
    skiPass: true,
    meals: true,
    language: "English",
    visaSponsorship: false,
    urgent: false,
    applicants: 34,
    interviews: 3,
    views: 1240,
  },
  j2: {
    id: "j2",
    title: "Bartender — Après Ski Bar",
    status: "active",
    resort: "Garibaldi Lift Co.",
    location: "Whistler, Canada",
    businessName: "Garibaldi Lift Co.",
    description:
      "The GLC (Garibaldi Lift Co.) is Whistler's most iconic après-ski bar. We need energetic, experienced bartenders who thrive in a fast-paced, high-volume environment. Great tips and an unforgettable season guaranteed.\n\nYou'll be serving hundreds of skiers and snowboarders daily in one of the busiest bars on the mountain. Expect high energy, great music, and an incredible atmosphere every shift.",
    requirements:
      "• Serving It Right certification (or willing to obtain)\n• 1+ year bar experience in a high-volume setting\n• Must be comfortable working late nights and weekends\n• Cocktail knowledge is an asset\n• Team player with a positive attitude",
    pay: "CAD $17/hr + tips (avg $30–40/hr total)",
    type: "Full-time",
    startDate: "Nov 25, 2025",
    endDate: "Apr 10, 2026",
    posted: "Sep 15, 2025",
    housing: false,
    housingDetails: null,
    skiPass: false,
    meals: true,
    language: "English",
    visaSponsorship: false,
    urgent: true,
    applicants: 12,
    interviews: 1,
    views: 890,
  },
  j3: {
    id: "j3",
    title: "Housekeeping Team Member",
    status: "active",
    resort: "Fairmont Chateau Whistler",
    location: "Whistler, Canada",
    businessName: "Fairmont Chateau Whistler",
    description:
      "The Fairmont Chateau Whistler is seeking reliable housekeeping staff for the busy winter season. You'll ensure our luxury guest rooms and public areas maintain the Fairmont standard of excellence.\n\nThis is a great opportunity to work at one of Canada's most prestigious mountain hotels while enjoying staff benefits including subsidized accommodation and ski passes.",
    requirements:
      "• Previous hotel housekeeping experience preferred\n• Strong attention to detail\n• Ability to work on your feet for extended periods\n• Some weekend and holiday shifts required\n• Reliable and punctual",
    pay: "CAD $19/hr",
    type: "Full-time",
    startDate: "Nov 15, 2025",
    endDate: "Apr 30, 2026",
    posted: "Oct 1, 2025",
    housing: true,
    housingDetails: "Staff accommodation provided at subsidised rate of $500/month, shared dorms with meals included.",
    skiPass: true,
    meals: true,
    language: "English",
    visaSponsorship: false,
    urgent: false,
    applicants: 8,
    interviews: 0,
    views: 560,
  },
  j4: {
    id: "j4",
    title: "Chef de Partie",
    status: "paused",
    resort: "Le Refuge Alpine",
    location: "Chamonix, France",
    businessName: "Le Refuge Alpine Restaurant",
    description:
      "Le Refuge Alpine is a highly regarded mountain restaurant in Chamonix, known for its modern take on traditional Savoyard cuisine. We're looking for an experienced Chef de Partie to join our kitchen brigade for the winter season.\n\nYou'll be responsible for running your section during busy service periods, preparing mise en place, and maintaining the highest standards of food quality and hygiene.",
    requirements:
      "• Culinary diploma or equivalent experience\n• 2+ years experience in a professional kitchen\n• Knowledge of French cuisine is a strong advantage\n• Food safety certification\n• Able to work under pressure during peak service\n• English or French fluency required",
    pay: "€2,400/month",
    type: "Full-time",
    startDate: "Dec 1, 2025",
    endDate: "Mar 31, 2026",
    posted: "Aug 20, 2025",
    housing: true,
    housingDetails: "Private staff apartment provided in Chamonix centre, shared between 2 staff members.",
    skiPass: true,
    meals: true,
    language: "English or French",
    visaSponsorship: false,
    urgent: false,
    applicants: 6,
    interviews: 2,
    views: 420,
  },
  j5: {
    id: "j5",
    title: "Lift Operator",
    status: "closed",
    resort: "Vail Mountain Resort",
    location: "Vail, USA",
    businessName: "Vail Resorts",
    description:
      "Join the Vail Mountain Resort lift operations team for the 2025/26 season. As a Lift Operator, you'll play a critical role in ensuring the safe and efficient operation of our chairlifts and gondolas.\n\nThis is an outdoor role that requires working in all weather conditions. You'll interact with guests daily, helping them load and unload safely while maintaining a friendly, professional demeanor.",
    requirements:
      "• Must be 18 years or older\n• Ability to work outdoors in extreme cold and variable weather\n• Strong communication skills\n• Previous customer service experience preferred\n• Must pass a background check\n• Available for full season commitment",
    pay: "USD $18–20/hr",
    type: "Full-time",
    startDate: "Nov 10, 2025",
    endDate: "Apr 20, 2026",
    posted: "Jul 10, 2025",
    housing: true,
    housingDetails: "Employee housing available in Vail at $450/month including utilities.",
    skiPass: true,
    meals: false,
    language: "English",
    visaSponsorship: false,
    urgent: false,
    applicants: 22,
    interviews: 5,
    views: 1890,
  },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Active" },
  paused: { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", label: "Paused" },
  closed: { bg: "bg-gray-50 border-gray-200", text: "text-gray-500", label: "Closed" },
};

/* ─── Page ───────────────────────────────────────────────── */

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [listing, setListing] = useState(() => demoListings[id] || null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: listing?.title || "",
    description: listing?.description || "",
    requirements: listing?.requirements || "",
    pay: listing?.pay || "",
    startDate: listing?.startDate || "",
    endDate: listing?.endDate || "",
  });

  if (!listing) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center">
        <p className="text-foreground/50">Listing not found.</p>
        <Link href="/business/manage-listings" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to Manage Listings
        </Link>
      </div>
    );
  }

  const style = STATUS_STYLES[listing.status];

  const handleStatusAction = async (action: "pause" | "resume" | "close" | "reopen") => {
    setActionLoading(action);
    await new Promise((r) => setTimeout(r, 800));

    const statusMap: Record<string, "active" | "paused" | "closed"> = {
      pause: "paused",
      resume: "active",
      close: "closed",
      reopen: "active",
    };
    setListing({ ...listing, status: statusMap[action] });
    setActionLoading(null);
  };

  const handleSaveEdit = async () => {
    setActionLoading("save");
    await new Promise((r) => setTimeout(r, 800));
    setListing({
      ...listing,
      title: editForm.title,
      description: editForm.description,
      requirements: editForm.requirements,
      pay: editForm.pay,
      startDate: editForm.startDate,
      endDate: editForm.endDate,
    });
    setEditing(false);
    setActionLoading(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back link */}
      <Link
        href="/business/manage-listings"
        className="mb-4 inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Manage Listings
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-primary">{listing.title}</h1>
            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
              {style.label}
            </span>
            {listing.urgent && (
              <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
                Urgently Hiring
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-foreground/60">
            {listing.businessName} · {listing.location}
          </p>
        </div>
      </div>

      {/* Action bar */}
      <div className="mt-5 flex flex-wrap gap-2">
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-accent bg-white px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
          >
            Edit Listing
          </button>
        )}
        {listing.status === "active" && (
          <>
            <button
              onClick={() => handleStatusAction("pause")}
              disabled={actionLoading !== null}
              className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-100 disabled:opacity-50"
            >
              {actionLoading === "pause" ? "Pausing…" : "Pause Listing"}
            </button>
            <button
              onClick={() => handleStatusAction("close")}
              disabled={actionLoading !== null}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {actionLoading === "close" ? "Closing…" : "Close Listing"}
            </button>
          </>
        )}
        {listing.status === "paused" && (
          <>
            <button
              onClick={() => handleStatusAction("resume")}
              disabled={actionLoading !== null}
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
            >
              {actionLoading === "resume" ? "Resuming…" : "Resume Listing"}
            </button>
            <button
              onClick={() => handleStatusAction("close")}
              disabled={actionLoading !== null}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:opacity-50"
            >
              {actionLoading === "close" ? "Closing…" : "Close Listing"}
            </button>
          </>
        )}
        {listing.status === "closed" && (
          <button
            onClick={() => handleStatusAction("reopen")}
            disabled={actionLoading !== null}
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
          >
            {actionLoading === "reopen" ? "Reopening…" : "Reopen Listing"}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-accent bg-white p-4 text-center">
          <p className="text-2xl font-bold text-primary">{listing.applicants}</p>
          <p className="text-xs uppercase tracking-wider text-foreground/50">Applicants</p>
        </div>
        <div className="rounded-xl border border-accent bg-white p-4 text-center">
          <p className="text-2xl font-bold text-primary">{listing.interviews}</p>
          <p className="text-xs uppercase tracking-wider text-foreground/50">Interviews</p>
        </div>
        <div className="rounded-xl border border-accent bg-white p-4 text-center">
          <p className="text-2xl font-bold text-primary">{listing.views.toLocaleString()}</p>
          <p className="text-xs uppercase tracking-wider text-foreground/50">Views</p>
        </div>
      </div>

      {/* Edit mode */}
      {editing ? (
        <div className="mt-6 space-y-5 rounded-xl border border-secondary bg-white p-6">
          <h2 className="text-lg font-semibold text-primary">Edit Listing</h2>

          <div>
            <label className="block text-sm font-medium text-foreground">Job Title</label>
            <input
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Description</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              rows={6}
              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">Requirements</label>
            <textarea
              value={editForm.requirements}
              onChange={(e) => setEditForm({ ...editForm, requirements: e.target.value })}
              rows={5}
              className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Pay</label>
              <input
                value={editForm.pay}
                onChange={(e) => setEditForm({ ...editForm, pay: e.target.value })}
                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Start Date</label>
              <input
                value={editForm.startDate}
                onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">End Date</label>
              <input
                value={editForm.endDate}
                onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-accent bg-white px-4 py-2.5 text-primary focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSaveEdit}
              disabled={actionLoading !== null}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {actionLoading === "save" ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEditForm({
                  title: listing.title,
                  description: listing.description,
                  requirements: listing.requirements,
                  pay: listing.pay,
                  startDate: listing.startDate,
                  endDate: listing.endDate,
                });
              }}
              className="rounded-lg border border-accent bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent/20"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Job details */}
          <div className="mt-6 rounded-xl border border-accent bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Job Details</h2>

            <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/60">Pay</span>
                <span className="font-medium text-primary">{listing.pay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Type</span>
                <span className="font-medium text-primary">{listing.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Start Date</span>
                <span className="font-medium text-primary">{listing.startDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">End Date</span>
                <span className="font-medium text-primary">{listing.endDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Language</span>
                <span className="font-medium text-primary">{listing.language}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Posted</span>
                <span className="font-medium text-primary">{listing.posted}</span>
              </div>
            </div>

            {/* Perks */}
            <div className="mt-5 flex flex-wrap gap-2">
              {listing.housing && (
                <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  Housing Included
                </span>
              )}
              {listing.skiPass && (
                <span className="inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
                  Ski Pass Included
                </span>
              )}
              {listing.meals && (
                <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                  Meals Included
                </span>
              )}
              {listing.visaSponsorship && (
                <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                  Visa Sponsorship
                </span>
              )}
            </div>
          </div>

          {/* Housing details */}
          {listing.housingDetails && (
            <div className="mt-4 rounded-xl border border-accent bg-white p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Accommodation</h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground/80">{listing.housingDetails}</p>
            </div>
          )}

          {/* Description */}
          <div className="mt-4 rounded-xl border border-accent bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Description</h2>
            <div className="mt-3 space-y-3">
              {listing.description.split("\n\n").map((p, i) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/80">{p}</p>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div className="mt-4 rounded-xl border border-accent bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground/50">Requirements</h2>
            <div className="mt-3 space-y-1.5">
              {listing.requirements.split("\n").map((line, i) => (
                <p key={i} className="text-sm leading-relaxed text-foreground/80">{line}</p>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

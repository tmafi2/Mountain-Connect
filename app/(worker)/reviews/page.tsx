"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Review {
  id: string;
  business_id: string;
  rating: number;
  title: string | null;
  review_text: string | null;
  season: string | null;
  position: string | null;
  would_recommend: boolean;
  created_at: string;
  business_profiles: { business_name: string; logo_url: string | null } | null;
}

interface Business {
  id: string;
  business_name: string;
  logo_url: string | null;
}

export default function WorkerReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [selectedBusiness, setSelectedBusiness] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [season, setSeason] = useState("");
  const [position, setPosition] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [reviewsRes, bizRes] = await Promise.all([
        fetch("/api/reviews"),
        fetch("/api/reviews/businesses"),
      ]);
      if (reviewsRes.ok) {
        const { reviews } = await reviewsRes.json();
        setReviews(reviews || []);
      }
      if (bizRes.ok) {
        const { businesses } = await bizRes.json();
        setBusinesses(businesses || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBusiness || rating === 0) {
      setError("Please select a business and rating");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: selectedBusiness,
          rating,
          title: title || undefined,
          review_text: reviewText || undefined,
          season: season || undefined,
          position: position || undefined,
          would_recommend: wouldRecommend,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit review");
        return;
      }

      // Reset form and reload
      setShowForm(false);
      setSelectedBusiness("");
      setRating(0);
      setTitle("");
      setReviewText("");
      setSeason("");
      setPosition("");
      setWouldRecommend(true);
      loadData();
    } catch {
      setError("Failed to submit review");
    } finally {
      setSubmitting(false);
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary">My Reviews</h1>
          <p className="mt-1 text-sm text-foreground/50">Review businesses you have worked with</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90"
        >
          {showForm ? "Cancel" : "Write a Review"}
        </button>
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="mb-8 rounded-xl border border-accent/30 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-primary mb-4">Write a Review</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Business Select */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary">Business</label>
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="w-full rounded-lg border border-accent/50 bg-white px-3 py-2.5 text-sm text-foreground focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              >
                <option value="">Select a business...</option>
                {businesses.map((biz) => (
                  <option key={biz.id} value={biz.id}>{biz.business_name}</option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-0.5"
                  >
                    <svg
                      className={`h-8 w-8 transition-colors ${
                        star <= (hoverRating || rating) ? "text-amber-400" : "text-gray-200"
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary">Review Title <span className="font-normal text-foreground/40">(optional)</span></label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Sum up your experience..."
                className="w-full rounded-lg border border-accent/50 bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>

            {/* Review Text */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-primary">Your Review <span className="font-normal text-foreground/40">(optional)</span></label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience working here..."
                rows={4}
                className="w-full rounded-lg border border-accent/50 bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>

            {/* Season + Position */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-primary">Season <span className="font-normal text-foreground/40">(optional)</span></label>
                <input
                  type="text"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="e.g. Winter 2025/26"
                  className="w-full rounded-lg border border-accent/50 bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-primary">Position <span className="font-normal text-foreground/40">(optional)</span></label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Ski Instructor"
                  className="w-full rounded-lg border border-accent/50 bg-white px-3 py-2.5 text-sm text-foreground placeholder:text-foreground/30 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
                />
              </div>
            </div>

            {/* Would Recommend */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setWouldRecommend(!wouldRecommend)}
                className={`relative h-6 w-11 rounded-full transition-colors ${wouldRecommend ? "bg-green-500" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${wouldRecommend ? "translate-x-5" : ""}`} />
              </button>
              <span className="text-sm text-foreground/70">I would recommend working here</span>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedBusiness || rating === 0}
              className="rounded-lg bg-secondary px-5 py-2.5 text-sm font-medium text-white hover:bg-secondary/90 disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </form>
        </div>
      )}

      {/* Existing Reviews */}
      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-accent/50 bg-white p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
          <p className="mt-4 text-sm font-medium text-foreground/50">No reviews yet</p>
          <p className="mt-1 text-xs text-foreground/35">Share your experience working at mountain businesses</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-accent/30 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {review.business_profiles?.logo_url ? (
                    <img src={review.business_profiles.logo_url} alt="" className="h-10 w-10 rounded-lg border border-accent/30 object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20 text-xs font-bold text-primary/60">
                      {review.business_profiles?.business_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <Link href={`/business/${review.business_id}`} className="text-sm font-semibold text-primary hover:text-secondary">
                      {review.business_profiles?.business_name}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg
                            key={star}
                            className={`h-3.5 w-3.5 ${star <= review.rating ? "text-amber-400" : "text-gray-200"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      {review.season && <span className="text-xs text-foreground/40">{review.season}</span>}
                    </div>
                  </div>
                </div>
                {review.would_recommend && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Recommends</span>
                )}
              </div>
              {review.title && <p className="mt-3 text-sm font-semibold text-primary">{review.title}</p>}
              {review.review_text && <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">{review.review_text}</p>}
              {review.position && <p className="mt-2 text-xs text-foreground/40">Position: {review.position}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

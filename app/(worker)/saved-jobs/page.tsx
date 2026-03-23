export default function SavedJobsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-primary">Saved Jobs</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Jobs you&apos;ve bookmarked for later.
      </p>

      <div className="mt-8 rounded-xl border border-accent bg-white p-10 text-center">
        <svg
          className="mx-auto h-12 w-12 text-foreground/20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        <h2 className="mt-4 text-lg font-semibold text-primary">
          No saved jobs
        </h2>
        <p className="mt-2 text-sm text-foreground/60">
          Bookmark jobs while browsing to save them here for easy access.
        </p>
      </div>
    </div>
  );
}

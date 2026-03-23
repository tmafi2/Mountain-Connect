export default function PostJobPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-primary">Post a New Job</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Create a job listing to find seasonal workers for your business.
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
            d="M12 4v16m8-8H4"
          />
        </svg>
        <h2 className="mt-4 text-lg font-semibold text-primary">
          Job posting form coming soon
        </h2>
        <p className="mt-2 text-sm text-foreground/60">
          You&apos;ll be able to create detailed job listings with role
          requirements, pay details, perks, and more.
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-xl font-semibold text-primary">Page not found</h1>
      <p className="mt-2 text-sm text-foreground/50">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex items-center gap-4">
        <Link
          href="/"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-primary/90"
        >
          Go Home
        </Link>
        <Link
          href="/jobs"
          className="rounded-xl border border-accent/50 bg-white px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-accent/20"
        >
          Browse Jobs
        </Link>
      </div>
    </div>
  );
}

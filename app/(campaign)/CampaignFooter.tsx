import Image from "next/image";
import Link from "next/link";

/** Only what a paid landing page has to carry: who we are and the legal links. */
export default function CampaignFooter() {
  return (
    <footer className="border-t border-white/10 bg-primary">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2.5">
          <Image src="/images/logo-source.png" alt="" width={28} height={28} className="h-7 w-7 rounded" />
          <span className="text-sm font-bold text-white">Mountain Connects</span>
        </div>
        <nav aria-label="Legal" className="-mx-2 flex items-center gap-2 text-sm">
          <Link
            href="/privacy"
            className="rounded-md px-2 py-2 text-white/75 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-highlight"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="rounded-md px-2 py-2 text-white/75 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-highlight"
          >
            Terms
          </Link>
        </nav>
        <p className="text-sm text-white/60">&copy; {new Date().getFullYear()} Mountain Connects</p>
      </div>
    </footer>
  );
}

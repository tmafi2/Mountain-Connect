import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tyler Mafi — Mountain Connects",
  description: "Founder of Mountain Connects — connecting seasonal workers with ski resorts worldwide.",
  robots: { index: false, follow: false },
};

export default function TylerContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#1a3a5c]">
      <div className="pointer-events-none fixed -right-20 -top-20 h-72 w-72 rounded-full bg-secondary/10 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-20 -left-10 h-64 w-64 rounded-full bg-highlight/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col px-5 py-10">
        {/* Top brand */}
        <Link href="/" className="flex items-center gap-2 self-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-source.png" alt="Mountain Connects" className="h-10 w-10" />
          <span className="text-sm font-bold uppercase tracking-[0.25em] text-white/90">
            Mountain Connects
          </span>
        </Link>

        {/* Card */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl">
          {/* Banner */}
          <div className="relative h-28 bg-gradient-to-br from-[#0a1e33] via-[#0f2942] to-[#1a3a5c]">
            <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
          </div>

          {/* Logo tile over banner edge */}
          <div className="relative -mt-10 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-white shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo-source.png" alt="" className="h-14 w-14" />
            </div>
          </div>

          {/* Name + title */}
          <div className="px-6 pb-6 pt-4 text-center">
            <h1 className="text-2xl font-extrabold text-[#0a1e33]">Tyler Mafi</h1>
            <p className="mt-0.5 text-sm font-semibold text-secondary">Founder, Mountain Connects</p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/60">
              Connecting seasonal workers with ski resorts worldwide.
            </p>
          </div>

          {/* Add to contacts — primary action */}
          <div className="px-6 pb-6">
            <a
              href="/connect/tyler.vcf"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0a1e33] px-5 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-[#132d4a]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add to Contacts
            </a>
          </div>

          {/* Contact rows */}
          <div className="divide-y divide-accent/40 border-t border-accent/40">
            <ContactRow
              href="tel:+61468939113"
              label="Call"
              value="0468 939 113"
              icon={
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              }
            />
            <ContactRow
              href="mailto:tyler@mountainconnects.com"
              label="Email"
              value="tyler@mountainconnects.com"
              icon={
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              }
            />
            <ContactRow
              href="https://www.mountainconnects.com"
              label="Website"
              value="mountainconnects.com"
              icon={
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A9.004 9.004 0 0121 12a9.004 9.004 0 01-.157 1.672m-15.686 0A9.004 9.004 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              }
            />
          </div>

          {/* Explore the platform */}
          <div className="border-t border-accent/40 bg-accent/5 p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/50">
              Explore Mountain Connects
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/card?c=tyler&cta=hiring"
                prefetch={false}
                className="rounded-xl border border-accent bg-white px-3 py-2 text-center text-xs font-semibold text-primary transition-colors hover:bg-accent/20"
              >
                I&apos;m hiring
              </Link>
              <Link
                href="/card?c=tyler&cta=worker"
                prefetch={false}
                className="rounded-xl border border-accent bg-white px-3 py-2 text-center text-xs font-semibold text-primary transition-colors hover:bg-accent/20"
              >
                Looking for work
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-white/40">
          Mountain Connects — seasonal ski jobs worldwide
        </p>
      </div>
    </div>
  );
}

function ContactRow({
  href,
  label,
  value,
  icon,
}: {
  href: string;
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-6 py-3.5 transition-colors hover:bg-accent/10"
      {...(href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
        <div className="h-4 w-4">{icon}</div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/40">{label}</p>
        <p className="truncate text-sm font-medium text-primary">{value}</p>
      </div>
      <svg className="h-4 w-4 shrink-0 text-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  );
}

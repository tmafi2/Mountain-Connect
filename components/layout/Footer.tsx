import Image from "next/image";
import Link from "next/link";

const footerLinks = {
  Platform: [
    { href: "/explore", label: "Explore Resorts" },
    { href: "/explore#towns", label: "Explore Towns" },
    { href: "/jobs", label: "Find Jobs" },
    { href: "/regions", label: "Regions" },
    { href: "/signup", label: "Sign Up" },
  ],
  Company: [
    { href: "/about", label: "About" },
    { href: "/about#contact", label: "Contact" },
  ],
  "For Businesses": [
    { href: "/signup?role=business", label: "Post a Job" },
    { href: "/about#business", label: "Business Info" },
  ],
};

export default function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-white/5 bg-primary text-white">
      {/* Subtle glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full bg-secondary/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/images/Logo.jpeg"
                alt="Mountain Connect"
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-contain"
              />
              <span className="text-lg font-bold tracking-tight">Mountain Connect</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/40">
              The premium platform connecting seasonal workers with ski resort businesses worldwide.
            </p>
            <p className="mt-4 text-xs text-white/20">
              Find your season. Find your mountain.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/30">
                {title}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/50 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
          <p className="text-xs text-white/25">
            &copy; {new Date().getFullYear()} Mountain Connect. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="text-xs text-white/25 transition-colors hover:text-white/50">Privacy</Link>
            <Link href="/about" className="text-xs text-white/25 transition-colors hover:text-white/50">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

import Image from "next/image";
import Link from "next/link";

const footerLinks = {
  Platform: [
    { href: "/explore", label: "Explore Resorts" },
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
    <footer className="border-t border-accent bg-primary text-white">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/images/Logo.jpeg"
                alt="Mountain Connect"
                width={48}
                height={48}
                className="h-12 w-12 rounded-lg object-contain"
              />
              <span className="text-xl font-semibold">Mountain Connect</span>
            </div>
            <p className="mt-3 text-base text-secondary">
              Connecting seasonal workers with ski resort businesses worldwide.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="mb-3 text-base font-semibold uppercase tracking-wider text-secondary">
                {title}
              </h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-base text-accent transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-base text-secondary">
          &copy; {new Date().getFullYear()} Mountain Connect. All rights
          reserved.
        </div>
      </div>
    </footer>
  );
}

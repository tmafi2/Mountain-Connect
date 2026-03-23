import Link from "next/link";

const features = [
  {
    title: "Build Your Profile",
    description:
      "Create a reusable work profile with your full history, skills, and availability. Apply to multiple jobs instantly.",
    icon: "👤",
  },
  {
    title: "Discover Resorts",
    description:
      "Explore ski resorts across the globe with our interactive 3D map. Find your next adventure.",
    icon: "🏔️",
  },
  {
    title: "Find Seasonal Work",
    description:
      "Browse verified job listings from resorts and businesses. Accommodation info, salary ranges, and more.",
    icon: "💼",
  },
  {
    title: "For Businesses",
    description:
      "Post jobs, find reliable seasonal staff, and manage applications — all in one verified platform.",
    icon: "🏢",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
        <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
              Your next mountain
              <span className="block text-secondary">adventure starts here</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-secondary/80">
              Mountain Connect brings seasonal workers and ski resort businesses
              together. Discover resorts worldwide, build your profile, and land
              your next role on the slopes.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-secondary"
              >
                Get Started
              </Link>
              <Link
                href="/explore"
                className="rounded-lg border border-secondary/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Explore Resorts
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-primary">
            Everything you need for seasonal work
          </h2>
          <p className="mt-3 text-foreground">
            Whether you&apos;re a worker seeking your next season or a business
            hiring staff.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-accent bg-white p-6 transition-shadow hover:shadow-lg"
            >
              <div className="text-3xl">{feature.icon}</div>
              <h3 className="mt-4 text-lg font-semibold text-primary">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-secondary/10">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold text-primary">
            Ready to connect with the mountains?
          </h2>
          <p className="mt-3 text-foreground">
            Join thousands of seasonal workers and businesses already on Mountain
            Connect.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
            >
              Sign Up Free
            </Link>
            <Link
              href="/about"
              className="rounded-lg border border-primary px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

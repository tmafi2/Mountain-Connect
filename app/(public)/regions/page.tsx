import Link from "next/link";
import { regions } from "@/lib/data/regions";

export default function RegionsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-16">
      <h1 className="text-4xl font-bold text-primary">Ski Regions</h1>
      <p className="mt-3 text-foreground">
        Explore ski regions around the world and discover resorts hiring seasonal
        workers.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {regions.map((region) => (
          <Link
            key={region.id}
            href={`/regions/${region.id}`}
            className="group overflow-hidden rounded-xl border border-accent bg-white transition-shadow hover:shadow-lg"
          >
            {/* Image placeholder */}
            <div className="flex h-40 items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/30">
              <span className="text-4xl">🏔️</span>
            </div>
            <div className="p-5">
              <h2 className="text-xl font-semibold text-primary group-hover:text-secondary">
                {region.name}
              </h2>
              <p className="mt-1 text-sm text-foreground/70">{region.country}</p>
              <p className="mt-2 text-sm text-foreground">{region.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
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
            className="group overflow-hidden rounded-xl border border-accent bg-white transition-all hover:shadow-lg hover:-translate-y-1"
          >
            {/* Region image */}
            <div className="relative h-44 overflow-hidden">
              <Image
                src={region.image_url}
                alt={region.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-primary backdrop-blur-sm">
                  {region.country}
                </span>
              </div>
            </div>
            <div className="p-5">
              <h2 className="text-xl font-semibold text-primary group-hover:text-secondary transition-colors">
                {region.name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-foreground/70">{region.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { regions } from "@/lib/data/regions";
import { resorts } from "@/lib/data/resorts";

interface RegionPageProps {
  params: Promise<{ id: string }>;
}

const BASE_URL = "https://www.mountainconnects.com";

export async function generateMetadata({ params }: RegionPageProps): Promise<Metadata> {
  const { id } = await params;
  const region = regions.find((r) => r.id === id);

  if (!region) return { title: "Region Not Found | Mountain Connects" };

  const resortCount = resorts.filter((r) => r.region_id === id).length;
  const title = `Ski Resort Jobs in ${region.name}`;
  const description = resortCount > 0
    ? `${region.description} Browse seasonal jobs at ${resortCount} resort${resortCount === 1 ? "" : "s"} across ${region.name}.`
    : `${region.description} Explore seasonal work opportunities across ${region.name}.`;

  return {
    title: `${title} | Mountain Connects`,
    description: description.slice(0, 160),
    alternates: { canonical: `${BASE_URL}/regions/${id}` },
    openGraph: {
      title,
      description: description.slice(0, 160),
      url: `${BASE_URL}/regions/${id}`,
      siteName: "Mountain Connects",
      type: "website",
      images: [
        {
          url: `${BASE_URL}/opengraph-image.jpg`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description.slice(0, 160),
      images: [`${BASE_URL}/opengraph-image.jpg`],
    },
  };
}

export default async function RegionDetailPage({ params }: RegionPageProps) {
  const { id } = await params;
  const region = regions.find((r) => r.id === id);

  if (!region) {
    notFound();
  }

  const regionResorts = resorts.filter((r) => r.region_id === id);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Regions", item: `${BASE_URL}/regions` },
      { "@type": "ListItem", position: 3, name: region.name, item: `${BASE_URL}/regions/${id}` },
    ],
  };

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
    />
    <div className="mx-auto max-w-7xl px-6 py-16">
      <Link
        href="/regions"
        className="text-sm text-foreground hover:text-primary"
      >
        ← Back to Regions
      </Link>

      <h1 className="mt-4 text-4xl font-bold text-primary">{region.name}</h1>
      <p className="mt-1 text-lg text-foreground/70">{region.country}</p>
      <p className="mt-4 text-foreground">{region.description}</p>

      <h2 className="mt-10 text-2xl font-semibold text-primary">
        Resorts in {region.name}
      </h2>

      {regionResorts.length === 0 ? (
        <p className="mt-4 text-foreground">
          No resorts listed yet for this region. Check back soon!
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {regionResorts.map((resort) => (
            <Link
              key={resort.id}
              href={`/resorts/${resort.id}`}
              className="group rounded-xl border border-accent bg-white p-5 transition-shadow hover:shadow-lg"
            >
              <h3 className="text-lg font-semibold text-primary group-hover:text-secondary">
                {resort.name}
              </h3>
              <p className="mt-1 text-sm text-foreground/70">{resort.country}</p>
              <p className="mt-2 text-sm text-foreground line-clamp-2">
                {resort.description}
              </p>
              <div className="mt-3 flex gap-4 text-xs text-foreground/60">
                <span>{resort.num_runs} runs</span>
                <span>{resort.num_lifts} lifts</span>
                <span>{resort.vertical_drop_m}m drop</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

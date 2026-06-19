import Link from "next/link";
import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { SEO_LANDING_PAGES } from "@/lib/seo-pages";
import { breadcrumbSchema, buildPageMetadata, organizationSchema, webPageSchema } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "AI Video & Image Features — Text to Video, UGC Ads & Studio Pro",
  description:
    "Explore LiteMoov features: AI text-to-video, UGC ad generation, image creation, Studio Pro workflows, and social media video tools for marketing teams.",
  path: "/features",
  keywords: [
    "AI video features",
    "text to video",
    "UGC ad tools",
    "AI image generator",
    "Studio Pro",
  ],
});

export default function FeaturesIndexPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            organizationSchema(),
            webPageSchema({
              path: "/features",
              name: "LiteMoov Features",
              description:
                "AI text-to-video, UGC ads, image generation, Studio Pro, and social video tools.",
              type: "CollectionPage",
            }),
            breadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Features", path: "/features" },
            ]),
          ],
        }}
      />
      <PublicPageLayout
      title="Features"
      description="AI-powered tools for video, image, and ad creation — built for modern marketing teams."
    >
      <div className="mx-auto grid max-w-5xl gap-6 px-5 md:grid-cols-2 md:px-8">
        {SEO_LANDING_PAGES.map((page) => (
          <Link
            key={page.slug}
            href={`/features/${page.slug}`}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
          >
            <h2 className="font-display text-xl font-semibold text-zinc-900">{page.h1}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">{page.subtitle}</p>
            <span className="mt-4 inline-block text-sm font-medium text-violet-700">
              Learn more →
            </span>
          </Link>
        ))}
      </div>
      </PublicPageLayout>
    </>
  );
}

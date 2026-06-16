import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JsonLd } from "@/components/seo/JsonLd";
import { SeoFeaturePage } from "@/components/seo/SeoFeaturePage";
import { getAllSeoLandingSlugs, getSeoLandingPage } from "@/lib/seo-pages";
import { buildFeaturePageJsonLd, buildPageMetadata } from "@/lib/seo";

type FeatureSlugPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllSeoLandingSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: FeatureSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoLandingPage(slug);

  if (!page) {
    return { title: "Feature not found" };
  }

  return buildPageMetadata({
    title: page.title,
    description: page.metaDescription,
    path: `/features/${page.slug}`,
    keywords: page.keywords,
  });
}

export default async function FeatureSlugPage({ params }: FeatureSlugPageProps) {
  const { slug } = await params;
  const page = getSeoLandingPage(slug);

  if (!page) {
    notFound();
  }

  return (
    <>
      <JsonLd
        data={buildFeaturePageJsonLd({
          slug: page.slug,
          title: page.title,
          description: page.metaDescription,
          faq: page.faq,
        })}
      />
      <SeoFeaturePage page={page} />
    </>
  );
}

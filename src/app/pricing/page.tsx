import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { PublicPageLayout } from "@/components/layout/PublicPageLayout";
import { buildPageMetadata, buildPricingJsonLd } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing — AI Video & UGC Ad Plans for Teams",
  description:
    "Compare LiteMoov plans for AI video generation, UGC ads, image creation, and Studio Pro. Free tier available. Flexible credits for premium models on paid plans.",
  path: "/pricing",
  keywords: [
    "LiteMoov pricing",
    "AI video generator pricing",
    "UGC ad platform cost",
    "AI marketing software plans",
  ],
});

export default function PricingPage() {
  return (
    <>
      <JsonLd data={buildPricingJsonLd()} />
      <PublicPageLayout
        title="Pricing"
        description="Flexible plans for teams creating AI-powered video, image, and ad content."
      >
        <LandingPricing />
      </PublicPageLayout>
    </>
  );
}

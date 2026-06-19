import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeroV2 } from "@/components/landing/LandingHeroV2";
import { LandingVideoMarqueeLight } from "@/components/landing/LandingVideoMarqueeLight";
import { LandingHowItWorksLight } from "@/components/landing/LandingHowItWorksLight";
import { LandingFeatureIllustrationsLight } from "@/components/landing/LandingFeatureIllustrationsLight";
import { LandingFeatureGridV2 } from "@/components/landing/LandingFeatureGridV2";
import { LandingPricing } from "@/components/landing/LandingPricing";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import {
  buildHomeJsonLd,
  buildPageMetadata,
  faqPageSchema,
  LANDING_FAQ_ITEMS,
} from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "LiteMoov — AI UGC Ad & Video Generator",
  description:
    "Make AI-powered UGC ads, Studio Pro flows, and social-ready videos in one workspace. Text-to-video, image generation, and team collaboration for marketing teams.",
  path: "/v2",
  // Preview route: keep out of the index until promoted to /.
  noindex: true,
});

export default function LandingV2Page() {
  // Reuse the home @graph but give the FAQ node a unique @id suffix so it
  // never collides with the home page's FAQ schema if both render.
  const jsonLd = { ...buildHomeJsonLd() };

  return (
    <div className="relative flex min-h-screen flex-col bg-white text-zinc-900">
      <PublicSiteHeader variant="light" mode="landing" />

      <main className="flex-1">
        {/* 1. Hero */}
        <LandingHeroV2 />

        {/* 2. Video marquee (light) */}
        <section className="overflow-hidden bg-white py-4 md:py-6">
          <LandingVideoMarqueeLight />
        </section>

        {/* 3. How it works */}
        <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <LandingHowItWorksLight />
        </section>

        {/* 4. Bento + Studio Pro */}
        <section className="mx-auto max-w-6xl px-5 pb-16 md:px-8 md:pb-24">
          <LandingFeatureIllustrationsLight />
        </section>

        {/* 5. Feature grid */}
        <section className="border-y border-zinc-100 bg-zinc-50/60 py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <LandingFeatureGridV2 />
          </div>
        </section>

        {/* 6. Pricing */}
        <LandingPricing />

        {/* 7. FAQ */}
        <LandingFAQ />

        {/* 8. Final CTA band */}
        <section className="border-t border-zinc-100 bg-white py-16 md:py-20">
          <div className="mx-auto max-w-3xl px-5 text-center md:px-8">
            <h2 className="font-display text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
              Start creating in minutes
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-600">
              Free to start, no credit card required. Paid plans include credits equal to
              your subscription.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <a
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-full bg-violet-600 px-6 text-sm font-medium text-white shadow-sm transition hover:bg-violet-700"
              >
                Sign up free
              </a>
              <a
                href="/features"
                className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-6 text-sm font-medium text-zinc-700 transition hover:border-zinc-300 hover:text-zinc-900"
              >
                Explore features
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* 9. Footer */}
      <LandingFooter />

      <JsonLd data={jsonLd} />
      <JsonLd data={faqPageSchema(LANDING_FAQ_ITEMS, "v2-faq")} />
    </div>
  );
}

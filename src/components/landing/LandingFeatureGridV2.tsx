import Link from "next/link";
import { ArrowUpRight, Clapperboard, Image as ImageIcon, Megaphone, Sparkles, Workflow } from "lucide-react";

import { LandingReveal } from "@/components/landing/LandingReveal";
import { SEO_LANDING_PAGES } from "@/lib/seo-pages";

// Stable icon mapping per feature slug (so each card gets a distinct glyph).
const FEATURE_ICONS: Record<string, typeof Sparkles> = {
  "text-to-video": Clapperboard,
  "ai-ugc-ads": Megaphone,
  "ai-image-generator": ImageIcon,
  "studio-pro": Workflow,
  "social-media-video-generator": Sparkles,
};

export function LandingFeatureGridV2() {
  return (
    <LandingReveal className="mx-auto max-w-2xl text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">
        Everything you need
      </p>
      <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl">
        One workspace for every ad format
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-600">
        From text-to-video to a visual workflow canvas — generate, edit, and publish
        without juggling tabs.
      </p>

      <div className="mt-10 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
        {SEO_LANDING_PAGES.map((feature, index) => {
          const Icon = FEATURE_ICONS[feature.slug] ?? Sparkles;
          // First card spans 2 columns on large screens to break the grid up.
          const featured = index === 0;
          return (
            <Link
              key={feature.slug}
              href={`/features/${feature.slug}`}
              className={`surface-soft group flex flex-col gap-3 border border-zinc-200/80 p-6 transition duration-300 hover:-translate-y-1 hover:border-zinc-300 hover:bg-white hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)] lg:p-7 ${
                featured ? "lg:col-span-2" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100 transition group-hover:scale-105">
                  <Icon className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-zinc-300 transition group-hover:text-violet-600" />
              </div>
              <h3 className="font-display text-lg font-semibold tracking-tight text-zinc-950">
                {feature.h1}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-600">
                {feature.subtitle}
              </p>
            </Link>
          );
        })}
      </div>
    </LandingReveal>
  );
}

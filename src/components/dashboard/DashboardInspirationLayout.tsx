"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Eye,
  Lightbulb,
  Sparkles,
  Trophy,
} from "lucide-react";

import {
  COMMUNITY_INSPIRATION,
  CREATIVE_HIGHLIGHTS,
  FEATURE_SPOTLIGHTS,
  type CommunityInspiration,
  type CreativeHighlight,
  type FeatureSpotlight,
} from "@/lib/inspiration-videos";
import { cn } from "@/lib/utils";

const accentStyles = {
  violet:
    "from-violet-50 to-white border-violet-100 hover:border-violet-200 dark:from-violet-950/30 dark:to-card dark:border-violet-900/40 dark:hover:border-violet-800/60",
  sky: "from-sky-50 to-white border-sky-100 hover:border-sky-200 dark:from-sky-950/30 dark:to-card dark:border-sky-900/40 dark:hover:border-sky-800/60",
  amber:
    "from-amber-50 to-white border-amber-100 hover:border-amber-200 dark:from-amber-950/30 dark:to-card dark:border-amber-900/40 dark:hover:border-amber-800/60",
} as const;

const badgeStyles: Record<string, string> = {
  Hot: "bg-orange-50 text-orange-700 ring-orange-100 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-900/50",
  Free: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/50",
  New: "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900/50",
  Trending: "bg-sky-50 text-sky-700 ring-sky-100 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900/50",
};

function FeatureSpotlightCard({ item }: { item: FeatureSpotlight }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex min-h-[148px] overflow-hidden rounded-2xl border bg-gradient-to-br p-6 transition hover:shadow-md",
        accentStyles[item.accent],
      )}
    >
      <div className="relative z-10 max-w-[58%] space-y-2">
        <h3 className="font-display text-xl font-semibold tracking-tight text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-400">
          {item.title}
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">{item.subtitle}</p>
      </div>

      <div className="pointer-events-none absolute inset-y-0 right-0 w-[46%] overflow-hidden">
        {item.previewVideo ? (
          <video
            src={item.previewVideo}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-cover opacity-90 transition group-hover:scale-105"
          />
        ) : item.previewImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.previewImage}
            alt=""
            className="h-full w-full object-cover opacity-90 transition group-hover:scale-105"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-card via-card/80 to-transparent dark:from-card dark:via-card/70 dark:to-transparent" />
      </div>
    </Link>
  );
}

function CommunityCard({ item }: { item: CommunityInspiration }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <Link
      href="/inspiration"
      className={cn(
        "group block w-[160px] shrink-0",
        item.featured && "rounded-[1.35rem] p-[2px] bg-gradient-to-br from-violet-400 via-sky-300 to-emerald-300",
      )}
      onMouseEnter={() => {
        videoRef.current?.play().catch(() => undefined);
      }}
    >
      <article
        className={cn(
          "overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-sm transition hover:shadow-md",
          item.featured && "border-0",
        )}
      >
        <div className="relative aspect-[9/16] overflow-hidden rounded-[1.15rem] bg-zinc-950">
          <video
            ref={videoRef}
            src={item.videoUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-contain"
          />
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1",
              badgeStyles[item.badge],
            )}
          >
            {item.badge}
          </span>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 pt-10">
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/75">{item.subtitle}</p>
          </div>
        </div>
      </article>
    </Link>
  );
}

function HighlightMedia({
  item,
  className,
}: {
  item: CreativeHighlight;
  className?: string;
}) {
  const mediaClass = cn("h-full w-full object-contain", className);

  if (item.videoUrl) {
    return (
      <video
        src={item.videoUrl}
        autoPlay
        muted
        loop
        playsInline
        className={mediaClass}
      />
    );
  }

  if (item.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.imageUrl} alt="" className={mediaClass} />
    );
  }

  return null;
}

function PhonePreview({
  item,
  className,
}: {
  item: CreativeHighlight;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl bg-zinc-950 ring-1 ring-zinc-200/80 dark:ring-zinc-700/80",
        className,
      )}
    >
      <HighlightMedia item={item} />
    </div>
  );
}

function FeaturedHighlightCard({ item }: { item: CreativeHighlight }) {
  return (
    <Link
      href={item.href}
      className="group block rounded-2xl bg-gradient-to-br from-violet-400/70 via-sky-300/70 to-emerald-300/70 p-[2px] transition hover:shadow-md"
    >
      <article className="flex items-center gap-4 overflow-hidden rounded-[0.95rem] bg-card p-4">
        <PhonePreview item={item} className="aspect-[9/16] w-[108px]" />

        <div className="min-w-0 flex-1 space-y-2.5">
          {item.tag ? (
            <span className="inline-flex w-fit rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
              {item.tag}
            </span>
          ) : null}
          <div className="space-y-1">
            <h3 className="font-display text-lg font-semibold tracking-tight text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-400">
              {item.title}
            </h3>
            <p className="line-clamp-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">{item.description}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 transition group-hover:gap-2">
            {item.ctaLabel ?? "Explore"}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </article>
    </Link>
  );
}

function HighlightCard({ item }: { item: CreativeHighlight }) {
  return (
    <Link
      href={item.href}
      className="group flex min-w-[260px] max-w-[320px] shrink-0 items-center gap-3 overflow-hidden rounded-xl border border-border bg-card p-3 transition hover:-translate-y-0.5 hover:border-border/80 hover:shadow-sm"
    >
      <PhonePreview item={item} className="aspect-[9/16] w-[84px]" />

      <div className="min-w-0 flex-1 space-y-2">
        {item.tag ? (
          <span className="inline-flex w-fit rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
            {item.tag}
          </span>
        ) : null}
        <div className="space-y-1">
          <h3 className="text-sm font-medium leading-snug text-foreground group-hover:text-violet-700 dark:group-hover:text-violet-400">
            {item.title}
          </h3>
          <p className="line-clamp-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{item.description}</p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition group-hover:text-violet-600">
          {item.ctaLabel ?? "Learn more"}
          <ArrowRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}

function CreativeHighlightsSection() {
  const featured = CREATIVE_HIGHLIGHTS.find((item) => item.featured) ?? CREATIVE_HIGHLIGHTS[0];
  const rest = CREATIVE_HIGHLIGHTS.filter((item) => item.id !== featured.id);

  return (
    <section className="rounded-2xl border border-border bg-muted/30 p-4 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium text-amber-700 shadow-sm ring-1 ring-amber-100 dark:text-amber-400 dark:ring-amber-900/50">
            <Trophy className="h-3.5 w-3.5" />
            Creative highlights
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Pick your next workflow
            </h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
              Jump into Studio Pro, inspiration, templates, or image editing with curated starting points.
            </p>
          </div>
        </div>
        <Link
          href="/inspiration"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-violet-600 dark:hover:text-violet-400"
        >
          View all inspiration
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-3">
        <FeaturedHighlightCard item={featured} />
        <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rest.map((item) => (
            <HighlightCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function DashboardInspirationLayout() {
  return (
    <section className="space-y-14 py-6 md:py-10">
      <div className="grid gap-4 lg:grid-cols-3">
        {FEATURE_SPOTLIGHTS.map((item) => (
          <FeatureSpotlightCard key={item.title} item={item} />
        ))}
      </div>

      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-violet-600" />
          <h2 className="text-sm font-medium text-foreground">All-in-One AI Creation Community</h2>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {COMMUNITY_INSPIRATION.map((item) => (
            <CommunityCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      <CreativeHighlightsSection />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl border border-border bg-muted/40 px-8 py-10 text-center"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-card shadow-sm">
          <Sparkles className="h-5 w-5 text-violet-600" />
        </div>
        <h3 className="mt-4 font-display text-2xl font-semibold text-foreground">
          Start with the prompt bar
        </h3>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          Use the floating bar at the bottom to describe your idea, or explore formats and templates below.
        </p>
        <Link
          href="/inspiration"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          <Eye className="h-4 w-4" />
          Open inspiration feed
        </Link>
      </motion.div>
    </section>
  );
}

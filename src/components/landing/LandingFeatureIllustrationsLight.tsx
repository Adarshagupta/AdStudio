"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  Layers3,
  MessageCircle,
  Video,
} from "lucide-react";

import { LandingReveal } from "@/components/landing/LandingReveal";
import { LandingStudioProDemo } from "@/components/landing/LandingStudioProDemo";
import { Button } from "@/components/ui/button";
import { LANDING_PREVIEW_VIDEOS } from "@/lib/landing-media";
import { cn } from "@/lib/utils";

/**
 * Light / neutral copy of LandingFeatureIllustrations for landing v2.
 * Violet ring/icon accents → zinc; violet bars → neutral. Layout preserved.
 */
function PreviewVideo({ src, className }: { src: string; className?: string }) {
  return (
    <video
      src={src}
      className={cn("h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]", className)}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
    />
  );
}

function SectionHeading({ eyebrow, title, align = "center" }: { eyebrow: string; title: string; align?: "left" | "center" }) {
  return (
    <div className={cn("mb-8 md:mb-10", align === "center" && "mx-auto max-w-2xl text-center")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{eyebrow}</p>
      <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-zinc-950 md:text-4xl">{title}</h3>
    </div>
  );
}

function FormatFan() {
  const rotations = [-7, -2, 3, 6];
  const offsets = [12, 4, 4, 12];

  return (
    <div className="flex flex-wrap items-end justify-center gap-3 py-4 md:gap-5">
      {LANDING_PREVIEW_VIDEOS.slice(0, 4).map((src, index) => (
        <LandingReveal key={src} delay={index * 70}>
          <Link
            href="/signup"
            className="landing-format-shine group relative block aspect-[9/14] w-[130px] overflow-hidden rounded-[1.35rem] border-2 border-white bg-zinc-950 shadow-[0_20px_50px_rgba(15,23,42,0.18)] transition duration-500 hover:z-10 hover:-translate-y-3 hover:scale-105 hover:shadow-[0_28px_60px_rgba(15,23,42,0.28)] sm:w-[150px] md:w-[172px]"
            style={{
              transform: `rotate(${rotations[index]}deg) translateY(${offsets[index]}px)`,
            }}
          >
            <PreviewVideo src={src} />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent opacity-80 transition group-hover:opacity-90" />
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-zinc-700 via-zinc-400 to-zinc-200 opacity-0 transition group-hover:opacity-100" />
          </Link>
        </LandingReveal>
      ))}
    </div>
  );
}

function BentoTile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "landing-hover-lift group relative overflow-hidden rounded-[1.35rem] bg-white ring-1 ring-zinc-200/70 shadow-[0_12px_40px_rgba(15,23,42,0.06)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CornerIcon({ icon: Icon }: { icon: typeof Video }) {
  return (
    <span className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-zinc-700 shadow-md backdrop-blur-sm ring-1 ring-zinc-100 transition group-hover:scale-110">
      <Icon className="h-4 w-4" />
    </span>
  );
}

const BAR_HEIGHTS = [38, 62, 45, 92, 70, 100];

export function LandingFeatureIllustrationsLight() {
  return (
    <>
      <LandingReveal className="mt-20 md:mt-28" delay={80}>
        <SectionHeading eyebrow="Formats" title="Vertical ads, ready for feed" />
        <FormatFan />
      </LandingReveal>

      <LandingReveal className="mt-20 md:mt-28" delay={100}>
        <div id="studio" className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading eyebrow="Studio Pro" title="Infinite node canvas" align="left" />
          <Button
            asChild
            size="lg"
            className="shrink-0 rounded-full bg-zinc-950 px-6 shadow-lg transition hover:scale-105 hover:bg-zinc-800"
          >
            <Link href="/signup">Open canvas</Link>
          </Button>
        </div>
        <LandingStudioProDemo />
      </LandingReveal>

      <LandingReveal className="mt-20 md:mt-28" delay={60}>
        <SectionHeading eyebrow="Toolkit" title="Your full creative stack" />
        <div className="grid auto-rows-[minmax(180px,auto)] gap-3 md:grid-cols-4 md:gap-4">
          <BentoTile className="md:col-span-2 md:row-span-2 min-h-[280px]">
            <CornerIcon icon={MessageCircle} />
            <div className="flex h-full min-h-[280px] flex-col justify-end gap-3 bg-gradient-to-br from-zinc-50/60 to-white p-4 pt-14">
              <div className="ml-auto w-[78%] rounded-2xl rounded-tr-sm bg-zinc-900 p-3 shadow-lg shadow-zinc-900/15">
                <div className="space-y-2">
                  <div className="h-2 w-full rounded-full bg-white/30" />
                  <div className="h-2 w-4/5 rounded-full bg-white/20" />
                </div>
              </div>
              <div className="w-[88%] overflow-hidden rounded-2xl rounded-tl-sm bg-white p-2 shadow-xl ring-1 ring-zinc-100">
                <div className="aspect-[16/10] overflow-hidden rounded-xl bg-zinc-950">
                  <PreviewVideo src={LANDING_PREVIEW_VIDEOS[4]} />
                </div>
              </div>
            </div>
          </BentoTile>

          <BentoTile className="md:col-span-2 min-h-[200px]">
            <CornerIcon icon={Video} />
            <div className="aspect-[21/9] bg-zinc-950 md:aspect-auto md:min-h-[200px]">
              <PreviewVideo src={LANDING_PREVIEW_VIDEOS[5]} />
            </div>
          </BentoTile>

          <BentoTile className="min-h-[200px]">
            <CornerIcon icon={BarChart3} />
            <div className="flex h-full min-h-[200px] items-end gap-1.5 px-4 pb-5 pt-12">
              {BAR_HEIGHTS.map((height, index) => (
                <div
                  key={index}
                  className="landing-bar-rise flex-1 rounded-t-md bg-gradient-to-t from-zinc-800 via-zinc-600 to-zinc-300"
                  style={{ height: `${height}%`, animationDelay: `${index * 0.08}s` }}
                />
              ))}
            </div>
          </BentoTile>

          <BentoTile className="min-h-[200px]">
            <CornerIcon icon={Layers3} />
            <div className="grid h-full min-h-[200px] grid-cols-2 gap-1.5 p-2.5">
              {LANDING_PREVIEW_VIDEOS.slice(0, 4).map((src, index) => (
                <div
                  key={src}
                  className={cn(
                    "overflow-hidden rounded-xl bg-zinc-900",
                    index === 0 && "col-span-2 aspect-[2/1]",
                    index > 0 && "aspect-square",
                  )}
                >
                  <PreviewVideo src={src} />
                </div>
              ))}
            </div>
          </BentoTile>
        </div>
      </LandingReveal>
    </>
  );
}

"use client";

import { FEATURED_INSPIRATION_VIDEOS } from "@/lib/inspiration-videos";

const LOOP_VIDEOS = [...FEATURED_INSPIRATION_VIDEOS, ...FEATURED_INSPIRATION_VIDEOS];

/**
 * Light-themed variant of LandingVideoMarquee.
 * White edge fades and zinc borders so it sits on a white section background.
 */
export function LandingVideoMarqueeLight() {
  return (
    <div className="landing-video-marquee relative mt-10 w-screen max-w-[100vw] -translate-x-1/2 left-1/2 md:mt-12">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent md:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent md:w-24" />

      <div className="overflow-hidden">
        <div className="landing-video-track flex w-max gap-4 px-4 md:gap-5 md:px-6">
          {LOOP_VIDEOS.map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="h-[220px] w-[124px] shrink-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-[0_8px_28px_rgba(15,23,42,0.08)] transition duration-300 hover:scale-[1.04] hover:border-zinc-300 hover:shadow-[0_14px_40px_rgba(15,23,42,0.14)] sm:h-[260px] sm:w-[146px] md:h-[300px] md:w-[168px]"
            >
              <video
                src={src}
                className="h-full w-full object-cover transition duration-500 hover:scale-110"
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

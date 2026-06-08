"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

import { LANDING_PREVIEW_VIDEOS } from "@/lib/landing-media";
import { cn } from "@/lib/utils";

const prompts = [
  "UGC talking-head ad with natural light and a friendly on-camera tone",
  "Brain-rot style short with bold captions and fast cuts",
  "Product hero shot on a clean gradient with studio lighting",
] as const;

/** Single preview — avoids downloading 3 large MP4s on every auth page. */
const HERO_VIDEO = LANDING_PREVIEW_VIDEOS[0];

export function AuthVisualPanel() {
  const [activePrompt, setActivePrompt] = useState(0);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const promptTimer = window.setInterval(() => {
      setActivePrompt((current) => (current + 1) % prompts.length);
    }, 4800);
    return () => window.clearInterval(promptTimer);
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const mq = window.matchMedia("(min-width: 1024px)");
    if (!mq.matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoadVideo(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(panel);
    return () => observer.disconnect();
  }, []);

  const prompt = prompts[activePrompt];

  return (
    <aside
      ref={panelRef}
      className="relative hidden h-full min-h-0 flex-col overflow-hidden lg:flex"
      aria-hidden
    >
      <div className="relative flex h-full min-h-0 flex-col px-8 py-8 sm:px-10 xl:px-12 xl:py-10">
        <p className="shrink-0 max-w-sm text-sm leading-relaxed text-violet-950/75">
          Create UGC ads, Studio Pro flows, and social-ready videos in one workspace.
        </p>

        <div className="relative mx-auto mt-6 flex min-h-0 w-full max-w-[200px] flex-1 items-center justify-center">
          <div className="landing-phone-float relative z-10 w-full">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-white/30 bg-violet-200/40 shadow-lg shadow-violet-900/10">
              <div className="aspect-[9/16] w-full">
                {shouldLoadVideo ? (
                  <video
                    src={HERO_VIDEO}
                    className="h-full w-full object-cover"
                    muted
                    loop
                    playsInline
                    autoPlay
                    preload="none"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-b from-violet-300/80 to-violet-100/60" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto shrink-0 space-y-3 pt-4">
          <div className="rounded-2xl border border-violet-200/70 bg-white/65 p-3 shadow-sm shadow-violet-900/5 backdrop-blur-sm">
            <div className="flex items-start gap-2.5">
              <p className="min-h-[40px] flex-1 text-[13px] leading-snug text-violet-950/85">
                <span className="text-violet-600/70">Describe your ad — </span>
                {prompt}
                <span className="auth-prompt-cursor ml-0.5 inline-block h-4 w-[2px] align-middle bg-violet-600" />
              </p>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-md shadow-violet-600/20"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex justify-center gap-1.5">
            {prompts.map((_, index) => (
              <button
                key={index}
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => setActivePrompt(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === activePrompt ? "w-5 bg-violet-600" : "w-1.5 bg-violet-300",
                )}
              />
            ))}
          </div>

          <p className="text-center text-xs font-medium text-violet-800/60">
            Claim 25 free credits after signup
          </p>
        </div>
      </div>
    </aside>
  );
}

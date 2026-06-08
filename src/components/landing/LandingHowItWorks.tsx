"use client";

import { useEffect, useState } from "react";

import { LandingReveal } from "@/components/landing/LandingReveal";
import { LANDING_PREVIEW_VIDEOS } from "@/lib/landing-media";
import { cn } from "@/lib/utils";

const PHASES = ["describe", "generate", "publish"] as const;
const PHASE_LABELS = ["Describe", "Generate", "Publish"];

const CHANNEL_DOTS = [
  "bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]",
  "bg-gradient-to-br from-sky-400 to-blue-600",
  "bg-gradient-to-br from-violet-500 to-fuchsia-500",
];

function PreviewVideo({ src, className }: { src: string; className?: string }) {
  return (
    <video
      src={src}
      className={cn("h-full w-full object-cover", className)}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
    />
  );
}

function PhoneDevice({
  src,
  className,
  float = false,
  tilt,
}: {
  src: string;
  className?: string;
  float?: boolean;
  tilt?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.6rem] border-[2.5px] border-zinc-900 bg-zinc-900 shadow-[0_24px_50px_rgba(15,23,42,0.35)]",
        float && "landing-phone-float",
        float === false && tilt === "left" && "landing-phone-float",
        float === false && tilt === "right" && "landing-phone-float-alt",
        tilt === "left" && "-rotate-6",
        tilt === "right" && "rotate-6",
        className,
      )}
    >
      <div className="absolute left-1/2 top-2 z-10 h-1 w-10 -translate-x-1/2 rounded-full bg-zinc-800" />
      <div className="aspect-[9/16] w-[128px] sm:w-[142px] md:w-[150px] lg:w-[164px]">
        <PreviewVideo src={src} />
      </div>
    </div>
  );
}

function ChatIllustration({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-[300px] flex-col justify-center overflow-hidden px-6 py-8 sm:min-h-[360px] md:px-8",
        className,
      )}
    >
      <div className="landing-glow-orb pointer-events-none absolute -right-12 top-0 h-48 w-48 rounded-full bg-violet-300/40 blur-3xl" />
      <div className="relative mx-auto w-full max-w-[260px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_16px_40px_rgba(124,58,237,0.12)] ring-1 ring-violet-100/80">
          <div className="flex items-center gap-1 border-b border-violet-50 bg-violet-50/60 px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
            <span className="h-1.5 w-1.5 rounded-full bg-zinc-300" />
          </div>
          <div className="space-y-3 bg-gradient-to-b from-white to-violet-50/30 p-3.5">
            <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-md bg-violet-600 px-3 py-2.5 shadow-md shadow-violet-600/20">
              <div className="space-y-1.5">
                <div className="landing-type-line landing-type-line-1 h-1.5 w-full rounded-full bg-white/35" />
                <div className="landing-type-line landing-type-line-2 h-1.5 w-[85%] rounded-full bg-white/25" />
              </div>
            </div>
            <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-zinc-100 bg-white p-2 shadow-sm">
              <div className="aspect-[5/3] overflow-hidden rounded-lg bg-zinc-900">
                <PreviewVideo src={LANDING_PREVIEW_VIDEOS[4]} />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 px-2.5 py-2">
              <div className="h-7 flex-1 space-y-1">
                <div className="landing-type-line landing-type-line-3 h-1 w-[70%] rounded-full bg-violet-300/80" />
                <div className="h-1 w-[40%] rounded-full bg-zinc-200" />
              </div>
              <span className="landing-send-pulse h-8 w-8 shrink-0 rounded-full bg-zinc-900" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GenerateIllustration({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "landing-gradient-shift relative flex h-full min-h-[300px] items-center justify-center overflow-hidden sm:min-h-[360px]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-violet-200/70 via-[#f4f0ff] to-cyan-100/80" />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.7),transparent_55%)]"
        aria-hidden
      />
      <div className="landing-glow-orb pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-cyan-300/45 blur-3xl" />

      <div className="landing-phone-glow relative z-10">
        <PhoneDevice src={LANDING_PREVIEW_VIDEOS[0]} float className="shadow-[0_28px_60px_rgba(124,58,237,0.25)]" />
      </div>

      <div className="absolute bottom-6 left-5 right-5 z-10 md:bottom-8 md:left-8 md:right-8">
        <div className="mx-auto flex max-w-[220px] items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 shadow-lg backdrop-blur-sm">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-violet-100">
            <div className="landing-progress-bar h-full w-[58%] rounded-full bg-gradient-to-r from-violet-600 to-violet-400" />
          </div>
          <span className="h-2 w-2 rounded-full bg-violet-500 landing-sparkle-spin" aria-hidden />
        </div>
      </div>
    </div>
  );
}

function PublishIllustration({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-[300px] items-center justify-center overflow-hidden sm:min-h-[360px]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(124,58,237,0.08),transparent_50%),linear-gradient(180deg,#fff,#f8f6ff)]" />
      <div className="relative flex items-end gap-2 pb-6 pt-8 md:gap-3">
        <PhoneDevice src={LANDING_PREVIEW_VIDEOS[1]} tilt="left" />
        <PhoneDevice src={LANDING_PREVIEW_VIDEOS[2]} tilt="right" className="-mb-3 md:-mb-5" />
      </div>
      <div className="absolute bottom-5 flex gap-2 md:bottom-7">
        {CHANNEL_DOTS.map((dot, index) => (
          <span
            key={dot}
            className={cn(
              "h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm",
              dot,
              index === 0 && "landing-icon-pop",
              index === 1 && "landing-icon-pop-delayed",
              index === 2 && "landing-icon-pop",
            )}
            style={index === 2 ? { animationDelay: "0.9s" } : undefined}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

function ZoneDivider() {
  return (
    <div className="relative hidden w-px shrink-0 bg-zinc-100 md:block" aria-hidden>
      <span className="landing-how-flow-dot absolute left-1/2 top-[38%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-violet-400" />
      <span
        className="landing-how-flow-dot absolute left-1/2 top-[52%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-violet-300"
        style={{ animationDelay: "0.35s" }}
      />
      <span
        className="landing-how-flow-dot absolute left-1/2 top-[66%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-violet-200"
        style={{ animationDelay: "0.7s" }}
      />
    </div>
  );
}

function PhaseCaption({
  index,
  active,
  onSelect,
}: {
  index: number;
  active: boolean;
  onSelect?: () => void;
}) {
  const content = (
    <>
      <span className="mr-2 tabular-nums text-zinc-400">0{index + 1}</span>
      {PHASE_LABELS[index]}
    </>
  );

  const className = cn(
    "flex-1 py-3.5 text-center text-[10px] font-medium uppercase tracking-[0.26em] transition-colors duration-300",
    active ? "text-zinc-900" : "text-zinc-400",
  );

  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={cn(className, "bg-transparent")}>
        {content}
      </button>
    );
  }

  return <span className={className}>{content}</span>;
}

function DesktopStrip() {
  return (
    <div className="flex min-h-[360px] md:min-h-[400px]">
      <div className="min-w-0 flex-[1.05] border-r border-zinc-100 bg-[#f7f7f8]">
        <ChatIllustration className="min-h-[360px] md:min-h-[400px]" />
      </div>
      <ZoneDivider />
      <div className="min-w-0 flex-1">
        <GenerateIllustration className="min-h-[360px] md:min-h-[400px]" />
      </div>
      <ZoneDivider />
      <div className="min-w-0 flex-[0.95] border-l border-zinc-100">
        <PublishIllustration className="min-h-[360px] md:min-h-[400px]" />
      </div>
    </div>
  );
}

function MobilePhaseView({ phase }: { phase: number }) {
  if (phase === 0) return <ChatIllustration className="min-h-[320px] sm:min-h-[360px]" />;
  if (phase === 1) return <GenerateIllustration className="min-h-[320px] sm:min-h-[360px]" />;
  return <PublishIllustration className="min-h-[320px] sm:min-h-[360px]" />;
}

function UnifiedStrip() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const id = window.setInterval(() => {
      setPhase((current) => (current + 1) % PHASES.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <LandingReveal delay={60}>
      <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_20px_50px_rgba(91,33,182,0.1)] md:rounded-3xl">
        <div className="hidden md:block">
          <DesktopStrip />
          <div className="flex divide-x divide-zinc-100 border-t border-zinc-100 bg-zinc-50/40">
            {PHASES.map((_, index) => (
              <PhaseCaption key={PHASES[index]} index={index} active />
            ))}
          </div>
        </div>

        <div className="md:hidden">
          <MobilePhaseView phase={phase} />
          <div className="flex divide-x divide-zinc-100 border-t border-zinc-100 bg-zinc-50/40">
            {PHASES.map((_, index) => (
              <PhaseCaption
                key={PHASES[index]}
                index={index}
                active={phase === index}
                onSelect={() => setPhase(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </LandingReveal>
  );
}

export function LandingHowItWorks() {
  return (
    <div>
      <LandingReveal className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">How it works</p>
        <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-zinc-950 md:text-5xl md:leading-[1.08]">
          Create. Generate. Ship.
        </h2>
      </LandingReveal>

      <div className="mt-10 md:mt-12">
        <UnifiedStrip />
      </div>
    </div>
  );
}

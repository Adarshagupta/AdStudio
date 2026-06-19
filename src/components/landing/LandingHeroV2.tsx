"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ImagePlus, Loader2, Send, Sparkles, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveDashboardChatLaunch, type ChatToolMode } from "@/lib/dashboard-chat";
import {
  type DashboardOutputType,
  validateDashboardPrompt,
} from "@/lib/dashboard-generation";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

const outputModes: { id: DashboardOutputType; label: string; icon: typeof Video }[] = [
  { id: "video", label: "Video", icon: Video },
  { id: "image", label: "Image", icon: ImagePlus },
];

/**
 * Light-themed hero for landing v2.
 *
 * White background, dark text, a single violet primary CTA, and an embedded
 * prompt box (simplified — no reference-image upload, keeps the surface light)
 * that launches the same /signup?prompt=... flow as v1.
 */
export function LandingHeroV2() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [outputType, setOutputType] = useState<DashboardOutputType>("video");
  const [isStarting, setIsStarting] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  function handleGenerate() {
    const validation = validateDashboardPrompt(prompt, false);
    if (!validation.ok) {
      setInputError(validation.message);
      notify.error(validation.message);
      return;
    }

    setInputError(null);
    const toolMode: ChatToolMode = outputType === "image" ? "image" : "video";
    saveDashboardChatLaunch({
      prompt: validation.prompt,
      toolMode,
      aspectRatio: "9:16",
    });
    setIsStarting(true);

    const signupUrl = new URL("/signup", window.location.origin);
    signupUrl.searchParams.set("prompt", validation.prompt);
    signupUrl.searchParams.set("tool", toolMode);
    signupUrl.searchParams.set("aspect", "9:16");
    router.push(`${signupUrl.pathname}${signupUrl.search}`);
  }

  return (
    <section className="relative overflow-hidden bg-white">
      {/* Subtle top radial wash — single accent, very light. */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(139,92,246,0.08),transparent_60%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-5 pb-16 pt-20 text-center md:px-8 md:pb-20 md:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1.5 text-xs font-medium text-zinc-600">
          <Sparkles className="h-3.5 w-3.5 text-violet-600" />
          AI UGC ads · Studio Pro · Social publishing
        </span>

        <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-zinc-950 sm:text-5xl md:text-6xl">
          UGC ads, produced in minutes.
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg md:text-xl">
          Make AI-powered UGC ads, Studio Pro flows, and social-ready videos — all in
          one workspace. Start free; payment method optional.
        </p>

        {/* Prompt box */}
        <div className="mt-8 w-full max-w-2xl text-left">
          <div className="mb-3 flex justify-center gap-2">
            {outputModes.map((mode) => {
              const Icon = mode.icon;
              const active = outputType === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition",
                    active
                      ? "bg-zinc-900 text-white shadow-sm"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900",
                  )}
                  disabled={isStarting}
                  onClick={() => setOutputType(mode.id)}
                >
                  <Icon className="h-4 w-4" />
                  {mode.label}
                </button>
              );
            })}
          </div>

          <div className="surface-elevated rounded-2xl border border-zinc-200 p-3 transition-shadow focus-within:border-zinc-300 focus-within:shadow-[0_12px_40px_rgba(15,23,42,0.10)]">
            <Textarea
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                if (inputError) setInputError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleGenerate();
                }
              }}
              disabled={isStarting}
              className="min-h-[72px] resize-none border-0 bg-transparent p-1 text-base leading-6 text-zinc-800 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={
                outputType === "video"
                  ? "Describe your ad — hook, product, audience…"
                  : "Describe the image you want — style, product, mood…"
              }
            />

            {inputError ? (
              <p className="mt-1 px-1 text-sm text-red-600">{inputError}</p>
            ) : null}

            <div className="mt-2 flex items-center justify-between">
              <span className="px-1 text-xs text-zinc-400">
                Press <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-sans text-[10px] text-zinc-500">Enter</kbd> to generate
              </span>
              <Button
                type="button"
                size="icon"
                className="h-10 w-10 shrink-0 rounded-full"
                aria-label="Continue to create"
                disabled={isStarting}
                onClick={handleGenerate}
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="rounded-full px-6">
            <Link href="/signup">
              Start free <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="rounded-full px-6">
            <Link href="/features">See how it works</Link>
          </Button>
        </div>

        <p className="mt-5 text-xs text-zinc-400">
          No credit card required · Paid plans include credits equal to your subscription
        </p>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Wand2,
  User,
  ScreenShare,
  MessageSquare,
  Star,
  Shield,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { FormatConfig } from "@/lib/formats";
import { cn } from "@/lib/utils";

const toneColors: Record<FormatConfig["tone"], string> = {
  zinc: "bg-zinc-900",
  purple: "bg-purple-600",
  amber: "bg-amber-500",
  emerald: "bg-emerald-600",
};

const toneBorders: Record<FormatConfig["tone"], string> = {
  zinc: "border-zinc-200",
  purple: "border-purple-200",
  amber: "border-amber-200",
  emerald: "border-emerald-200",
};

const toneBgLight: Record<FormatConfig["tone"], string> = {
  zinc: "bg-zinc-50",
  purple: "bg-purple-50",
  amber: "bg-amber-50",
  emerald: "bg-emerald-50",
};

const featureDetails: Record<
  string,
  {
    icon: typeof User;
    benefits: { icon: typeof Zap; title: string; description: string }[];
    howItWorks: { step: number; title: string; description: string }[];
  }
> = {
  "ugc-talking-head": {
    icon: User,
    benefits: [
      {
        icon: User,
        title: "Authentic Creator Feel",
        description: "Generate scripts that sound like real creators, not corporate ads.",
      },
      {
        icon: Zap,
        title: "Instant Generation",
        description: "Get a complete talking-head script in seconds from your product description.",
      },
      {
        icon: TrendingUp,
        title: "Paid Social Optimized",
        description: "Built for Meta, TikTok, and YouTube Shorts performance.",
      },
    ],
    howItWorks: [
      { step: 1, title: "Describe your product", description: "Paste your product URL or describe what you're selling." },
      { step: 2, title: "Pick a creator voice", description: "Choose the tone and style that matches your brand." },
      { step: 3, title: "Generate & export", description: "Get a script ready to film or use with an AI avatar." },
    ],
  },
  "split-screen": {
    icon: ScreenShare,
    benefits: [
      {
        icon: ScreenShare,
        title: "Dual Narrative",
        description: "Pair narration with product footage for maximum impact.",
      },
      {
        icon: Zap,
        title: "Auto Synced",
        description: "Generated scripts automatically match product B-roll timing.",
      },
      {
        icon: Shield,
        title: "Proof-Driven",
        description: "Show product features while explaining benefits aloud.",
      },
    ],
    howItWorks: [
      { step: 1, title: "Upload product media", description: "Add your product video or images for the split screen." },
      { step: 2, title: "Write narration", description: "Describe the story you want to tell alongside the visuals." },
      { step: 3, title: "Generate split-screen", description: "Get a script with timing cues for both sides of the screen." },
    ],
  },
  "brain-rot": {
    icon: Sparkles,
    benefits: [
      {
        icon: Zap,
        title: "Fast Paced",
        description: "Quick cuts, captions, and hooks that stop the scroll.",
      },
      {
        icon: TrendingUp,
        title: "Retention Optimized",
        description: "Designed to keep viewers watching past the 3-second mark.",
      },
      {
        icon: Wand2,
        title: "Trending Formats",
        description: "Subway Surfers, capybaras, and meme-style content automatically.",
      },
    ],
    howItWorks: [
      { step: 1, title: "Pick your hook style", description: "Choose from trending brain-rot formats." },
      { step: 2, title: "Add your product", description: "Insert your product into the fast-paced narrative." },
      { step: 3, title: "Generate chaos", description: "Get a high-energy script with edit cues and captions." },
    ],
  },
  "review-style": {
    icon: Star,
    benefits: [
      {
        icon: Star,
        title: "Proof-First",
        description: "Lead with real outcomes and social proof, not hype.",
      },
      {
        icon: MessageSquare,
        title: "Clear CTAs",
        description: "Built-in call-to-action placement that converts viewers.",
      },
      {
        icon: Shield,
        title: "Trust Building",
        description: "Review-style scripts that feel honest and persuasive.",
      },
    ],
    howItWorks: [
      { step: 1, title: "Enter your product", description: "Describe what you're reviewing and its key benefits." },
      { step: 2, title: "Set the outcome", description: "Define the transformation or result your product delivers." },
      { step: 3, title: "Generate review", description: "Get a proof-driven review script with before/after flow." },
    ],
  },
};

export function FeaturePage({
  format,
  canCreate,
}: {
  format: FormatConfig;
  canCreate: boolean;
}) {
  const details = featureDetails[format.slug] ?? {
    icon: Sparkles,
    benefits: [],
    howItWorks: [],
  };

  const Icon = details.icon;
  const bgLight = toneBgLight[format.tone];
  const borderColor = toneBorders[format.tone];

  return (
    <div className="space-y-16">
      {/* Hero */}
      <motion.section
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br p-8 text-white md:p-12"
        style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative">
          <motion.div
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Icon className="h-4 w-4" />
            {format.format === "UGC" ? "UGC Format" : format.format === "BRAIN_ROT" ? "Hook Format" : format.format === "REVIEW" ? "Review Format" : "Ad Format"}
          </motion.div>
          <motion.h1
            className="font-display text-3xl font-bold tracking-tight md:text-5xl"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 20 }}
          >
            {format.name}
          </motion.h1>
          <motion.p
            className="mt-4 max-w-xl text-lg text-white/80"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 20 }}
          >
            {format.description}
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
          >
            <Link href={`/create/${format.slug}`}>
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  className="gap-2 rounded-full bg-white text-zinc-900 hover:bg-white/90"
                  disabled={!canCreate}
                >
                  <Sparkles className="h-4 w-4" />
                  Start Creating
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </motion.div>
            </Link>
            <Link href="/dashboard">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  Back to Dashboard
                </Button>
              </motion.div>
            </Link>
          </motion.div>
          {!canCreate && (
            <motion.p
              className="mt-4 text-sm text-amber-300"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Content creation is disabled for your account. Ask an admin to enable it.
            </motion.p>
          )}
        </div>
      </motion.section>

      {/* Benefits */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 20 }}
      >
        <h2 className="mb-8 font-display text-2xl font-semibold text-zinc-900">
          Why use {format.name}?
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {details.benefits.map((benefit, i) => {
            const BIcon = benefit.icon;
            return (
              <motion.div
                key={i}
                className={cn(
                  "rounded-2xl border p-6 transition-all",
                  borderColor,
                  bgLight,
                )}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.1, type: "spring", stiffness: 300, damping: 15 }}
                whileHover={{ scale: 1.02, y: -4 }}
              >
                <div className={cn("mb-4 inline-flex rounded-xl p-3", toneColors[format.tone])}>
                  <BIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mb-2 font-medium text-zinc-900">{benefit.title}</h3>
                <p className="text-sm text-zinc-500">{benefit.description}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* How It Works */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
      >
        <h2 className="mb-8 font-display text-2xl font-semibold text-zinc-900">
          How it works
        </h2>
        <div className="relative">
          {/* Connecting line */}
          <div className="absolute left-6 top-8 bottom-8 w-px bg-zinc-200 md:left-8" />
          <div className="space-y-6">
            {details.howItWorks.map((step, i) => (
              <motion.div
                key={i}
                className="relative flex gap-4 md:gap-6"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.15, type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className={cn(
                  "relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white md:h-16 md:w-16 md:text-lg",
                  toneColors[format.tone],
                )}>
                  {step.step}
                </div>
                <div className="flex-1 rounded-2xl border border-zinc-100 bg-white p-5 shadow-sm">
                  <h3 className="mb-1 font-medium text-zinc-900">{step.title}</h3>
                  <p className="text-sm text-zinc-500">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA */}
      <motion.section
        className={cn(
          "rounded-3xl p-8 text-center md:p-12",
          bgLight,
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 20 }}
      >
        <h2 className="mb-3 font-display text-2xl font-bold text-zinc-900 md:text-3xl">
          Ready to create your first {format.name}?
        </h2>
        <p className="mx-auto mb-8 max-w-md text-zinc-500">
          It takes less than a minute to generate a script. No filming required — use AI avatars or export for your creator team.
        </p>
        <Link href={`/create/${format.slug}`}>
          <motion.div
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block"
          >
            <Button
              size="lg"
              className={cn(
                "gap-2 rounded-full",
                toneColors[format.tone],
                "text-white hover:opacity-90",
              )}
              disabled={!canCreate}
            >
              <Sparkles className="h-4 w-4" />
              Start Creating Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </Link>
      </motion.section>
    </div>
  );
}

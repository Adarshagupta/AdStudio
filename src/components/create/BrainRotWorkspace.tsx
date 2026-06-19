"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Zap, Wand2, Play, ArrowRight, Flame, Type, Video } from "lucide-react";

import { ScriptEditor } from "@/components/create/ScriptEditor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type BrainRotPayload = {
  productDescription: string;
  productUrl: string;
  scriptText: string;
  hookStyle: string;
  duration: number;
  captionDensity: "low" | "medium" | "high";
  musicStyle: string;
  aspectRatio: string;
};

const hookStyles = [
  { id: "subway-surfers", label: "Subway Surfers", icon: Video },
  { id: "capybara", label: "Capybara chill", icon: Flame },
  { id: "meme", label: "Meme format", icon: Type },
  { id: "fast-cuts", label: "Fast cuts", icon: Zap },
];

export function BrainRotWorkspace({
  isSubmitting,
  isGeneratingScript,
  initialPrompt = "",
  onGenerate,
  onGenerateScript,
}: {
  isSubmitting: boolean;
  isGeneratingScript: boolean;
  initialPrompt?: string;
  onGenerate: (payload: BrainRotPayload) => Promise<void>;
  onGenerateScript: (payload: Pick<BrainRotPayload, "productDescription" | "productUrl">) => Promise<string>;
}) {
  const [productDescription, setProductDescription] = useState(initialPrompt);
  const [productUrl, setProductUrl] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [hookStyle, setHookStyle] = useState("subway-surfers");
  const [duration, setDuration] = useState(10);
  const [captionDensity, setCaptionDensity] = useState<"low" | "medium" | "high">("high");
  const [musicStyle, setMusicStyle] = useState("trending");
  const [aspectRatio, setAspectRatio] = useState("9:16");

  const canGenerate = productDescription.trim().length >= 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          <Flame className="h-3.5 w-3.5" />
          Brain Rot / Hook
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold text-zinc-900">
          Fast edits, captions, retention hooks
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          High-energy, fast-paced content designed to stop the scroll and keep viewers watching.
        </p>
      </motion.div>

      {/* Step 1: Hook Style */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Card className="space-y-4 bg-white p-5">
          <StepBadge number={1} title="Pick your hook style" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {hookStyles.map((style) => {
              const Icon = style.icon;
              return (
                <motion.button
                  key={style.id}
                  type="button"
                  onClick={() => setHookStyle(style.id)}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors",
                    hookStyle === style.id
                      ? "border-amber-500 bg-amber-50 text-amber-900"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{style.label}</span>
                </motion.button>
              );
            })}
          </div>
        </Card>
      </motion.div>

      {/* Step 2: Product Brief */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Card className="space-y-4 bg-white p-5">
          <StepBadge number={2} title="What's your product?" />
          <Textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            className="min-h-[100px] resize-none"
            placeholder="Describe your product in 1-2 sentences. Brain rot scripts are short and punchy. Example: 'A $5 phone stand that actually works.'"
          />
          <Input
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="https://your-product.com (optional)"
          />
        </Card>
      </motion.div>

      {/* Step 3: Script */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Card className="space-y-4 bg-white p-5">
          <div className="flex items-center justify-between">
            <StepBadge number={3} title="Script & captions" />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="secondary"
                size="sm"
                disabled={isGeneratingScript || !canGenerate}
                onClick={async () => {
                  try {
                    const script = await onGenerateScript({ productDescription, productUrl });
                    setScriptText(script);
                  } catch { /* handled by parent */ }
                }}
                className="gap-2"
              >
                <Wand2 className="h-4 w-4" />
                {isGeneratingScript ? "Generating..." : "Generate script"}
              </Button>
            </motion.div>
          </div>
          <ScriptEditor
            value={scriptText}
            onChange={setScriptText}
          />
        </Card>
      </motion.div>

      {/* Step 4: Style Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Card className="space-y-5 bg-white p-5">
          <StepBadge number={4} title="Style options" />

          {/* Duration */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-500">Duration</p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={30}
                step={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <span className="w-12 text-right text-sm font-medium">{duration}s</span>
            </div>
          </div>

          {/* Caption Density */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-zinc-500">Caption density</p>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((density) => (
                <button
                  key={density}
                  type="button"
                  onClick={() => setCaptionDensity(density)}
                  className={cn(
                    "h-9 flex-1 rounded-md border text-sm capitalize transition-colors",
                    captionDensity === density
                      ? "border-amber-500 bg-amber-50 text-amber-900"
                      : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                  )}
                >
                  {density}
                </button>
              ))}
            </div>
          </div>

          {/* Music & Aspect */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">Music style</p>
              <div className="flex gap-2">
                {["trending", "hype", "chill"].map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setMusicStyle(style)}
                    className={cn(
                      "h-9 flex-1 rounded-md border text-sm capitalize transition-colors",
                      musicStyle === style
                        ? "border-amber-500 bg-amber-50 text-amber-900"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                    )}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">Aspect ratio</p>
              <div className="flex gap-2">
                {["9:16", "1:1"].map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={cn(
                      "h-9 flex-1 rounded-md border text-sm transition-colors",
                      aspectRatio === ratio
                        ? "border-amber-500 bg-amber-50 text-amber-900"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Generate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
        className="flex justify-end"
      >
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <Button
            size="lg"
            disabled={isSubmitting || !canGenerate}
            onClick={() =>
              onGenerate({
                productDescription,
                productUrl,
                scriptText,
                hookStyle,
                duration,
                captionDensity,
                musicStyle,
                aspectRatio,
              })
            }
            className="gap-2 rounded-full bg-amber-500 px-6 text-white hover:bg-amber-600"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                Queueing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate Hook Video
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function StepBadge({ number, title }: { number: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white">
        {number}
      </div>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
    </div>
  );
}

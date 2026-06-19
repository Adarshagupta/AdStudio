"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ScreenShare, Wand2, Play, ArrowRight, LayoutTemplate } from "lucide-react";

import { ScriptEditor } from "@/components/create/ScriptEditor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type SplitScreenPayload = {
  productDescription: string;
  productUrl: string;
  scriptText: string;
  narrationSide: "left" | "right" | "bottom";
  duration: number;
  resolution: string;
  referenceMediaUrl: string;
};

const layoutOptions = [
  { id: "left", label: "Narration left", desc: "Creator on left, product on right" },
  { id: "right", label: "Narration right", desc: "Product on left, creator on right" },
  { id: "bottom", label: "Narration bottom", desc: "Product full, creator at bottom" },
];

export function SplitScreenWorkspace({
  isSubmitting,
  isGeneratingScript,
  initialPrompt = "",
  onGenerate,
  onGenerateScript,
}: {
  isSubmitting: boolean;
  isGeneratingScript: boolean;
  initialPrompt?: string;
  onGenerate: (payload: SplitScreenPayload) => Promise<void>;
  onGenerateScript: (payload: Pick<SplitScreenPayload, "productDescription" | "productUrl">) => Promise<string>;
}) {
  const [productDescription, setProductDescription] = useState(initialPrompt);
  const [productUrl, setProductUrl] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [narrationSide, setNarrationSide] = useState<"left" | "right" | "bottom">("left");
  const [duration, setDuration] = useState(20);
  const [resolution, setResolution] = useState("720p");
  const [referenceMediaUrl, setReferenceMediaUrl] = useState("");

  const canGenerate = productDescription.trim().length >= 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700">
          <ScreenShare className="h-3.5 w-3.5" />
          Split Screen
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold text-zinc-900">
          Narration + product proof
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Pair talking-head narration with product footage on the same screen.
        </p>
      </motion.div>

      {/* Step 1: Layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Card className="space-y-4 bg-white p-5">
          <StepBadge number={1} title="Choose layout" />
          <div className="grid gap-3 sm:grid-cols-3">
            {layoutOptions.map((layout) => (
              <motion.button
                key={layout.id}
                type="button"
                onClick={() => setNarrationSide(layout.id as "left" | "right" | "bottom")}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors",
                  narrationSide === layout.id
                    ? "border-purple-500 bg-purple-50 text-purple-900"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                )}
              >
                <LayoutTemplate className="h-5 w-5" />
                <span className="text-sm font-medium">{layout.label}</span>
                <span className="text-[10px] text-zinc-500">{layout.desc}</span>
              </motion.button>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Step 2: Product Media */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Card className="space-y-4 bg-white p-5">
          <StepBadge number={2} title="Product media" />
          <Textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            className="min-h-[100px] resize-none"
            placeholder="Describe the product footage you have or want. What should the viewer see on screen?"
          />
          <Input
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="https://your-product.com (optional)"
          />
          <Input
            value={referenceMediaUrl}
            onChange={(e) => setReferenceMediaUrl(e.target.value)}
            placeholder="Reference media URL (optional) — video or image to show on the product side"
          />
        </Card>
      </motion.div>

      {/* Step 3: Narration Script */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Card className="space-y-4 bg-white p-5">
          <div className="flex items-center justify-between">
            <StepBadge number={3} title="Narration script" />
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
                {isGeneratingScript ? "Generating..." : "Generate narration"}
              </Button>
            </motion.div>
          </div>
          <ScriptEditor
            value={scriptText}
            onChange={setScriptText}
          />
        </Card>
      </motion.div>

      {/* Step 4: Output Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Card className="space-y-4 bg-white p-5">
          <StepBadge number={4} title="Output settings" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">Duration</p>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={10}
                  max={45}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="flex-1 accent-purple-600"
                />
                <span className="w-12 text-right text-sm font-medium">{duration}s</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-zinc-500">Resolution</p>
              <div className="flex gap-2">
                {["480p", "720p"].map((res) => (
                  <button
                    key={res}
                    type="button"
                    onClick={() => setResolution(res)}
                    className={cn(
                      "h-9 flex-1 rounded-md border text-sm transition-colors",
                      resolution === res
                        ? "border-purple-600 bg-purple-600 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                    )}
                  >
                    {res}
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
                narrationSide,
                duration,
                resolution,
                referenceMediaUrl,
              })
            }
            className="gap-2 rounded-full bg-purple-600 px-6 text-white hover:bg-purple-700"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                Queueing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate Split Screen
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
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
        {number}
      </div>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
    </div>
  );
}

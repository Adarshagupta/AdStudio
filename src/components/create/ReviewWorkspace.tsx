"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Star, Wand2, Play, ArrowRight } from "lucide-react";

import { ScriptEditor } from "@/components/create/ScriptEditor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type ReviewPayload = {
  productDescription: string;
  productUrl: string;
  scriptText: string;
  reviewType: string;
  duration: number;
  resolution: string;
  includeBeforeAfter: boolean;
  proofPoints: string;
};

const reviewTypes = [
  { id: "unboxing", label: "Unboxing", desc: "First impression and unpack" },
  { id: "comparison", label: "Comparison", desc: "Before vs after" },
  { id: "testimonial", label: "Testimonial", desc: "User story and results" },
  { id: "expert", label: "Expert", desc: "Professional analysis" },
];

export function ReviewWorkspace({
  isSubmitting,
  isGeneratingScript,
  initialPrompt = "",
  onGenerate,
  onGenerateScript,
}: {
  isSubmitting: boolean;
  isGeneratingScript: boolean;
  initialPrompt?: string;
  onGenerate: (payload: ReviewPayload) => Promise<void>;
  onGenerateScript: (payload: Pick<ReviewPayload, "productDescription" | "productUrl">) => Promise<string>;
}) {
  const [productDescription, setProductDescription] = useState(initialPrompt);
  const [productUrl, setProductUrl] = useState("");
  const [scriptText, setScriptText] = useState("");
  const [reviewType, setReviewType] = useState("unboxing");
  const [duration, setDuration] = useState(30);
  const [resolution, setResolution] = useState("720p");
  const [includeBeforeAfter, setIncludeBeforeAfter] = useState(true);
  const [proofPoints, setProofPoints] = useState("");

  const canGenerate = productDescription.trim().length >= 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <Star className="h-3.5 w-3.5" />
          Review Style
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold text-zinc-900">
          Proof-driven review ads
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Generate review scripts that build trust with clear proof points and honest outcomes.
        </p>
      </motion.div>

      {/* Step 1: Review Type */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Card className="space-y-4 bg-white p-5">
          <StepBadge number={1} title="Review format" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {reviewTypes.map((type) => (
              <motion.button
                key={type.id}
                type="button"
                onClick={() => setReviewType(type.id)}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-4 text-center transition-colors",
                  reviewType === type.id
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50",
                )}
              >
                <span className="text-sm font-medium">{type.label}</span>
                <span className="text-[10px] text-zinc-500">{type.desc}</span>
              </motion.button>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Step 2: Product & Proof */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Card className="space-y-4 bg-white p-5">
          <StepBadge number={2} title="Product & proof points" />
          <Textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            className="min-h-[100px] resize-none"
            placeholder="What product are you reviewing? What problem does it solve?"
          />
          <Textarea
            value={proofPoints}
            onChange={(e) => setProofPoints(e.target.value)}
            className="min-h-[80px] resize-none"
            placeholder="Proof points: star rating, review count, testimonials, results data, etc."
          />
          <Input
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="https://your-product.com (optional)"
          />
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={includeBeforeAfter}
              onChange={(e) => setIncludeBeforeAfter(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            Include before/after structure in the script
          </label>
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
            <StepBadge number={3} title="Review script" />
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
                  min={15}
                  max={60}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="flex-1 accent-emerald-600"
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
                        ? "border-emerald-600 bg-emerald-600 text-white"
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
                reviewType,
                duration,
                resolution,
                includeBeforeAfter,
                proofPoints,
              })
            }
            className="gap-2 rounded-full bg-emerald-600 px-6 text-white hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                Queueing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate Review Video
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
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
        {number}
      </div>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
    </div>
  );
}

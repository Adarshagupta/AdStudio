"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, User, Wand2, Play, ArrowRight } from "lucide-react";

import { AvatarPicker } from "@/components/create/AvatarPicker";
import { ScriptEditor } from "@/components/create/ScriptEditor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type UGCPayload = {
  productDescription: string;
  productUrl: string;
  avatarId: string;
  scriptText: string;
  duration: number;
  resolution: string;
};

export function UGCWorkspace({
  avatars,
  isSubmitting,
  isGeneratingScript,
  initialPrompt = "",
  onGenerate,
  onGenerateScript,
}: {
  avatars: Array<{ id: string; name: string; previewUrl: string; isSystem: boolean }>;
  isSubmitting: boolean;
  isGeneratingScript: boolean;
  initialPrompt?: string;
  onGenerate: (payload: UGCPayload) => Promise<void>;
  onGenerateScript: (payload: Pick<UGCPayload, "productDescription" | "productUrl">) => Promise<string>;
}) {
  const [productDescription, setProductDescription] = useState(initialPrompt);
  const [productUrl, setProductUrl] = useState("");
  const [avatarId, setAvatarId] = useState<string | null>(avatars[0]?.id ?? null);
  const [scriptText, setScriptText] = useState("");
  const [duration, setDuration] = useState(15);
  const [resolution, setResolution] = useState("720p");

  const canGenerate = productDescription.trim().length >= 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
          <User className="h-3.5 w-3.5" />
          UGC Talking Head
        </div>
        <h1 className="mt-3 font-display text-2xl font-semibold text-zinc-900">
          Creator-led product scripts
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Generate authentic talking-head scripts that feel like real creators, not corporate ads.
        </p>
      </motion.div>

      {/* Step 1: Product Brief */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Card className="space-y-4 bg-white p-5">
          <StepBadge number={1} title="What's your product?" />
          <Textarea
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            className="min-h-[120px] resize-none"
            placeholder="Describe the product, target audience, key offer, and proof points. Example: 'A vegan protein powder for gym beginners. Key benefit: 25g protein, tastes like chocolate milk. Proof: 10k reviews, 4.8 stars.'"
          />
          <Input
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            placeholder="https://your-product.com (optional — helps generate better scripts)"
          />
        </Card>
      </motion.div>

      {/* Step 2: Avatar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
      >
        <Card className="space-y-4 bg-white p-5">
          <StepBadge number={2} title="Pick your creator" />
          <AvatarPicker avatars={avatars} selectedAvatarId={avatarId} onSelect={setAvatarId} />
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
            <StepBadge number={3} title="Script" />
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

      {/* Step 4: Settings */}
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
                  min={5}
                  max={60}
                  step={5}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="flex-1 accent-zinc-900"
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
                        ? "border-zinc-900 bg-zinc-900 text-white"
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
                avatarId: avatarId ?? "",
                scriptText,
                duration,
                resolution,
              })
            }
            className="gap-2 rounded-full bg-zinc-900 px-6"
          >
            {isSubmitting ? (
              <>
                <Sparkles className="h-4 w-4 animate-spin" />
                Queueing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Generate UGC Video
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
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
        {number}
      </div>
      <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Wand2,
  Expand,
  Replace,
  Maximize,
  LayoutTemplate,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const aiTabs = [
  { id: "generate", label: "Generate", icon: Sparkles },
  { id: "remove-bg", label: "Remove BG", icon: Wand2 },
  { id: "expand", label: "Expand", icon: Expand },
  { id: "replace", label: "Replace", icon: Replace },
  { id: "upscale", label: "Upscale", icon: Maximize },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
];

const models = [
  { id: "sylicaai/flux-schnell", label: "Flux Schnell" },
  { id: "openai/dall-e-3", label: "DALL-E 3" },
  { id: "openai/gpt-image-1", label: "GPT Image 1" },
  { id: "@cf/stabilityai/stable-diffusion-xl-base-1.0", label: "Stable Diffusion (Free)" },
];

const aspectRatios = [
  { id: "1:1", label: "1:1", width: 1024, height: 1024 },
  { id: "16:9", label: "16:9", width: 1024, height: 576 },
  { id: "9:16", label: "9:16", width: 576, height: 1024 },
  { id: "4:3", label: "4:3", width: 1024, height: 768 },
  { id: "3:4", label: "3:4", width: 768, height: 1024 },
];

const templates = [
  { id: "instagram-post", label: "Instagram Post", width: 1080, height: 1080 },
  { id: "instagram-story", label: "Instagram Story", width: 1080, height: 1920 },
  { id: "facebook-ad", label: "Facebook Ad", width: 1200, height: 628 },
  { id: "twitter-header", label: "Twitter Header", width: 1500, height: 500 },
  { id: "youtube-thumbnail", label: "YouTube Thumbnail", width: 1280, height: 720 },
  { id: "linkedin-post", label: "LinkedIn Post", width: 1200, height: 627 },
  { id: "tiktok-video", label: "TikTok Video", width: 1080, height: 1920 },
  { id: "presentation", label: "Presentation", width: 1920, height: 1080 },
];

export function ImageStudioAIPanel({
  onGeneratedImage,
  onClose,
}: {
  userId: string;
  workspaceId: string;
  creditsRemaining: number;
  onGeneratedImage: (url: string) => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState("generate");
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("sylicaai/flux-schnell");
  const [selectedAspectRatio, setSelectedAspectRatio] = useState("1:1");
  const [steps, setSteps] = useState(8);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandWidth, setExpandWidth] = useState(1200);
  const [expandHeight, setExpandHeight] = useState(800);
  const [upscaleScale, setUpscaleScale] = useState(2);
  const [replacePrompt, setReplacePrompt] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/studio/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model: selectedModel,
          aspectRatio: selectedAspectRatio,
          steps,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }
      setGeneratedImage(data.imageUrl);
      onGeneratedImage(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveBackground = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/studio/image/edit/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Background removal failed");
      }
      onGeneratedImage(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Background removal failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpand = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/studio/image/edit/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          width: expandWidth,
          height: expandHeight,
          prompt: prompt || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Expand failed");
      }
      onGeneratedImage(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Expand failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpscale = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/studio/image/edit/upscale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scale: upscaleScale,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Upscale failed");
      }
      onGeneratedImage(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upscale failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplace = async () => {
    if (!replacePrompt.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/studio/image/edit/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: replacePrompt.trim(),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Replace failed");
      }
      onGeneratedImage(data.imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replace failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyTemplate = (template: typeof templates[0]) => {
    // This would resize the canvas to the template dimensions
    // For now, we'll just generate a new image with those dimensions
    setExpandWidth(template.width);
    setExpandHeight(template.height);
    setActiveTab("expand");
  };

  return (
    <div className="flex w-[320px] flex-col border-l border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span className="text-sm font-semibold text-zinc-700">AI Tools</span>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex border-b border-zinc-200 overflow-x-auto">
        {aiTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1 px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "text-zinc-900 border-b-2 border-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "generate" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the image you want to generate..."
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 min-h-[80px] resize-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Aspect Ratio</label>
                  <div className="grid grid-cols-3 gap-2">
                    {aspectRatios.map((ar) => (
                      <button
                        key={ar.id}
                        onClick={() => setSelectedAspectRatio(ar.id)}
                        className={cn(
                          "rounded-md border px-2 py-1.5 text-xs transition-colors",
                          selectedAspectRatio === ar.id
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        )}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedModel === "sylicaai/flux-schnell" && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-zinc-500">Steps ({steps})</label>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={steps}
                      onChange={(e) => setSteps(Number(e.target.value))}
                      className="w-full accent-zinc-900"
                    />
                  </div>
                )}

                <Button
                  className="w-full gap-2 bg-zinc-900"
                  onClick={handleGenerate}
                  disabled={isLoading || !prompt.trim()}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate
                </Button>

                {generatedImage && (
                  <div className="rounded-lg border border-zinc-200 overflow-hidden">
                    <img src={generatedImage} alt="Generated" className="w-full h-auto" />
                    <div className="p-2 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => onGeneratedImage(generatedImage)}>
                        Add as Layer
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "remove-bg" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-zinc-50 p-4 text-center">
                  <Wand2 className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm text-zinc-600">Remove the background from the current image</p>
                  <p className="text-xs text-zinc-400 mt-1">The active layer will be processed</p>
                </div>
                <Button
                  className="w-full gap-2 bg-zinc-900"
                  onClick={handleRemoveBackground}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Remove Background
                </Button>
              </div>
            )}

            {activeTab === "expand" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">New Width</label>
                  <input
                    type="number"
                    value={expandWidth}
                    onChange={(e) => setExpandWidth(Number(e.target.value))}
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">New Height</label>
                  <input
                    type="number"
                    value={expandHeight}
                    onChange={(e) => setExpandHeight(Number(e.target.value))}
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Fill Prompt (optional)</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what to fill the expanded area with..."
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 min-h-[60px] resize-none"
                  />
                </div>
                <Button
                  className="w-full gap-2 bg-zinc-900"
                  onClick={handleExpand}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Expand className="h-4 w-4" />}
                  Expand Canvas
                </Button>
              </div>
            )}

            {activeTab === "replace" && (
              <div className="space-y-4">
                <div className="rounded-lg bg-zinc-50 p-4 text-center">
                  <Replace className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm text-zinc-600">Replace parts of the image using AI</p>
                  <p className="text-xs text-zinc-400 mt-1">Use the brush to draw a mask, then describe what to replace it with</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Replace Prompt</label>
                  <textarea
                    value={replacePrompt}
                    onChange={(e) => setReplacePrompt(e.target.value)}
                    placeholder="Describe what to replace the masked area with..."
                    className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 min-h-[60px] resize-none"
                  />
                </div>
                <Button
                  className="w-full gap-2 bg-zinc-900"
                  onClick={handleReplace}
                  disabled={isLoading || !replacePrompt.trim()}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Replace className="h-4 w-4" />}
                  Replace
                </Button>
              </div>
            )}

            {activeTab === "upscale" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500">Scale Factor</label>
                  <div className="flex gap-2">
                    {[2, 3, 4].map((scale) => (
                      <button
                        key={scale}
                        onClick={() => setUpscaleScale(scale)}
                        className={cn(
                          "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
                          upscaleScale === scale
                            ? "border-zinc-900 bg-zinc-900 text-white"
                            : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                        )}
                      >
                        {scale}×
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4 text-center">
                  <Maximize className="h-8 w-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm text-zinc-600">Upscale the current image</p>
                  <p className="text-xs text-zinc-400 mt-1">The active layer will be upscaled</p>
                </div>
                <Button
                  className="w-full gap-2 bg-zinc-900"
                  onClick={handleUpscale}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Maximize className="h-4 w-4" />}
                  Upscale {upscaleScale}×
                </Button>
              </div>
            )}

            {activeTab === "templates" && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500">Choose a template to resize your canvas</p>
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleApplyTemplate(template)}
                    className="flex w-full items-center gap-3 rounded-lg border border-zinc-200 p-3 text-left transition-colors hover:bg-zinc-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-100">
                      <LayoutTemplate className="h-5 w-5 text-zinc-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-700">{template.label}</p>
                      <p className="text-xs text-zinc-400">{template.width} × {template.height}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

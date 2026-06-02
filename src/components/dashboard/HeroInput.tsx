"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Box, Link2, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { startGeneration } from "@/lib/generation-client";
import { getFormatBySlug, quickActions } from "@/lib/formats";
import { cn } from "@/lib/utils";

export function HeroInput({ canCreate = true }: { canCreate?: boolean }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [showProductUrl, setShowProductUrl] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState("ugc-talking-head");
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  function validatePrompt() {
    if (!canCreate) {
      setError("Your account does not have access to create videos.");
      return null;
    }

    const trimmed = prompt.trim();
    if (trimmed.length < 10) {
      setError("Add at least 10 characters describing your product, audience, or ad idea.");
      return null;
    }

    if (productUrl.trim()) {
      try {
        new URL(productUrl.trim());
      } catch {
        setError("Add a valid product URL or leave the product link empty.");
        return null;
      }
    }

    setError(null);
    return trimmed;
  }

  async function handleGenerate(slug = selectedSlug) {
    const trimmed = validatePrompt();
    if (!trimmed) return;

    const template = getFormatBySlug(slug) ?? getFormatBySlug("ugc-talking-head")!;
    setIsStarting(true);
    setError(null);

    try {
      const result = await startGeneration({
        format: template.format,
        prompt: trimmed,
        productUrl: productUrl.trim() || undefined,
      });
      router.push(`/generations/${result.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start generation.");
      setIsStarting(false);
    }
  }

  function openBuilder() {
    const params = new URLSearchParams();

    if (prompt.trim()) {
      params.set("prompt", prompt.trim());
    }

    router.push(`/create/${selectedSlug}${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 py-6 text-center md:py-10">
      <div className="inline-flex items-center rounded-full bg-purple-50 px-4 py-1.5 text-xs font-medium text-purple-700">
        The latest video models are live now
      </div>
      <div className="space-y-3">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-zinc-900 md:text-[2.75rem] md:leading-tight">
          Hi, what will we create today?
        </h1>
      </div>
      <div className="w-full rounded-[1.75rem] bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-shadow focus-within:shadow-[0_12px_40px_rgba(124,58,237,0.08)]">
        <Textarea
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void handleGenerate();
            }
          }}
          disabled={isStarting}
          className="min-h-[72px] resize-none border-0 bg-transparent p-1 text-base leading-6 text-zinc-800 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder="Describe your product, offer, audience, and ad angle."
        />
        {showProductUrl ? (
          <div className="mt-3">
            <Input
              value={productUrl}
              onChange={(event) => {
                setProductUrl(event.target.value);
                if (error) setError(null);
              }}
              disabled={isStarting}
              type="url"
              placeholder="https://your-product.com"
              className="h-10 bg-zinc-50"
            />
          </div>
        ) : null}
        {error ? <p className="px-1 pt-2 text-left text-xs text-red-500">{error}</p> : null}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              variant="icon"
              size="icon"
              className="h-10 w-10 bg-zinc-50"
              aria-label="Open builder"
              disabled={isStarting || !canCreate}
              onClick={openBuilder}
            >
              <Box className="h-4 w-4" />
            </Button>
            <Button
              variant="icon"
              size="icon"
              className={cn("h-10 w-10 bg-zinc-50", showProductUrl && "bg-purple-50 text-purple-700")}
              aria-label="Add product link"
              disabled={isStarting}
              onClick={() => setShowProductUrl((value) => !value)}
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
          <Button
            size="icon"
            className="h-11 w-11 rounded-full"
            aria-label="Generate ad"
            disabled={isStarting || !canCreate}
            onClick={() => void handleGenerate()}
          >
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className={cn(
              "bg-white px-4",
              selectedSlug === action.slug && "border-purple-200 bg-purple-50 text-purple-700",
            )}
            disabled={isStarting}
            onClick={() => setSelectedSlug(action.slug)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </section>
  );
}

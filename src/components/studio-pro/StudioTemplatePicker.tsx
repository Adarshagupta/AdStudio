"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, LayoutTemplate, Loader2, Sparkles, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StudioMultiClipWorkflow } from "@/components/studio-pro/StudioMultiClipWorkflow";
import { studioTemplates, type StudioTemplate } from "@/lib/studio-pro/templates";
type MarketplaceListing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  publisher: { workspaceName: string };
};
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

type MarketplaceTab = "builtin" | "marketplace";

function formatListingPrice(priceCents: number, currency = "usd") {
  if (priceCents <= 0) return "Free";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(priceCents / 100);
}

export function StudioTemplatePicker({
  onSelect,
  onStartBlank,
  onStartWithAgent,
  replacing = false,
}: {
  onSelect: (template: StudioTemplate) => void;
  onStartBlank: () => void;
  onStartWithAgent: (description: string) => void;
  replacing?: boolean;
}) {
  const router = useRouter();
  const [aiDraft, setAiDraft] = useState("");
  const [tab, setTab] = useState<MarketplaceTab>("builtin");
  const [marketplaceListings, setMarketplaceListings] = useState<MarketplaceListing[]>([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [usingListingId, setUsingListingId] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "marketplace") return;

    let cancelled = false;
    setMarketplaceLoading(true);

    void fetch("/api/studio/templates?pageSize=12")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load marketplace templates.");
        }
        if (!cancelled) {
          setMarketplaceListings(data.listings ?? []);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          notify.error(error instanceof Error ? error.message : "Failed to load marketplace.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMarketplaceLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  const submitAiStart = () => {
    const description = aiDraft.trim();
    if (!description) return;
    onStartWithAgent(description);
  };

  const handleMarketplaceListing = async (listing: MarketplaceListing) => {
    if (listing.priceCents > 0) {
      router.push(`/studio-pro/marketplace/${listing.slug}`);
      return;
    }

    setUsingListingId(listing.id);
    try {
      const response = await fetch(`/api/studio/templates/${listing.id}/use`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to use template.");
      }

      router.push(`/studio-pro/${data.flowId}`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to use template.");
      setUsingListingId(null);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div className="pointer-events-auto max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-lg">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-zinc-500" />
          <p className="text-sm font-medium text-zinc-900">Choose a starting point</p>
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          {replacing
            ? "Selecting a template replaces your current canvas layout."
            : "Describe what you want, pick a template, or start blank."}
        </p>

        <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
          <div className="flex items-center gap-2 text-zinc-700">
            <Bot className="h-3.5 w-3.5" />
            <p className="text-xs font-medium">Start with AI</p>
          </div>
          <Textarea
            value={aiDraft}
            onChange={(event) => setAiDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitAiStart();
              }
            }}
            placeholder="e.g. UGC skincare ad with testimonial and product image"
            rows={2}
            className="mt-2 min-h-[60px] resize-none border-zinc-200 bg-white text-xs"
          />
          <Button
            type="button"
            size="sm"
            className="mt-2 w-full gap-1.5 text-xs"
            disabled={!aiDraft.trim()}
            onClick={submitAiStart}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Build with agent
          </Button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("builtin")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition",
              tab === "builtin" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600",
            )}
          >
            Built-in
          </button>
          <button
            type="button"
            onClick={() => setTab("marketplace")}
            className={cn(
              "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition",
              tab === "marketplace" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600",
            )}
          >
            <Store className="h-3 w-3" />
            Marketplace
          </button>
        </div>

        {tab === "builtin" ? (
          <>
            <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
              <StudioMultiClipWorkflow />
            </div>

            <p className="mt-4 text-[10px] font-medium uppercase tracking-wide text-zinc-400">Templates</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {studioTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => onSelect(template)}
                  className="rounded-lg border border-zinc-100 bg-white p-3 text-left transition hover:bg-zinc-50"
                >
                  <div className={cn("mb-2 h-1 rounded-full bg-gradient-to-r", template.accent)} />
                  <p className="text-xs font-medium text-zinc-900">{template.name}</p>
                  <p className="mt-0.5 text-[11px] text-zinc-500">{template.description}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-2">
            {marketplaceLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading marketplace…
              </div>
            ) : marketplaceListings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-xs text-zinc-500">
                No published templates yet.{" "}
                <Link href="/studio-pro/marketplace" className="text-purple-600 underline">
                  Browse marketplace
                </Link>
              </div>
            ) : (
              marketplaceListings.map((listing) => (
                <button
                  key={listing.id}
                  type="button"
                  disabled={usingListingId === listing.id}
                  onClick={() => void handleMarketplaceListing(listing)}
                  className="flex w-full items-start justify-between gap-3 rounded-lg border border-zinc-100 bg-white p-3 text-left transition hover:bg-zinc-50"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-900">{listing.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">
                      {listing.description || listing.publisher.workspaceName}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-semibold text-zinc-700">
                    {usingListingId === listing.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      formatListingPrice(listing.priceCents, listing.currency)
                    )}
                  </span>
                </button>
              ))
            )}
            <Link
              href="/studio-pro/marketplace"
              className="block pt-1 text-center text-[11px] text-purple-600 hover:underline"
            >
              View all marketplace templates
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={onStartBlank}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-200 px-3 py-2.5 text-xs text-zinc-500 transition hover:bg-zinc-50"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {replacing ? "Keep current canvas" : "Start blank canvas"}
        </button>
      </div>
    </div>
  );
}

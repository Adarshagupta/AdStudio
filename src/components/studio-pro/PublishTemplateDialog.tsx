"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TemplateSamplePicker } from "@/components/studio-pro/TemplateSamplePicker";
import { notify } from "@/lib/notify";

type PublishState = {
  canPublish: boolean;
  reason: string | null;
  listing: {
    id: string;
    slug: string;
    title: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  } | null;
};

export function PublishTemplateDialog({
  open,
  onOpenChange,
  sourceFlowId,
  defaultTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceFlowId: string;
  defaultTitle: string;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [priceUsd, setPriceUsd] = useState("0");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [selectedSampleIds, setSelectedSampleIds] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [loadingState, setLoadingState] = useState(false);
  const [publishState, setPublishState] = useState<PublishState | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(defaultTitle);
    let cancelled = false;
    setLoadingState(true);

    void fetch(`/api/studio/flows/${sourceFlowId}/template-listing`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to check publish status.");
        }
        if (!cancelled) {
          setPublishState(data);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          notify.error(error instanceof Error ? error.message : "Failed to check publish status.");
          setPublishState(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingState(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, sourceFlowId, defaultTitle]);

  const publish = async () => {
    if (publishState && !publishState.canPublish) {
      return;
    }

    setPublishing(true);
    try {
      const createResponse = await fetch("/api/studio/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceFlowId,
          title: title.trim() || defaultTitle,
        }),
      });
      const createData = (await createResponse.json()) as {
        listing?: { id: string };
        error?: string;
      };

      if (!createResponse.ok || !createData.listing?.id) {
        throw new Error(createData.error ?? "Failed to prepare draft listing.");
      }

      const listingId = createData.listing.id;

      const priceCents = Math.round(Number.parseFloat(priceUsd || "0") * 100);
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        throw new Error("Enter a valid price in USD.");
      }

      const samplesResponse = await fetch(`/api/studio/flows/${sourceFlowId}/template-samples`);
      const samplesData = (await samplesResponse.json()) as {
        samples?: Array<{ id: string }>;
        error?: string;
      };

      if (!samplesResponse.ok) {
        throw new Error(samplesData.error ?? "Failed to load sample outputs for this session.");
      }

      const validSampleIds = new Set((samplesData.samples ?? []).map((sample) => sample.id));
      const sampleOutputIds = selectedSampleIds.filter((id) => validSampleIds.has(id));

      if (selectedSampleIds.length > 0 && sampleOutputIds.length === 0) {
        throw new Error(
          "Selected sample outputs are unavailable. Run your flow, then pick images or videos again.",
        );
      }

      const patchResponse = await fetch(`/api/studio/templates/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || defaultTitle,
          description: description.trim(),
          priceCents,
          category: category.trim() || null,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          sampleOutputIds,
          status: "PUBLISHED",
        }),
      });
      const patchData = (await patchResponse.json()) as {
        error?: string;
        listing?: { slug: string };
      };

      if (!patchResponse.ok) {
        throw new Error(patchData.error ?? "Failed to publish listing.");
      }

      notify.success("Template published to the marketplace.");
      onOpenChange(false);
      window.open(`/studio-pro/marketplace/${patchData.listing?.slug}`, "_blank");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to publish template.");
    } finally {
      setPublishing(false);
    }
  };

  const alreadyPublished = publishState && !publishState.canPublish && publishState.listing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            Publish as template
          </DialogTitle>
          <DialogDescription>
            Export this session as a marketplace listing. Each Studio session can only be published once.
          </DialogDescription>
        </DialogHeader>

        {loadingState ? (
          <div className="flex items-center gap-2 py-8 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking publish status…
          </div>
        ) : alreadyPublished ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {publishState.reason ?? "This flow is already published to the marketplace."}
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link href={`/studio-pro/marketplace/${publishState.listing!.slug}`} target="_blank">
                View listing
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-2">
            {publishState?.listing?.status === "DRAFT" ? (
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                You have an unpublished draft for this session. Publishing will update that draft.
              </div>
            ) : null}

            <div className="grid gap-2">
              <label htmlFor="template-title" className="text-sm font-medium text-foreground">
                Title
              </label>
              <Input
                id="template-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="UGC skincare testimonial flow"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="template-description" className="text-sm font-medium text-foreground">
                Description
              </label>
              <Textarea
                id="template-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="What this flow does and who it is for."
              />
            </div>

            <TemplateSamplePicker
              sourceFlowId={sourceFlowId}
              selectedIds={selectedSampleIds}
              onChange={setSelectedSampleIds}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="template-price" className="text-sm font-medium text-foreground">
                  Price (USD)
                </label>
                <Input
                  id="template-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceUsd}
                  onChange={(event) => setPriceUsd(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="template-category" className="text-sm font-medium text-foreground">
                  Category
                </label>
                <Input
                  id="template-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="UGC, Product, Social"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="template-tags" className="text-sm font-medium text-foreground">
                Tags (comma-separated)
              </label>
              <Input
                id="template-tags"
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="ugc, skincare, testimonial"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={publishing}>
            {alreadyPublished ? "Close" : "Cancel"}
          </Button>
          {!alreadyPublished ? (
            <Button
              type="button"
              onClick={() => void publish()}
              disabled={publishing || loadingState}
            >
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Publish
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

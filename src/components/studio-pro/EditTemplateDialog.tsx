"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";

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
import type { TemplateSampleOutput } from "@/lib/studio-pro/template-sample-types";
import { notify } from "@/lib/notify";

export function EditTemplateDialog({
  open,
  onOpenChange,
  listing,
  sourceFlowId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: {
    id: string;
    slug: string;
    title: string;
    description: string;
    priceCents: number;
    category: string | null;
    tags: string[];
    sampleOutputs: TemplateSampleOutput[];
  };
  sourceFlowId: string | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description);
  const [priceUsd, setPriceUsd] = useState((listing.priceCents / 100).toFixed(2));
  const [category, setCategory] = useState(listing.category ?? "");
  const [tags, setTags] = useState(listing.tags.join(", "));
  const [selectedSampleIds, setSelectedSampleIds] = useState(listing.sampleOutputs.map((s) => s.id));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(listing.title);
    setDescription(listing.description);
    setPriceUsd((listing.priceCents / 100).toFixed(2));
    setCategory(listing.category ?? "");
    setTags(listing.tags.join(", "));
    setSelectedSampleIds(listing.sampleOutputs.map((sample) => sample.id));

    if (!sourceFlowId) return;

    let cancelled = false;
    void fetch(`/api/studio/flows/${sourceFlowId}/template-samples`)
      .then(async (response) => {
        const data = (await response.json()) as { samples?: Array<{ id: string }> };
        if (!response.ok || cancelled) return;

        const validIds = new Set((data.samples ?? []).map((sample) => sample.id));
        setSelectedSampleIds((current) => {
          const fromListing = listing.sampleOutputs
            .map((sample) => sample.id)
            .filter((id) => validIds.has(id));
          const fromCurrent = current.filter((id) => validIds.has(id));
          return fromCurrent.length > 0 ? fromCurrent : fromListing;
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [open, listing, sourceFlowId]);

  const save = async () => {
    setSaving(true);
    try {
      const priceCents = Math.round(Number.parseFloat(priceUsd || "0") * 100);
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        throw new Error("Enter a valid price in USD.");
      }

      let sampleOutputIds: string[] | undefined;
      if (sourceFlowId) {
        const samplesResponse = await fetch(`/api/studio/flows/${sourceFlowId}/template-samples`);
        const samplesData = (await samplesResponse.json()) as {
          samples?: Array<{ id: string }>;
          error?: string;
        };

        if (!samplesResponse.ok) {
          throw new Error(samplesData.error ?? "Failed to load sample outputs for this session.");
        }

        const validIds = new Set((samplesData.samples ?? []).map((sample) => sample.id));
        sampleOutputIds = selectedSampleIds.filter((id) => validIds.has(id));
      }

      const response = await fetch(`/api/studio/templates/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || listing.title,
          description: description.trim(),
          priceCents,
          category: category.trim() || null,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          ...(sampleOutputIds !== undefined ? { sampleOutputIds } : {}),
        }),
      });
      const data = (await response.json()) as { error?: string; listing?: { slug?: string } };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update listing.");
      }

      notify.success("Template listing updated.");
      onOpenChange(false);
      if (data.listing?.slug && data.listing.slug !== listing.slug) {
        router.replace(`/studio-pro/marketplace/${data.listing.slug}`);
      } else {
        router.refresh();
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to update listing.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Edit listing
          </DialogTitle>
          <DialogDescription>Update how this template appears in the marketplace.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label htmlFor="edit-template-title" className="text-sm font-medium text-foreground">
              Title
            </label>
            <Input
              id="edit-template-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="edit-template-description" className="text-sm font-medium text-foreground">
              Description
            </label>
            <Textarea
              id="edit-template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>

          {sourceFlowId ? (
            <TemplateSamplePicker
              sourceFlowId={sourceFlowId}
              selectedIds={selectedSampleIds}
              onChange={setSelectedSampleIds}
            />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="edit-template-price" className="text-sm font-medium text-foreground">
                Price (USD)
              </label>
              <Input
                id="edit-template-price"
                type="number"
                min="0"
                step="0.01"
                value={priceUsd}
                onChange={(event) => setPriceUsd(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="edit-template-category" className="text-sm font-medium text-foreground">
                Category
              </label>
              <Input
                id="edit-template-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label htmlFor="edit-template-tags" className="text-sm font-medium text-foreground">
              Tags (comma-separated)
            </label>
            <Input
              id="edit-template-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

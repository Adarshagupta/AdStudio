"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Loader2, Play, Video } from "lucide-react";

import type { TemplateSampleOutput } from "@/lib/studio-pro/template-sample-types";
import { cn } from "@/lib/utils";

export function TemplateSamplePicker({
  sourceFlowId,
  selectedIds,
  onChange,
}: {
  sourceFlowId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [samples, setSamples] = useState<TemplateSampleOutput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch(`/api/studio/flows/${sourceFlowId}/template-samples`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load samples.");
        }
        if (!cancelled) {
          setSamples(data.samples ?? []);
        }
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load samples.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sourceFlowId]);

  const toggleSample = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((sampleId) => sampleId !== id));
      return;
    }
    onChange([...selectedIds, id]);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-4 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading outputs from this session…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 px-3 py-4 text-sm text-zinc-500">
        No generated images or videos in this session yet. Run your flow first, then publish sample outputs.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-900">Sample outputs</p>
      <p className="text-xs text-zinc-500">
        Choose which images or videos from this session appear on the marketplace listing.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {samples.map((sample) => {
          const selected = selectedIds.includes(sample.id);
          return (
            <button
              key={sample.id}
              type="button"
              onClick={() => toggleSample(sample.id)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-2 text-left transition",
                selected
                  ? "border-purple-500 bg-purple-50/60 ring-1 ring-purple-200"
                  : "border-zinc-200 hover:border-zinc-300",
              )}
            >
              <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-zinc-900">
                {sample.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sample.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white">
                    <Video className="h-5 w-5" />
                  </div>
                )}
                <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                  {sample.type === "image" ? (
                    <ImageIcon className="inline h-3 w-3" />
                  ) : (
                    <Play className="inline h-3 w-3" />
                  )}
                </span>
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="truncate text-xs font-medium text-zinc-900">{sample.nodeTitle}</p>
                <p className="text-[11px] capitalize text-zinc-500">{sample.type}</p>
                <p className="mt-1 text-[11px] text-purple-600">{selected ? "Shown on listing" : "Tap to show"}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

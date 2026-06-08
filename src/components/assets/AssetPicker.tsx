"use client";

import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Loader2, Music2, Video, X } from "lucide-react";

import { fetchUserAssets, type UserMediaAssetDto } from "@/lib/user-assets-client";
import type { StudioUploadKind } from "@/lib/studio-upload-server";
import { cn } from "@/lib/utils";

export function AssetPicker({
  kind: kindProp,
  kinds: kindsProp,
  open,
  onClose,
  onSelect,
}: {
  kind?: StudioUploadKind;
  kinds?: StudioUploadKind[];
  open: boolean;
  onClose: () => void;
  onSelect: (asset: UserMediaAssetDto) => void;
}) {
  const allowedKinds = kindsProp?.length ? kindsProp : kindProp ? [kindProp] : (["image"] as StudioUploadKind[]);
  const [activeKind, setActiveKind] = useState<StudioUploadKind>(allowedKinds[0]);
  const [items, setItems] = useState<UserMediaAssetDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "uploaded" | "generated">("all");

  useEffect(() => {
    if (!allowedKinds.includes(activeKind)) {
      setActiveKind(allowedKinds[0]);
    }
  }, [activeKind, allowedKinds]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchUserAssets({
        kind: activeKind,
        source: filter === "all" ? undefined : filter,
        limit: 60,
      });
      setItems(result.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load assets.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeKind, filter]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [load, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onPointerDown={onClose}
    >
      <div
        className="flex max-h-[min(85vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-purple-700" />
            <p className="text-sm font-medium text-zinc-900">
              {allowedKinds.length === 1 ? `Your ${activeKind} library` : "Your assets"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {allowedKinds.length > 1 ? (
          <div className="flex gap-2 border-b border-zinc-100 px-4 py-2">
            {allowedKinds.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveKind(value)}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-medium capitalize transition",
                  activeKind === value
                    ? "bg-purple-100 text-purple-800"
                    : "text-zinc-500 hover:bg-zinc-100",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2 border-b border-zinc-100 px-4 py-2">
          {(["all", "uploaded", "generated"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium capitalize transition",
                filter === value
                  ? "bg-purple-100 text-purple-800"
                  : "text-zinc-500 hover:bg-zinc-100",
              )}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-zinc-500">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No saved {activeKind}s yet. Upload or generate in Studio Pro — they appear here automatically.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onSelect(asset);
                    onClose();
                  }}
                  className="group overflow-hidden rounded-xl border border-zinc-200 text-left transition hover:border-purple-300 hover:ring-2 hover:ring-purple-100"
                >
                  <AssetThumb asset={asset} />
                  <div className="border-t border-zinc-100 px-2 py-1.5">
                    <p className="truncate text-[10px] font-medium text-zinc-800">
                      {asset.name || labelForAsset(asset)}
                    </p>
                    <p className="text-[9px] capitalize text-zinc-400">{asset.source}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetThumb({ asset }: { asset: UserMediaAssetDto }) {
  if (asset.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={asset.url} alt="" className="aspect-square w-full object-cover bg-zinc-50" />
    );
  }

  if (asset.kind === "video") {
    return (
      <div className="relative aspect-square w-full bg-zinc-900">
        <video src={asset.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
        <Video className="absolute bottom-2 right-2 h-4 w-4 text-white/90" />
      </div>
    );
  }

  return (
    <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-purple-50 text-purple-700">
      <Music2 className="h-8 w-8" />
      <span className="px-2 text-center text-[10px] leading-tight">Audio</span>
    </div>
  );
}

function labelForAsset(asset: UserMediaAssetDto) {
  const date = new Date(asset.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${asset.source} ${asset.kind} · ${date}`;
}

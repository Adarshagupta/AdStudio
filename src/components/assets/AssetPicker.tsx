"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Loader2, Music2, Video, X } from "lucide-react";

import { ImageWithEdit } from "@/components/shared/ImageWithEdit";
import { fetchUserAssets, type UserMediaAssetDto } from "@/lib/user-assets-client";
import type { StudioUploadKind } from "@/lib/studio-upload-server";
import { cn } from "@/lib/utils";

export function AssetPicker({
  kind: kindProp,
  kinds: kindsProp,
  open,
  onClose,
  onSelect,
  presentation = "modal",
}: {
  kind?: StudioUploadKind;
  kinds?: StudioUploadKind[];
  open: boolean;
  onClose: () => void;
  onSelect: (asset: UserMediaAssetDto) => void;
  presentation?: "modal" | "fullscreen";
}) {
  const allowedKinds = kindsProp?.length ? kindsProp : kindProp ? [kindProp] : (["image"] as StudioUploadKind[]);
  const [activeKind, setActiveKind] = useState<StudioUploadKind>(allowedKinds[0]);
  const [items, setItems] = useState<UserMediaAssetDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "uploaded" | "generated">("all");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

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

  if (!open || !mounted) return null;

  const fullscreen = presentation === "fullscreen";

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[200] flex bg-black/50 backdrop-blur-sm",
        fullscreen ? "flex-col" : "items-center justify-center p-4",
      )}
      onPointerDown={onClose}
    >
      <div
        className={cn(
          "flex flex-col overflow-hidden bg-background shadow-2xl",
          fullscreen
            ? "h-full w-full"
            : "max-h-[min(85vh,720px)] w-full max-w-2xl rounded-2xl border border-border",
        )}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="h-5 w-5 text-primary" />
            <p className="text-base font-semibold text-foreground">
              {allowedKinds.length === 1 ? `Your ${activeKind} library` : "Your assets"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {allowedKinds.length > 1 ? (
          <div className="flex gap-2 border-b border-border px-5 py-2.5">
            {allowedKinds.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setActiveKind(value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium capitalize transition",
                  activeKind === value
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        ) : null}

        <div className="flex gap-2 border-b border-border px-5 py-2.5">
          {(["all", "uploaded", "generated"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition",
                filter === value
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-600">{error}</p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No saved {activeKind}s yet. Upload or generate in Studio Pro — they appear here automatically.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onSelect(asset);
                    onClose();
                  }}
                  className="group overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-primary/40 hover:ring-2 hover:ring-primary/20"
                >
                  <AssetThumb asset={asset} />
                  <div className="border-t border-border px-2 py-1.5">
                    <p className="truncate text-xs font-medium text-foreground">
                      {asset.name || labelForAsset(asset)}
                    </p>
                    <p className="text-[10px] capitalize text-muted-foreground">{asset.source}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AssetThumb({ asset }: { asset: UserMediaAssetDto }) {
  if (asset.kind === "image") {
    return (
      <ImageWithEdit src={asset.url} alt="" className="aspect-square w-full" imgClassName="aspect-square w-full object-cover bg-zinc-50" size="sm" />
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

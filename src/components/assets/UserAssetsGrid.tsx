"use client";

import { useState } from "react";
import { Music2, Trash2, Video } from "lucide-react";

import { ImageWithEdit } from "@/components/shared/ImageWithEdit";
import { formatDateTime } from "@/lib/format-date";
import { deleteUserAsset, type UserMediaAssetDto } from "@/lib/user-assets-client";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

export function UserAssetsGrid({
  initialItems,
  filterKind,
}: {
  initialItems: UserMediaAssetDto[];
  filterKind?: "image" | "audio" | "video" | "all";
}) {
  const [items, setItems] = useState(initialItems);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visible =
    filterKind && filterKind !== "all"
      ? items.filter((item) => item.kind === filterKind)
      : items;

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteUserAsset(id);
      setItems((current) => current.filter((item) => item.id !== id));
      notify.success("Removed from your library.");
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Could not remove asset.");
    } finally {
      setDeletingId(null);
    }
  };

  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-14 text-center">
        <p className="text-sm font-medium text-zinc-800">No assets yet</p>
        <p className="mt-2 text-sm text-zinc-500">
          Upload or generate images, audio, and video in Studio Pro. Everything you create is saved here for reuse.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {visible.map((asset) => (
        <article
          key={asset.id}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
        >
          <div className="relative">
            <AssetPreview asset={asset} />
            <button
              type="button"
              disabled={deletingId === asset.id}
              onClick={() => void remove(asset.id)}
              className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-zinc-600 shadow transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              aria-label="Remove from library"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1 px-3 py-2.5">
            <p className="truncate text-sm font-medium text-zinc-900">
              {asset.name || `${asset.kind} asset`}
            </p>
            <p className="text-[11px] capitalize text-zinc-500">
              {asset.source} · {formatDateTime(asset.createdAt)}
            </p>
            <a
              href={asset.url}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-purple-700 hover:underline"
            >
              Open file
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

function AssetPreview({ asset }: { asset: UserMediaAssetDto }) {
  if (asset.kind === "image") {
    return (
      <ImageWithEdit src={asset.url} alt="" className="aspect-video w-full" imgClassName="aspect-video w-full object-cover bg-zinc-100" />
    );
  }

  if (asset.kind === "video") {
    return (
      <div className="relative aspect-video w-full bg-zinc-900">
        <video src={asset.url} controls className="h-full w-full object-contain" preload="metadata" />
        <Video className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 text-white/80" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex aspect-video w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-50 to-zinc-50",
      )}
    >
      <Music2 className="h-10 w-10 text-purple-600" />
      <audio src={asset.url} controls className="w-[calc(100%-1.5rem)]" preload="metadata" />
    </div>
  );
}

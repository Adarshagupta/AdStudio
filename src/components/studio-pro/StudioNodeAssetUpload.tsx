"use client";

import { useState } from "react";
import { Loader2, Upload, X } from "lucide-react";

import { MediaUploadTrigger } from "@/components/assets/MediaUploadTrigger";
import { notify } from "@/lib/notify";
import { readImageDimensions, uploadStudioAsset, type StudioAssetUploadKind } from "@/lib/studio-asset-upload";
import type { UserMediaAssetDto } from "@/lib/user-media-assets-types";
import type { StudioNode } from "@/lib/studio-pro/types";

export function StudioNodeAssetUpload({
  node,
  onChange,
  compact = false,
}: {
  node: StudioNode;
  onChange: (data: Partial<StudioNode["data"]>) => void;
  compact?: boolean;
}) {
  const kind: StudioAssetUploadKind | null =
    node.type === "image"
      ? "image"
      : node.type === "audio"
        ? "audio"
        : node.type === "video"
          ? "video"
          : null;

  const [uploading, setUploading] = useState(false);

  if (!kind) return null;

  const hasAsset =
    kind === "image"
      ? Boolean(node.data.imageUrl)
      : kind === "video"
        ? Boolean(node.data.videoUrl)
        : Boolean(node.data.audioUrl);

  const clearAsset = () => {
    if (kind === "image") {
      onChange({
        imageUrl: undefined,
        imageWidth: undefined,
        imageHeight: undefined,
        output: undefined,
        mediaSource: undefined,
        status: "idle",
        error: undefined,
      });
      return;
    }

    if (kind === "video") {
      onChange({
        videoUrl: undefined,
        videoWidth: undefined,
        videoHeight: undefined,
        output: undefined,
        mediaSource: undefined,
        status: "idle",
        error: undefined,
      });
      return;
    }

    onChange({
      audioUrl: undefined,
      output: undefined,
      mediaSource: undefined,
      status: "idle",
      error: undefined,
    });
  };

  const applyAsset = (asset: UserMediaAssetDto) => {
    if (kind === "image") {
      onChange({
        imageUrl: asset.url,
        imageWidth: asset.width ?? undefined,
        imageHeight: asset.height ?? undefined,
        output: asset.url,
        mediaSource: asset.source === "uploaded" ? "upload" : "generated",
        status: "done",
        error: undefined,
      });
      notify.success("Image selected from your library.");
      return;
    }

    if (kind === "video") {
      onChange({
        videoUrl: asset.url,
        videoWidth: asset.width ?? undefined,
        videoHeight: asset.height ?? undefined,
        output: asset.url,
        mediaSource: asset.source === "uploaded" ? "upload" : "generated",
        status: "done",
        error: undefined,
      });
      notify.success("Video selected from your library.");
      return;
    }

    onChange({
      audioUrl: asset.url,
      output: asset.url,
      mediaSource: asset.source === "uploaded" ? "upload" : "generated",
      status: "done",
      error: undefined,
    });
    notify.success("Audio selected from your library.");
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadStudioAsset(file, kind);

      if (kind === "image") {
        let imageWidth: number | undefined;
        let imageHeight: number | undefined;
        try {
          const dimensions = await readImageDimensions(file);
          imageWidth = dimensions.width;
          imageHeight = dimensions.height;
        } catch {
          // Preview still works without dimensions.
        }

        onChange({
          imageUrl: url,
          imageWidth,
          imageHeight,
          output: url,
          mediaSource: "upload",
          status: "done",
          error: undefined,
        });
        notify.success("Image uploaded — saved to your library.");
      } else if (kind === "video") {
        onChange({
          videoUrl: url,
          output: url,
          mediaSource: "upload",
          status: "done",
          error: undefined,
        });
        notify.success("Video uploaded — saved to your library.");
      } else {
        onChange({
          audioUrl: url,
          output: url,
          mediaSource: "upload",
          status: "done",
          error: undefined,
        });
        notify.success("Audio uploaded — saved to your library.");
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex flex-wrap items-center gap-2">
        <MediaUploadTrigger
          kinds={kind}
          uploading={uploading}
          onFile={handleFile}
          onAsset={applyAsset}
          dialogTitle={`Add ${kind}`}
          trigger={({ open, disabled, uploading: busy }) => (
            <button
              type="button"
              disabled={disabled || busy}
              onClick={open}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition hover:border-purple-200 hover:text-purple-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              {busy ? "Uploading…" : `Add ${kind}`}
            </button>
          )}
        />

        {hasAsset ? (
          <button
            type="button"
            onClick={clearAsset}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-zinc-500 transition hover:bg-zinc-100 hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Remove
          </button>
        ) : null}
      </div>

      {hasAsset ? (
        <p className="text-[10px] leading-4 text-zinc-600">
          {node.data.mediaSource === "upload"
            ? "File is in your library and wired into this node."
            : "Media is set on this node."}
        </p>
      ) : (
        <p className="text-[10px] leading-4 text-zinc-500">
          Opens your asset folder or this device — no repeat uploads each session.
        </p>
      )}
    </div>
  );
}

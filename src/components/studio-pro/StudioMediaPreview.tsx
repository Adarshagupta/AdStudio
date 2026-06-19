"use client";

import { Film, Image as ImageIcon, Loader2, Play } from "lucide-react";

import { getMediaPreviewHeight, type StudioNode } from "@/lib/studio-pro/types";

const INSPECTOR_PREVIEW_WIDTH = 268;

function isRunning(node: StudioNode) {
  return node.data.status === "running";
}

export function StudioInspectorGeneratingPreview({ node }: { node: StudioNode }) {
  if (node.type !== "image" && node.type !== "video") return null;
  if (!isRunning(node)) return null;

  const isImage = node.type === "image";
  const previousUrl = isImage ? node.data.imageUrl : node.data.videoUrl;
  const label = isImage ? "Generating image…" : "Generating video…";
  const previewHeight = getMediaPreviewHeight(node, INSPECTOR_PREVIEW_WIDTH);

  return (
    <div
      className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative w-full overflow-hidden" style={{ height: previewHeight }}>
        {previousUrl && isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previousUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[2px]"
          />
        ) : null}
        {previousUrl && !isImage ? (
          <video
            src={previousUrl}
            aria-hidden
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[2px]"
          />
        ) : null}
        <div className="studio-shimmer absolute inset-0" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4 text-center">
          {isImage ? (
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200/80 bg-card/90 shadow-sm">
              <ImageIcon className="h-6 w-6 animate-pulse text-zinc-500" />
            </div>
          ) : (
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200/80 bg-card/90 shadow-sm">
              <Film className="h-5 w-5 text-zinc-500" />
              <Loader2 className="absolute -right-1 -top-1 h-4 w-4 animate-spin text-zinc-600" />
            </div>
          )}
          <p className="text-xs font-medium text-zinc-700">{label}</p>
          <p className="text-[11px] leading-4 text-zinc-500">This usually takes a little while — hang tight.</p>
        </div>
      </div>
    </div>
  );
}

export function StudioMediaPreview({
  node,
  onDimensions,
}: {
  node: StudioNode;
  onDimensions?: (width: number, height: number) => void;
}) {
  const contentWidth = node.width - 24;
  const previewHeight = getMediaPreviewHeight(node, contentWidth);

  if (node.type === "image") {
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-100 bg-muted/40">
        <div
          className="relative flex items-center justify-center overflow-hidden text-zinc-300"
          style={{ width: contentWidth, height: previewHeight }}
        >
          {node.data.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={node.data.imageUrl}
              alt="Generated"
              className="studio-image-reveal max-h-full max-w-full object-contain"
              onLoad={(event) => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                if (naturalWidth > 0 && naturalHeight > 0) {
                  onDimensions?.(naturalWidth, naturalHeight);
                }
              }}
              onPointerDown={(event) => event.stopPropagation()}
            />
          ) : isRunning(node) ? (
            <div className="studio-shimmer absolute inset-0" />
          ) : (
            <ImageIcon className="h-10 w-10" />
          )}
        </div>
      </div>
    );
  }

  if (node.type === "video") {
    return (
      <div className="overflow-hidden rounded-xl border border-zinc-100 bg-muted/40">
        <div
          className="relative flex items-center justify-center overflow-hidden"
          style={{ width: contentWidth, height: previewHeight }}
        >
          {node.data.videoUrl ? (
            <video
              src={node.data.videoUrl}
              controls
              className="studio-image-reveal max-h-full max-w-full object-contain"
              onLoadedMetadata={(event) => {
                const { videoWidth, videoHeight } = event.currentTarget;
                if (videoWidth > 0 && videoHeight > 0) {
                  onDimensions?.(videoWidth, videoHeight);
                }
              }}
              onPointerDown={(event) => event.stopPropagation()}
            />
          ) : (
            <>
              {isRunning(node) ? <div className="studio-shimmer absolute inset-0" /> : null}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                {isRunning(node) ? (
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-600" />
                ) : (
                  <Play className="h-6 w-6 text-zinc-500" />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}

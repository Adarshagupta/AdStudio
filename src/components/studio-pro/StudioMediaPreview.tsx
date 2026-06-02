"use client";

import { Image as ImageIcon, Loader2, Play } from "lucide-react";

import { getMediaPreviewHeight, type StudioNode } from "@/lib/studio-pro/types";

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
      <div className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50/80">
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
      <div className="overflow-hidden rounded-xl border border-zinc-100 bg-zinc-50/80">
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
                  <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
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

function isRunning(node: StudioNode) {
  return node.data.status === "running";
}

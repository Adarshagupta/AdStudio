"use client";

import { useRef, useState } from "react";
import { Play } from "lucide-react";
import type { GenerationFormat } from "@prisma/client";

import { VideoThumbnail } from "@/components/shared/VideoThumbnail";
import { ImageWithEdit } from "@/components/shared/ImageWithEdit";
import type { DashboardOutputType } from "@/lib/dashboard-generation";
import { cn } from "@/lib/utils";

type GenerationVideoPreviewProps = {
  type: GenerationFormat;
  outputType?: DashboardOutputType;
  index?: number;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  status?: string;
  className?: string;
};

export function GenerationVideoPreview({
  type,
  outputType = "video",
  index = 0,
  videoUrl,
  thumbnailUrl,
  status,
  className,
}: GenerationVideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [posterReady, setPosterReady] = useState(false);

  const imageUrl = outputType === "image" ? thumbnailUrl : null;
  const canShowImage = status === "COMPLETED" && Boolean(imageUrl);
  const canPlay = outputType !== "image" && status === "COMPLETED" && Boolean(videoUrl);

  if (canShowImage && imageUrl) {
    return (
      <div className={cn("relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-100", className)}>
        <ImageWithEdit src={imageUrl} alt="" className="h-full w-full" imgClassName="h-full w-full object-cover" />
      </div>
    );
  }

  const handleEnter = () => {
    setIsHovering(true);
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  };

  const handleLeave = () => {
    setIsHovering(false);
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // Ignore seek errors while unloading.
    }
  };

  if (!canPlay) {
    return <VideoThumbnail type={type} index={index} className={className} />;
  }

  return (
    <div
      className={cn("relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-100", className)}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <video
        ref={videoRef}
        src={videoUrl!}
        poster={thumbnailUrl ?? undefined}
        muted
        loop
        playsInline
        preload="metadata"
        className={cn(
          "h-full w-full object-cover transition-opacity duration-200",
          posterReady || thumbnailUrl ? "opacity-100" : "opacity-0",
          isHovering && "opacity-100",
        )}
        onLoadedData={() => setPosterReady(true)}
      />

      {!posterReady && !thumbnailUrl ? (
        <div className="absolute inset-0">
          <VideoThumbnail type={type} index={index} className="h-full rounded-none" />
        </div>
      ) : null}

      <div
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200",
          isHovering ? "opacity-0" : "opacity-100",
        )}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-zinc-700 shadow-md ring-1 ring-black/5">
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        </span>
      </div>
    </div>
  );
}

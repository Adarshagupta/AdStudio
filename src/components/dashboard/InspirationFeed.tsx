"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Volume2, VolumeX, X } from "lucide-react";

import { FEATURED_INSPIRATION_VIDEOS } from "@/lib/inspiration-videos";
import { cn } from "@/lib/utils";

function VideoCard({
  src,
  index,
  total,
  isActive,
  onInView,
}: {
  src: string;
  index: number;
  total: number;
  isActive: boolean;
  onInView: (index: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            onInView(index);
          }
        });
      },
      { threshold: [0.6] },
    );

    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [index, onInView]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = true;
      setMuted(true);
      void video.play().catch(() => undefined);
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isActive]);

  function handleMouseEnter() {
    setHovered(true);
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video.volume = 0.5;
      setMuted(false);
    }
  }

  function handleMouseLeave() {
    setHovered(false);
    const video = videoRef.current;
    if (video) {
      video.muted = true;
      setMuted(true);
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="relative flex h-full w-full shrink-0 snap-start items-center justify-center overflow-hidden bg-black"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        playsInline
        className="h-full w-full object-contain"
        preload="metadata"
      />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <span className="rounded bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {index + 1} / {total}
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium backdrop-blur-sm transition-all duration-300",
            hovered && !muted ? "bg-violet-500/80 text-white" : "bg-black/50 text-white/70",
          )}
        >
          {hovered && !muted ? (
            <>
              <Volume2 className="h-3.5 w-3.5" />
              Audio on
            </>
          ) : (
            <>
              <VolumeX className="h-3.5 w-3.5" />
              Muted
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export function InspirationFeed({
  initialIndex = 0,
  onClose,
  className,
}: {
  initialIndex?: number;
  onClose?: () => void;
  className?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleInView = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    setActiveIndex(initialIndex);
    const container = containerRef.current;
    if (!container) return;
    const target = container.children[initialIndex] as HTMLElement | undefined;
    target?.scrollIntoView({ block: "start" });
  }, [initialIndex]);

  useEffect(() => {
    if (!onClose) return;
    const close = onClose;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function scrollTo(index: number) {
    const clamped = Math.max(0, Math.min(FEATURED_INSPIRATION_VIDEOS.length - 1, index));
    setActiveIndex(clamped);
    const container = containerRef.current;
    if (container) {
      const target = container.children[clamped] as HTMLElement;
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className={cn("relative h-full w-full bg-black", className)}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
          aria-label="Close inspiration feed"
        >
          <X className="h-5 w-5" />
        </button>
      )}

      <div
        ref={containerRef}
        className="h-full w-full snap-y snap-mandatory overflow-y-auto scroll-smooth"
      >
        {FEATURED_INSPIRATION_VIDEOS.map((url, index) => (
          <div key={url} className="h-full snap-start">
            <VideoCard
              src={url}
              index={index}
              total={FEATURED_INSPIRATION_VIDEOS.length}
              isActive={index === activeIndex}
              onInView={handleInView}
            />
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute right-4 top-1/2 flex -translate-y-1/2 flex-col gap-3">
        <button
          type="button"
          onClick={() => scrollTo(activeIndex - 1)}
          disabled={activeIndex === 0}
          className="pointer-events-auto rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-30"
        >
          <ChevronUp className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollTo(activeIndex + 1)}
          disabled={activeIndex === FEATURED_INSPIRATION_VIDEOS.length - 1}
          className="pointer-events-auto rounded-full bg-black/50 p-2 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-30"
        >
          <ChevronDown className="h-5 w-5" />
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
        {FEATURED_INSPIRATION_VIDEOS.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => scrollTo(index)}
            className={cn(
              "pointer-events-auto h-1.5 rounded-full transition-all",
              index === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/40",
            )}
          />
        ))}
      </div>
    </div>
  );
}

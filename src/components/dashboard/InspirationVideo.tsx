"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

export function InspirationVideo({ src, index }: { src: string; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [hovered, setHovered] = useState(false);

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
    <motion.div
      className="group relative aspect-[9/16] overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800 transition-all duration-200 hover:ring-zinc-600"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{
        scale: 1.03,
        y: -4,
        transition: { type: "spring", stiffness: 400, damping: 10 },
      }}
      whileTap={{
        scale: 0.97,
        transition: { type: "spring", stiffness: 500, damping: 10 },
      }}
    >
      <video
        ref={videoRef}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        preload="metadata"
      />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
        <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/80 backdrop-blur-sm">
          #{index + 1}
        </span>
        <span
          className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm transition-all duration-300 ${
            hovered && !muted
              ? "bg-violet-500/80 text-white"
              : "bg-black/40 text-white/60"
          }`}
        >
          {hovered && !muted ? (
            <>
              <Volume2 className="h-3 w-3" />
              Audio on
            </>
          ) : (
            <>
              <VolumeX className="h-3 w-3" />
              Muted
            </>
          )}
        </span>
      </div>
    </motion.div>
  );
}

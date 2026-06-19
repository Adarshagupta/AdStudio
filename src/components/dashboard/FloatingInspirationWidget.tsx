"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { InspirationFeed } from "@/components/dashboard/InspirationFeed";
import { FEATURED_INSPIRATION_VIDEOS } from "@/lib/inspiration-videos";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "dashboard-inspiration-widget-dismissed";
const AUTO_SCROLL_MS = 5000;

export function FloatingInspirationWidget() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState(true);
  const [paused, setPaused] = useState(false);
  const [entered, setEntered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
    requestAnimationFrame(() => setEntered(true));
  }, []);

  const dismiss = useCallback(() => {
    setEntered(false);
    window.setTimeout(() => setDismissed(true), 200);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const closeExpanded = useCallback(() => {
    setExpanded(false);
  }, []);

  useEffect(() => {
    if (dismissed || paused || expanded) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % FEATURED_INSPIRATION_VIDEOS.length);
    }, AUTO_SCROLL_MS);

    return () => window.clearInterval(timer);
  }, [dismissed, paused, expanded]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || expanded) return;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }, [activeIndex, expanded]);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  if (dismissed) return null;

  const src = FEATURED_INSPIRATION_VIDEOS[activeIndex]!;

  return (
    <>
      <div
        className={cn(
          "pointer-events-none fixed bottom-4 right-4 z-40 hidden md:block md:right-6",
          entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
          "transition-all duration-300 ease-out",
        )}
      >
        <div
          className="pointer-events-auto group relative w-[132px] overflow-hidden rounded-2xl border border-zinc-200/80 bg-zinc-950 shadow-[0_12px_40px_rgba(15,23,42,0.22)] ring-1 ring-zinc-900/5"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <button
            type="button"
            onClick={dismiss}
            className="absolute right-1.5 top-1.5 z-10 rounded-full bg-black/50 p-1 text-white/70 opacity-0 backdrop-blur-sm transition hover:bg-black/70 hover:text-white group-hover:opacity-100"
            aria-label="Hide inspiration feed"
          >
            <X className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="group relative block aspect-[9/16] w-full overflow-hidden bg-zinc-900 text-left"
            aria-label="Open inspiration feed"
          >

            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -24, opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <video
                  ref={videoRef}
                  src={src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                  preload="metadata"
                />
              </motion.div>
            </AnimatePresence>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 pt-8">
              <p className="text-[10px] font-medium text-white/90">Tap to explore</p>
              <div className="mt-1.5 flex justify-center gap-1">
                {FEATURED_INSPIRATION_VIDEOS.map((_, index) => (
                  <span
                    key={index}
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      index === activeIndex ? "w-3 bg-violet-400" : "w-1 bg-white/35",
                    )}
                  />
                ))}
              </div>
            </div>
          </button>
        </div>
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {expanded && (
              <motion.div
                className="fixed inset-0 z-[100] bg-black"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <motion.div
                  className="h-full w-full"
                  initial={{ scale: 0.92, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 320, damping: 32 }}
                >
                  <InspirationFeed initialIndex={activeIndex} onClose={closeExpanded} />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { InspirationVideo } from "@/components/dashboard/InspirationVideo";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TypeBadge } from "@/components/shared/TypeBadge";
import { GenerationVideoPreview } from "@/components/shared/GenerationVideoPreview";
import type { GenerationListItem } from "@/lib/generation-types";
import { FEATURED_INSPIRATION_VIDEOS } from "@/lib/inspiration-videos";
import { cn } from "@/lib/utils";

export const FEATURED_VIDEOS = FEATURED_INSPIRATION_VIDEOS;

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 15,
      mass: 0.8,
    },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export function RecentGrid({
  generations,
  inspiration,
}: {
  generations: GenerationListItem[];
  inspiration: GenerationListItem[];
}) {
  const [activeTab, setActiveTab] = useState<"recent" | "inspiration">("inspiration");
  const display = activeTab === "recent" ? generations : inspiration;

  const empty = activeTab === "recent" && generations.length === 0;

  return (
    <section className="space-y-5">
      <motion.div
        className="flex items-center gap-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <motion.button
          type="button"
          className={cn(
            "text-sm transition-colors",
            activeTab === "recent" ? "font-medium text-zinc-900" : "text-zinc-400 hover:text-zinc-600",
          )}
          onClick={() => setActiveTab("recent")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Recent creations
        </motion.button>
        <motion.button
          type="button"
          className={cn(
            "text-sm transition-colors",
            activeTab === "inspiration"
              ? "font-medium text-zinc-900"
              : "text-zinc-400 hover:text-zinc-600",
          )}
          onClick={() => setActiveTab("inspiration")}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Inspiration
        </motion.button>
      </motion.div>
      {activeTab === "inspiration" && (
        <motion.div
          className="mb-6 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Hover to hear audio
              </span>
            </div>
            <Link
              href="/inspiration"
              className="text-xs font-medium text-violet-600 transition hover:text-violet-800"
            >
              Open full feed →
            </Link>
          </div>
          <motion.div
            className="grid grid-cols-3 gap-3"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {FEATURED_VIDEOS.map((url, i) => (
              <motion.div key={i} variants={cardVariants}>
                <InspirationVideo src={url} index={i} />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
      {empty ? (
        <motion.div
          className="rounded-3xl bg-zinc-100/70 px-8 py-16 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
        >
          <h3 className="font-display text-2xl font-semibold text-zinc-900">No generations yet</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Create your first video and it will appear here.
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {display.map((creation, index) => (
            <motion.div
              key={creation.id}
              variants={cardVariants}
              whileHover={{
                scale: 1.02,
                y: -4,
                transition: { type: "spring", stiffness: 400, damping: 10 },
              }}
              whileTap={{
                scale: 0.97,
                transition: { type: "spring", stiffness: 500, damping: 10 },
              }}
            >
              <Link
                href={`/generations/${creation.id}`}
                className="group block overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200/80 transition-all duration-200 hover:ring-zinc-300"
              >
                <div className="p-2">
                  <GenerationVideoPreview
                    type={creation.type}
                    outputType={creation.outputType}
                    index={index}
                    videoUrl={creation.videoUrl}
                    thumbnailUrl={creation.thumbnailUrl}
                    status={creation.status}
                    className="rounded-2xl"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-4 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge type={creation.type} />
                    <StatusBadge status={creation.status} />
                  </div>
                  <p className="shrink-0 text-xs text-zinc-400">{creation.timestamp}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}

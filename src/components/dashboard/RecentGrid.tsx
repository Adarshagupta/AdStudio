"use client";

import Link from "next/link";
import { useState } from "react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { TypeBadge } from "@/components/shared/TypeBadge";
import { GenerationVideoPreview } from "@/components/shared/GenerationVideoPreview";
import type { GenerationListItem } from "@/lib/generation-types";
import { cn } from "@/lib/utils";

export function RecentGrid({
  generations,
  inspiration,
}: {
  generations: GenerationListItem[];
  inspiration: GenerationListItem[];
}) {
  const [activeTab, setActiveTab] = useState<"recent" | "inspiration">("recent");
  const display = activeTab === "recent" ? generations : inspiration;

  const empty = activeTab === "recent" && generations.length === 0;

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-6">
        <button
          type="button"
          className={cn(
            "text-sm transition-colors",
            activeTab === "recent" ? "font-medium text-zinc-900" : "text-zinc-400 hover:text-zinc-600",
          )}
          onClick={() => setActiveTab("recent")}
        >
          Recent creations
        </button>
        <button
          type="button"
          className={cn(
            "text-sm transition-colors",
            activeTab === "inspiration"
              ? "font-medium text-zinc-900"
              : "text-zinc-400 hover:text-zinc-600",
          )}
          onClick={() => setActiveTab("inspiration")}
        >
          Inspiration
        </button>
      </div>
      {empty ? (
        <div className="rounded-3xl bg-zinc-100/70 px-8 py-16 text-center">
          <h3 className="font-display text-2xl font-semibold text-zinc-900">No generations yet</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Create your first video and it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {display.map((creation, index) => (
          <Link
            key={creation.id}
            href={`/generations/${creation.id}`}
            className="group overflow-hidden rounded-3xl bg-white ring-1 ring-zinc-200/80 transition-all duration-200 hover:ring-zinc-300"
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
        ))}
      </div>
      )}
    </section>
  );
}

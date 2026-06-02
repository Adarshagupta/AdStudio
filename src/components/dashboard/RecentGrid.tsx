"use client";

import Link from "next/link";
import { useState } from "react";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { TypeBadge } from "@/components/shared/TypeBadge";
import { VideoThumbnail } from "@/components/shared/VideoThumbnail";
import type { GenerationListItem } from "@/lib/generation-types";
import { cn } from "@/lib/utils";

export function RecentGrid({ generations }: { generations: GenerationListItem[] }) {
  const [activeTab, setActiveTab] = useState<"recent" | "inspiration">("recent");

  if (generations.length === 0) {
    return (
      <section className="space-y-5">
        <div className="flex items-center gap-6">
          <button
            type="button"
            className="text-sm font-medium text-zinc-900"
            onClick={() => setActiveTab("recent")}
          >
            Recent creations
          </button>
          <button
            type="button"
            className="text-sm text-zinc-400"
            onClick={() => setActiveTab("inspiration")}
          >
            Inspiration
          </button>
        </div>
        <div className="rounded-3xl bg-zinc-100/70 px-8 py-16 text-center">
          <h3 className="font-display text-2xl font-semibold text-zinc-900">No generations yet</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Create your first video and it will appear here.
          </p>
        </div>
      </section>
    );
  }

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {generations.map((creation, index) => (
          <Link
            key={creation.id}
            href={`/generations/${creation.id}`}
            className="group overflow-hidden rounded-3xl bg-zinc-100/50 transition-all duration-200 hover:bg-zinc-100/80"
          >
            <div className="relative p-2">
              <VideoThumbnail type={creation.type} index={index} className="rounded-2xl" />
              <div className="absolute left-5 top-5">
                <span className="rounded-full bg-purple-100 px-2.5 py-1 text-[10px] font-medium text-purple-800">
                  {creation.title}
                </span>
              </div>
            </div>
            <div className="space-y-2 px-4 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={creation.type} />
                <StatusBadge status={creation.status} />
              </div>
              <p className="text-xs text-zinc-500">{creation.timestamp}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

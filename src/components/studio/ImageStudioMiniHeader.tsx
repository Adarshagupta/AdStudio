"use client";

import Link from "next/link";
import { ChevronLeft, Download, MessageCircle, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ImageStudioMiniHeader({
  creditsRemaining,
  zoom,
  agentOpen,
  onToggleAgent,
  onZoomIn,
  onZoomOut,
  onExport,
}: {
  creditsRemaining: number;
  zoom: number;
  agentOpen: boolean;
  onToggleAgent: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onExport: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-40 px-3">
      <div className="pointer-events-auto mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white/95 px-3 py-2 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/studio/image"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Back to Image Studio"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-900">Image Studio</p>
            <p className="truncate text-[11px] text-zinc-400">{creditsRemaining} credits</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn("h-9 w-9 rounded-xl", agentOpen && "bg-zinc-100 text-zinc-900")}
            onClick={onToggleAgent}
            aria-label="Toggle agent"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          <div className="mx-1 hidden h-6 w-px bg-zinc-100 sm:block" />
          <button
            type="button"
            onClick={onZoomOut}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[44px] text-center text-xs font-medium text-zinc-600">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={onZoomIn}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
          <Button size="sm" className="ml-1 gap-1.5 rounded-xl bg-zinc-900" onClick={onExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}

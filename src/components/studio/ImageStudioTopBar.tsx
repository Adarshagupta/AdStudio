"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  Layers,
  MoreHorizontal,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ImageStudioTopBar({
  onExport,
  onExportJpeg,
  onNewCanvas,
  onImport,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  zoom,
  canvasWidth,
  canvasHeight,
  creditsRemaining,
  showLayersPanel,
  showAIPanel,
  onToggleLayers,
  onToggleAI,
}: {
  onExport: () => void;
  onExportJpeg: () => void;
  onNewCanvas: () => void;
  onImport: (file: File) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
  creditsRemaining: number;
  showLayersPanel: boolean;
  showAIPanel: boolean;
  onToggleLayers: () => void;
  onToggleAI: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-zinc-100 bg-white/90 px-4 backdrop-blur-md">
      <Link
        href="/studio/image"
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Back</span>
      </Link>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-900">Editor</p>
        <p className="truncate text-xs text-zinc-400">
          {canvasWidth} × {canvasHeight} · {creditsRemaining} credits
        </p>
      </div>

      <div className="hidden items-center gap-0.5 rounded-full bg-zinc-100 p-0.5 md:flex">
        <button
          type="button"
          onClick={onZoomOut}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition hover:bg-white hover:text-zinc-900"
          aria-label="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onZoomReset}
          className="min-w-[52px] px-2 text-xs font-medium text-zinc-600 transition hover:text-zinc-900"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-600 transition hover:bg-white hover:text-zinc-900"
          aria-label="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9 rounded-full", showLayersPanel && "bg-zinc-100 text-zinc-900")}
          onClick={onToggleLayers}
          aria-label="Toggle layers"
        >
          <Layers className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn("h-9 w-9 rounded-full", showAIPanel && "bg-violet-100 text-violet-700")}
          onClick={onToggleAI}
          aria-label="Toggle AI tools"
        >
          <Sparkles className="h-4 w-4" />
        </Button>

        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="More actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {menuOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-30"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-40 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-100 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  onClick={() => {
                    onNewCanvas();
                    setMenuOpen(false);
                  }}
                >
                  New canvas
                </button>
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setMenuOpen(false);
                  }}
                >
                  Import image
                </button>
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                  onClick={() => {
                    onExportJpeg();
                    setMenuOpen(false);
                  }}
                >
                  Export JPEG
                </button>
              </div>
            </>
          ) : null}
        </div>

        <Button size="sm" className="gap-1.5 rounded-full bg-zinc-900 px-4" onClick={onExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImport(file);
          event.target.value = "";
        }}
      />
    </header>
  );
}

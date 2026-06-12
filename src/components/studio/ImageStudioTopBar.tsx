"use client";

import { motion } from "framer-motion";
import {
  Download,
  FileImage,
  ImagePlus,
  ZoomIn,
  ZoomOut,
  Maximize,
  ChevronLeft,
  Upload,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";

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
  onResizeCanvas,
  creditsRemaining,
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
  onResizeCanvas: (w: number, h: number) => void;
  creditsRemaining: number;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResize, setShowResize] = useState(false);
  const [newWidth, setNewWidth] = useState(canvasWidth);
  const [newHeight, setNewHeight] = useState(canvasHeight);

  return (
    <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
      <Link href="/studio/image">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="ghost" size="sm" className="gap-1 text-zinc-600">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </motion.div>
      </Link>

      <div className="mx-2 h-5 w-px bg-zinc-200" />

      <Button variant="ghost" size="sm" className="gap-1 text-zinc-600" onClick={onNewCanvas}>
        <FileImage className="h-4 w-4" />
        New
      </Button>

      <label className="cursor-pointer">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImport(file);
          }}
        />
        <Button variant="ghost" size="sm" className="gap-1 text-zinc-600" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </label>

      <div className="relative">
        <Button variant="ghost" size="sm" className="gap-1 text-zinc-600" onClick={() => setShowResize(!showResize)}>
          <Maximize className="h-4 w-4" />
          Resize
        </Button>
        {showResize && (
          <div className="absolute top-full left-0 z-50 mt-1 flex items-center gap-2 rounded-lg border bg-white p-2 shadow-lg">
            <input
              type="number"
              value={newWidth}
              onChange={(e) => setNewWidth(Number(e.target.value))}
              className="w-16 rounded border border-zinc-200 px-2 py-1 text-sm"
            />
            <span className="text-zinc-400">×</span>
            <input
              type="number"
              value={newHeight}
              onChange={(e) => setNewHeight(Number(e.target.value))}
              className="w-16 rounded border border-zinc-200 px-2 py-1 text-sm"
            />
            <Button size="sm" onClick={() => { onResizeCanvas(newWidth, newHeight); setShowResize(false); }}>
              Apply
            </Button>
          </div>
        )}
      </div>

      <div className="mx-2 h-5 w-px bg-zinc-200" />

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600" onClick={onZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center text-xs text-zinc-500">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600" onClick={onZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600" onClick={onZoomReset}>
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1 rounded-md bg-zinc-50 px-2 py-1 text-xs text-zinc-500">
        <CreditCard className="h-3 w-3" />
        {creditsRemaining} credits
      </div>

      <div className="mx-2 h-5 w-px bg-zinc-200" />

      <Button variant="outline" size="sm" className="gap-1" onClick={onExportJpeg}>
        <ImagePlus className="h-4 w-4" />
        JPEG
      </Button>
      <Button size="sm" className="gap-1 bg-zinc-900" onClick={onExport}>
        <Download className="h-4 w-4" />
        Export PNG
      </Button>
    </div>
  );
}

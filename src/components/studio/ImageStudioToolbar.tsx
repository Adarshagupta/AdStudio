"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Circle,
  Eraser,
  Minus,
  MousePointerClick,
  Pencil,
  Pipette,
  Square,
  Type,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { StudioTool } from "./image-studio-types";

const primaryTools = [
  { id: "select" as StudioTool, icon: MousePointerClick, label: "Select" },
  { id: "brush" as StudioTool, icon: Pencil, label: "Brush" },
  { id: "eraser" as StudioTool, icon: Eraser, label: "Eraser" },
  { id: "text" as StudioTool, icon: Type, label: "Text" },
  { id: "rectangle" as StudioTool, icon: Square, label: "Shape" },
  { id: "line" as StudioTool, icon: Minus, label: "Line" },
  { id: "circle" as StudioTool, icon: Circle, label: "Circle" },
  { id: "eyedropper" as StudioTool, icon: Pipette, label: "Pick color" },
];

const swatches = ["#000000", "#ffffff", "#ef4444", "#3b82f6", "#a855f7", "#22c55e"];

export function ImageStudioToolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  brushSize,
  onBrushSizeChange,
  opacity,
  onOpacityChange,
  fontSize,
  onFontSizeChange,
}: {
  tool: StudioTool;
  onToolChange: (t: StudioTool) => void;
  color: string;
  onColorChange: (c: string) => void;
  brushSize: number;
  onBrushSizeChange: (s: number) => void;
  opacity: number;
  onOpacityChange: (o: number) => void;
  fontSize: number;
  onFontSizeChange: (s: number) => void;
}) {
  const showBrushSettings =
    tool === "brush" ||
    tool === "eraser" ||
    tool === "rectangle" ||
    tool === "circle" ||
    tool === "line";
  const showTextSettings = tool === "text";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 px-4 pb-5">
      <AnimatePresence>
        {(showBrushSettings || showTextSettings) && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto flex max-w-full flex-wrap items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white/95 px-4 py-2.5 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-md"
          >
            {showBrushSettings ? (
              <>
                <label className="flex items-center gap-2 text-xs text-zinc-500">
                  Size
                  <input
                    type="range"
                    min={1}
                    max={80}
                    value={brushSize}
                    onChange={(event) => onBrushSizeChange(Number(event.target.value))}
                    className="w-24 accent-zinc-900"
                  />
                  <span className="w-5 text-zinc-700">{brushSize}</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-500">
                  Opacity
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={opacity}
                    onChange={(event) => onOpacityChange(Number(event.target.value))}
                    className="w-24 accent-zinc-900"
                  />
                </label>
              </>
            ) : null}
            {showTextSettings ? (
              <label className="flex items-center gap-2 text-xs text-zinc-500">
                Font size
                <input
                  type="range"
                  min={12}
                  max={96}
                  value={fontSize}
                  onChange={(event) => onFontSizeChange(Number(event.target.value))}
                  className="w-28 accent-zinc-900"
                />
                <span className="w-6 text-zinc-700">{fontSize}</span>
              </label>
            ) : null}
            <div className="flex items-center gap-1.5">
              {swatches.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => onColorChange(swatch)}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition",
                    color === swatch ? "border-zinc-900 scale-110" : "border-transparent",
                  )}
                  style={{ backgroundColor: swatch }}
                  aria-label={`Color ${swatch}`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(event) => onColorChange(event.target.value)}
                className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                aria-label="Custom color"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        layout
        className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-zinc-200/80 bg-white/95 p-1.5 shadow-[0_12px_40px_rgba(15,23,42,0.1)] backdrop-blur-md [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {primaryTools.map((item) => {
          const active = tool === item.id;
          return (
            <button
              key={item.id}
              type="button"
              title={item.label}
              onClick={() => onToolChange(item.id)}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition",
                active
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
              )}
            >
              <item.icon className="h-4 w-4" />
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}

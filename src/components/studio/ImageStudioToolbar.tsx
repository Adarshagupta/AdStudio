"use client";

import { motion } from "framer-motion";
import {
  MousePointerClick,
  Pencil,
  Eraser,
  Square,
  Circle,
  Minus,
  MoveRight,
  Type,
  Crop,
  Pipette,
  Shapes,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StudioTool } from "./ImageStudioWorkspace";
import { useState } from "react";

const tools = [
  { id: "select" as StudioTool, icon: MousePointerClick, label: "Select" },
  { id: "brush" as StudioTool, icon: Pencil, label: "Brush" },
  { id: "eraser" as StudioTool, icon: Eraser, label: "Eraser" },
  { id: "rectangle" as StudioTool, icon: Square, label: "Rect" },
  { id: "circle" as StudioTool, icon: Circle, label: "Circle" },
  { id: "line" as StudioTool, icon: Minus, label: "Line" },
  { id: "arrow" as StudioTool, icon: MoveRight, label: "Arrow" },
  { id: "text" as StudioTool, icon: Type, label: "Text" },
  { id: "crop" as StudioTool, icon: Crop, label: "Crop" },
  { id: "eyedropper" as StudioTool, icon: Pipette, label: "Pick" },
  { id: "shape" as StudioTool, icon: Shapes, label: "Shapes" },
];

const colors = [
  "#000000", "#ffffff", "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#78716c",
  "#1e293b", "#f8fafc", "#dc2626", "#ea580c", "#ca8a04",
  "#16a34a", "#2563eb", "#7c3aed", "#db2777", "#57534e",
];

const fontFamilies = [
  "sans-serif",
  "serif",
  "monospace",
  "Arial",
  "Georgia",
  "Courier New",
  "Times New Roman",
  "Verdana",
];

const fontWeights = [
  { label: "Normal", value: "normal" },
  { label: "Bold", value: "bold" },
  { label: "Light", value: "300" },
];

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
  fontFamily,
  onFontFamilyChange,
  fontWeight,
  onFontWeightChange,
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
  fontFamily: string;
  onFontFamilyChange: (f: string) => void;
  fontWeight: string;
  onFontWeightChange: (w: string) => void;
}) {
  const [customColor, setCustomColor] = useState(color);

  const showBrushSettings = tool === "brush" || tool === "eraser" || tool === "rectangle" || tool === "circle" || tool === "line" || tool === "arrow";
  const showTextSettings = tool === "text";

  return (
    <div className="flex w-[220px] flex-col border-r border-zinc-200 bg-white overflow-y-auto">
      <div className="p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Tools</h3>
        <div className="grid grid-cols-3 gap-1">
          {tools.map((t) => (
            <motion.button
              key={t.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToolChange(t.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md p-2 transition-colors",
                tool === t.id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              )}
              title={t.label}
            >
              <t.icon className="h-4 w-4" />
              <span className="text-[10px]">{t.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-200 p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Colors</h3>
        <div className="grid grid-cols-5 gap-1">
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => onColorChange(c)}
              className={cn(
                "h-6 w-6 rounded-full border transition-transform",
                color === c ? "scale-110 border-zinc-400" : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value);
              onColorChange(e.target.value);
            }}
            className="h-6 w-6 cursor-pointer rounded border-0 p-0"
          />
          <span className="text-xs text-zinc-500">Custom</span>
        </div>
      </div>

      {showBrushSettings && (
        <div className="border-t border-zinc-200 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Brush</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 text-xs text-zinc-500">Size</span>
              <input
                type="range"
                min={1}
                max={100}
                value={brushSize}
                onChange={(e) => onBrushSizeChange(Number(e.target.value))}
                className="flex-1 accent-zinc-900"
              />
              <span className="w-6 text-right text-xs text-zinc-500">{brushSize}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-8 text-xs text-zinc-500">Opac</span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={opacity}
                onChange={(e) => onOpacityChange(Number(e.target.value))}
                className="flex-1 accent-zinc-900"
              />
              <span className="w-6 text-right text-xs text-zinc-500">{Math.round(opacity * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {showTextSettings && (
        <div className="border-t border-zinc-200 p-3">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">Text</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-8 text-xs text-zinc-500">Size</span>
              <input
                type="range"
                min={8}
                max={120}
                value={fontSize}
                onChange={(e) => onFontSizeChange(Number(e.target.value))}
                className="flex-1 accent-zinc-900"
              />
              <span className="w-6 text-right text-xs text-zinc-500">{fontSize}</span>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Font</span>
              <select
                value={fontFamily}
                onChange={(e) => onFontFamilyChange(e.target.value)}
                className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              >
                {fontFamilies.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-zinc-500">Weight</span>
              <select
                value={fontWeight}
                onChange={(e) => onFontWeightChange(e.target.value)}
                className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              >
                {fontWeights.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  Layers,
  ChevronUp,
  ChevronDown,
  Merge,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Layer } from "./ImageStudioWorkspace";

export function ImageStudioLayersPanel({
  layers,
  activeLayerId,
  onLayerSelect,
  onLayerAdd,
  onLayerDelete,
  onLayerUpdate,
  onLayerReorder,
  onLayerDuplicate,
  onMergeVisible,
}: {
  layers: Layer[];
  activeLayerId: string | null;
  onLayerSelect: (id: string) => void;
  onLayerAdd: () => void;
  onLayerDelete: (id: string) => void;
  onLayerUpdate: (id: string, updates: Partial<Omit<Layer, "canvas">>) => void;
  onLayerReorder: (id: string, direction: "up" | "down") => void;
  onLayerDuplicate: (id: string) => void;
  onMergeVisible: () => void;
}) {
  return (
    <div className="flex w-[240px] flex-col border-l border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-semibold text-zinc-700">Layers</span>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onLayerAdd}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
            title="Add layer"
          >
            <Plus className="h-4 w-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onMergeVisible}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100"
            title="Merge visible"
          >
            <Merge className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {[...layers].reverse().map((layer) => {
          const isActive = layer.id === activeLayerId;
          return (
            <div
              key={layer.id}
              onClick={() => onLayerSelect(layer.id)}
              className={cn(
                "flex items-center gap-2 border-b border-zinc-100 px-3 py-2 cursor-pointer transition-colors",
                isActive ? "bg-zinc-100" : "hover:bg-zinc-50"
              )}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLayerUpdate(layer.id, { visible: !layer.visible });
                }}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-zinc-600",
                  !layer.visible && "opacity-50"
                )}
              >
                {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className={cn("text-sm truncate", isActive ? "font-medium text-zinc-900" : "text-zinc-600")}>
                    {layer.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={layer.opacity}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onLayerUpdate(layer.id, { opacity: Number(e.target.value) })}
                    className="w-16 accent-zinc-900"
                  />
                  <span className="text-[10px] text-zinc-400 w-7">{Math.round(layer.opacity * 100)}%</span>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerReorder(layer.id, "up");
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                  title="Move up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerReorder(layer.id, "down");
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                  title="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerUpdate(layer.id, { locked: !layer.locked });
                  }}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100",
                    layer.locked && "text-zinc-900"
                  )}
                  title={layer.locked ? "Unlock" : "Lock"}
                >
                  {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerDuplicate(layer.id);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                  title="Duplicate"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerDelete(layer.id);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-400 hover:text-red-500 hover:bg-red-50"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Circle,
  Eraser,
  Hand,
  Layers,
  Loader2,
  MessageCircle,
  Minus,
  MousePointerClick,
  Pencil,
  Pipette,
  Square,
  Trash2,
  Type,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { StudioTool } from "./image-studio-types";

const designTools = [
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

export function ImageStudioFloatingToolbar({
  prompt,
  onPromptChange,
  onPromptSubmit,
  isSubmitting,
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
  agentOpen,
  onToggleAgent,
  layersOpen,
  onToggleLayers,
  disabled = false,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onPromptSubmit: () => void;
  isSubmitting?: boolean;
  tool: StudioTool;
  onToolChange: (tool: StudioTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  agentOpen: boolean;
  onToggleAgent: () => void;
  layersOpen: boolean;
  onToggleLayers: () => void;
  disabled?: boolean;
}) {
  const showBrushSettings =
    tool === "brush" ||
    tool === "eraser" ||
    tool === "rectangle" ||
    tool === "circle" ||
    tool === "line";
  const showTextSettings = tool === "text";

  return (
    <div
      className="pointer-events-auto w-full max-w-3xl px-4"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-white/95 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-md">
        <div className="flex items-end gap-2 border-b border-zinc-100 px-3 py-2.5">
          <Textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onPromptSubmit();
              }
            }}
            disabled={disabled || isSubmitting}
            rows={1}
            placeholder="Describe your ad creative — style, product, background, or ask the agent…"
            className="min-h-[40px] flex-1 resize-none border-0 bg-transparent px-0 py-1.5 text-sm leading-5 text-zinc-800 shadow-none placeholder:text-zinc-400 focus-visible:ring-0"
          />
          <Button
            type="button"
            size="icon"
            disabled={disabled || isSubmitting || !prompt.trim()}
            onClick={onPromptSubmit}
            className="h-9 w-9 shrink-0 rounded-full bg-zinc-900 text-white hover:bg-zinc-800"
            aria-label="Send prompt"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>

        {(showBrushSettings || showTextSettings) && (
          <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-3 py-2 text-xs text-zinc-500">
            {showBrushSettings ? (
              <>
                <label className="flex items-center gap-2">
                  Size
                  <input
                    type="range"
                    min={1}
                    max={80}
                    value={brushSize}
                    onChange={(event) => onBrushSizeChange(Number(event.target.value))}
                    className="w-20 accent-zinc-900"
                  />
                </label>
                <label className="flex items-center gap-2">
                  Opacity
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={opacity}
                    onChange={(event) => onOpacityChange(Number(event.target.value))}
                    className="w-20 accent-zinc-900"
                  />
                </label>
              </>
            ) : null}
            {showTextSettings ? (
              <label className="flex items-center gap-2">
                Font
                <input
                  type="range"
                  min={12}
                  max={96}
                  value={fontSize}
                  onChange={(event) => onFontSizeChange(Number(event.target.value))}
                  className="w-24 accent-zinc-900"
                />
              </label>
            ) : null}
            <div className="flex items-center gap-1.5">
              {swatches.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => onColorChange(swatch)}
                  className={cn(
                    "h-5 w-5 rounded-full border-2",
                    color === swatch ? "border-zinc-900" : "border-transparent",
                  )}
                  style={{ backgroundColor: swatch }}
                  aria-label={`Color ${swatch}`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(event) => onColorChange(event.target.value)}
                className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
                aria-label="Custom color"
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-1 px-2 py-2">
          <div className="flex items-center gap-0.5">
            <ToolbarIconButton
              label="Agent"
              icon={MessageCircle}
              active={agentOpen}
              onClick={onToggleAgent}
            />
            <ToolbarIconButton label="Pan" icon={Hand} active={false} onClick={() => onToolChange("select")} />
            <ToolbarIconButton
              label="Layers"
              icon={Layers}
              active={layersOpen}
              onClick={onToggleLayers}
            />
          </div>

          <div className="mx-1 hidden h-6 w-px bg-zinc-100 sm:block" />

          <div className="flex flex-wrap items-center gap-0.5">
            {designTools.map((item) => (
              <ToolbarIconButton
                key={item.id}
                label={item.label}
                icon={item.icon}
                active={tool === item.id}
                onClick={() => onToolChange(item.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarIconButton({
  label,
  icon: Icon,
  onClick,
  active = false,
}: {
  label: string;
  icon: typeof Pencil;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900",
        active && "bg-zinc-100 text-zinc-900",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function ImageStudioAgentPanel({
  messages,
  isBusy,
  onSubmit,
  onClear,
  onClose,
  onStarterSelect,
}: {
  messages: Array<{ id: string; role: "user" | "assistant"; content: string; imageUrl?: string }>;
  isBusy: boolean;
  onSubmit: (prompt: string) => void;
  onClear: () => void;
  onClose: () => void;
  onStarterSelect: (prompt: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const starters = [
    "Generate a product poster with bold typography",
    "Remove the background from this image",
    "Upscale and sharpen for paid social",
    "Expand canvas to 9:16 story format",
  ];

  function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed || isBusy) return;
    onSubmit(trimmed);
    setDraft("");
  }

  return (
    <aside className="flex h-full w-full min-w-0 flex-col bg-white">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-100 px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-900">Agent</p>
            <p className="text-[10px] text-zinc-500">Design & edit for you</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClear}
            disabled={messages.length === 0 || isBusy}
            aria-label="Clear chat"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} aria-label="Close agent">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm leading-6 text-zinc-600">
              Tell the agent what to create or edit. It can generate ad creatives, remove backgrounds, upscale, and
              apply results to your canvas.
            </p>
            <div className="flex flex-wrap gap-2">
              {starters.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => onStarterSelect(starter)}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-left text-xs text-zinc-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={cn(message.role === "user" ? "flex justify-end" : "flex justify-start")}>
              <div
                className={cn(
                  "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-6",
                  message.role === "user"
                    ? "rounded-br-md bg-zinc-900 text-white"
                    : "rounded-bl-md bg-zinc-100 text-zinc-700",
                )}
              >
                {message.content}
                {message.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={message.imageUrl}
                    alt=""
                    className="mt-2 max-h-40 w-full rounded-lg border border-zinc-200 object-contain bg-white"
                  />
                ) : null}
              </div>
            </div>
          ))
        )}
        {isBusy ? (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Working on your image…
          </div>
        ) : null}
      </div>

      <div className="border-t border-zinc-100 p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            disabled={isBusy}
            rows={2}
            placeholder="Ask the agent…"
            className="min-h-[44px] resize-none text-sm"
          />
          <Button
            type="button"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full bg-zinc-900"
            disabled={isBusy || !draft.trim()}
            onClick={handleSubmit}
            aria-label="Send"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </aside>
  );
}

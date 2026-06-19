"use client";

import {
  ArrowUp,
  CalendarClock,
  FileText,
  Hand,
  Image as ImageIcon,
  LayoutTemplate,
  Loader2,
  MessageCircle,
  MousePointer2,
  Music2,
  Settings2,
  Share2,
  SlidersHorizontal,
  Upload,
  UserRound,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { StudioNodeType } from "@/lib/studio-pro/types";
import { cn } from "@/lib/utils";

export type StudioCanvasTool = "select" | "pan";

type ToolButton = {
  id: string;
  label: string;
  icon: typeof ImageIcon;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

export function StudioFloatingToolbar({
  prompt,
  onPromptChange,
  onPromptSubmit,
  isSubmitting,
  canvasTool,
  onCanvasToolChange,
  agentOpen,
  onToggleAgent,
  inspectorOpen,
  onToggleInspector,
  hasSelectedNode,
  onAddNode,
  onOpenTemplates,
  disabled = false,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onPromptSubmit: () => void;
  isSubmitting?: boolean;
  canvasTool: StudioCanvasTool;
  onCanvasToolChange: (tool: StudioCanvasTool) => void;
  agentOpen: boolean;
  onToggleAgent: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  hasSelectedNode: boolean;
  onAddNode: (type: StudioNodeType) => void;
  onOpenTemplates: () => void;
  disabled?: boolean;
}) {
  const nodeTools: { type: StudioNodeType; label: string; icon: typeof ImageIcon }[] = [
    { type: "image", label: "Image", icon: ImageIcon },
    { type: "video", label: "Video", icon: Video },
    { type: "audio", label: "Text to speech", icon: Music2 },
    { type: "prompt", label: "Text", icon: FileText },
    { type: "character", label: "Character", icon: UserRound },
    { type: "schedule", label: "Schedule", icon: CalendarClock },
    { type: "social", label: "Social", icon: Share2 },
  ];

  const utilityTools: ToolButton[] = [
    {
      id: "templates",
      label: "Templates",
      icon: LayoutTemplate,
      onClick: onOpenTemplates,
    },
    {
      id: "inspector",
      label: "Node settings",
      icon: SlidersHorizontal,
      onClick: onToggleInspector,
      active: inspectorOpen,
      disabled: !hasSelectedNode,
    },
    {
      id: "settings",
      label: "Canvas settings",
      icon: Settings2,
      onClick: onToggleInspector,
      active: inspectorOpen,
      disabled: !hasSelectedNode,
    },
    {
      id: "upload",
      label: "Upload assets",
      icon: Upload,
      onClick: () => onAddNode("image"),
    },
  ];

  return (
    <div
      className="studio-flows-toolbar pointer-events-auto w-full max-w-2xl px-4"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="studio-toolbar overflow-hidden rounded-2xl border border-zinc-200/90 bg-card/95 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/95">
        <div className="flex items-end gap-2 border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-800">
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
            placeholder={
              hasSelectedNode
                ? "Describe changes for the selected node…"
                : "Describe your ad flow — hook, product, style, or ask the agent…"
            }
            className="min-h-[40px] flex-1 resize-none border-0 bg-transparent px-0 py-1.5 text-sm leading-5 text-foreground shadow-none placeholder:text-zinc-400 focus-visible:ring-0 dark:text-zinc-100"
          />
          <Button
            type="button"
            size="icon"
            disabled={disabled || isSubmitting || !prompt.trim()}
            onClick={onPromptSubmit}
            className="h-9 w-9 shrink-0 rounded-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-foreground"
            aria-label="Send prompt"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-1 px-2 py-2">
          <div className="flex items-center gap-0.5">
            <FlowsToolButton
              label="Select"
              icon={MousePointer2}
              active={canvasTool === "select"}
              onClick={() => onCanvasToolChange("select")}
              disabled={disabled}
            />
            <FlowsToolButton
              label="Pan"
              icon={Hand}
              active={canvasTool === "pan"}
              onClick={() => onCanvasToolChange("pan")}
              disabled={disabled}
            />
            <FlowsToolButton
              label="Agent chat"
              icon={MessageCircle}
              active={agentOpen}
              onClick={onToggleAgent}
              disabled={disabled}
            />
          </div>

          <div className="mx-1 hidden h-6 w-px bg-zinc-100 sm:block dark:bg-zinc-800" />

          <div className="flex flex-wrap items-center gap-0.5">
            {nodeTools.map((tool) => (
              <FlowsToolButton
                key={tool.type}
                label={tool.label}
                icon={tool.icon}
                onClick={() => onAddNode(tool.type)}
                disabled={disabled}
              />
            ))}
          </div>

          <div className="mx-1 hidden h-6 w-px bg-zinc-100 sm:block dark:bg-zinc-800" />

          <div className="flex items-center gap-0.5">
            {utilityTools.map((tool) => (
              <FlowsToolButton
                key={tool.id}
                label={tool.label}
                icon={tool.icon}
                active={tool.active}
                disabled={disabled || tool.disabled}
                onClick={tool.onClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowsToolButton({
  label,
  icon: Icon,
  onClick,
  active = false,
  disabled = false,
}: {
  label: string;
  icon: typeof ImageIcon;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-foreground disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
        active && "bg-zinc-100 text-foreground dark:bg-zinc-800 dark:text-zinc-100",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

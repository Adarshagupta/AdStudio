"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Image as ImageIcon,
  Loader2,
  Music2,
  Play,
  UserRound,
  Video,
  Zap,
} from "lucide-react";

import { StudioMediaPreview } from "@/components/studio-pro/StudioMediaPreview";
import { getNodeHeight, type StudioNode, type StudioNodeType } from "@/lib/studio-pro/types";
import { cn } from "@/lib/utils";

const icons: Record<StudioNodeType, typeof FileText> = {
  prompt: FileText,
  character: UserRound,
  image: ImageIcon,
  audio: Music2,
  video: Video,
};

export function StudioNodeCard({
  node,
  selected,
  connectingFrom,
  snapTargetId,
  dragging,
  hasIncomingConnection,
  animateEnter,
  onSelect,
  onDragStart,
  onPortPointerDown,
  onPortPointerUp,
  onMediaDimensions,
  onRunNode,
  onContextMenu,
  onEnterAnimated,
  isRunningFlow,
}: {
  node: StudioNode;
  selected: boolean;
  connectingFrom: string | null;
  snapTargetId: string | null;
  dragging: boolean;
  hasIncomingConnection: boolean;
  animateEnter: boolean;
  onSelect: () => void;
  onDragStart: (event: React.PointerEvent) => void;
  onPortPointerDown: (nodeId: string, side: "input" | "output", event: React.PointerEvent) => void;
  onPortPointerUp: (nodeId: string, side: "input" | "output", event: React.PointerEvent) => void;
  onMediaDimensions?: (width: number, height: number) => void;
  onRunNode: () => void;
  onContextMenu: (event: React.MouseEvent) => void;
  onEnterAnimated?: (nodeId: string) => void;
  isRunningFlow: boolean;
}) {
  const Icon = icons[node.type];
  const isRunning = node.data.status === "running";
  const isSnapTarget = snapTargetId === node.id;
  const canReceiveConnection = Boolean(connectingFrom && connectingFrom !== node.id);
  const cardHeight = getNodeHeight(node);
  const [showEnter] = useState(animateEnter);

  useEffect(() => {
    if (!showEnter) return;
    onEnterAnimated?.(node.id);
  }, [node.id, onEnterAnimated, showEnter]);

  const stackZIndex = dragging ? node.zIndex + 1000 : node.zIndex;

  return (
    <div
      className={cn(
        "absolute overflow-visible",
        showEnter && "studio-node-enter",
        dragging && "studio-node-dragging scale-[1.02]",
        !dragging && "transition-[transform] duration-200",
      )}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: cardHeight,
        zIndex: stackZIndex,
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        onSelect();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu(event);
      }}
    >
      <button
        type="button"
        data-studio-port="input"
        data-node-id={node.id}
        aria-label={`Input port for ${node.title}`}
        title={hasIncomingConnection ? "Click to disconnect incoming" : "Input port"}
        className={cn(
          "studio-port absolute left-0 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all touch-none",
          "h-4 w-4 border-2 bg-white",
          hasIncomingConnection && !canReceiveConnection && !isSnapTarget
            ? "border-purple-400 bg-purple-50"
            : null,
          canReceiveConnection || isSnapTarget
            ? "scale-125 border-purple-500 bg-purple-50 shadow-[0_0_0_6px_rgba(124,58,237,0.12)]"
            : "border-zinc-300 hover:scale-110 hover:border-purple-400",
        )}
        onPointerDown={(event) => {
          event.stopPropagation();
          onPortPointerDown(node.id, "input", event);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          onPortPointerUp(node.id, "input", event);
        }}
      />
      <button
        type="button"
        data-studio-port="output"
        data-node-id={node.id}
        aria-label={`Output port for ${node.title}`}
        title="Drag to an input port"
        className={cn(
          "studio-port absolute right-0 top-1/2 z-30 -translate-y-1/2 translate-x-1/2 rounded-full transition-all touch-none",
          "h-4 w-4 border-2 bg-white",
          connectingFrom === node.id
            ? "scale-125 border-purple-500 bg-purple-500 shadow-[0_0_0_6px_rgba(124,58,237,0.15)]"
            : "border-zinc-300 hover:scale-110 hover:border-purple-400",
        )}
        onPointerDown={(event) => {
          event.stopPropagation();
          onPortPointerDown(node.id, "output", event);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          onPortPointerUp(node.id, "output", event);
        }}
      />

      <div
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]",
          selected && "border-purple-300 ring-2 ring-purple-100",
          !selected && "border-zinc-200 hover:border-zinc-300",
          isRunning && "studio-node-running",
          node.data.status === "done" && "studio-node-done",
          node.data.status === "failed" && "border-red-300",
          dragging && "cursor-grabbing shadow-[0_16px_48px_rgba(124,58,237,0.15)]",
          isSnapTarget && "ring-2 ring-purple-200",
          !dragging && "transition-[box-shadow,border-color] duration-200",
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center gap-2 border-b border-zinc-100 px-3 py-2.5",
            dragging ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing",
          )}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            if ((event.target as HTMLElement).closest("[data-studio-no-drag]")) return;
            event.stopPropagation();
            onSelect();
            onDragStart(event);
          }}
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50">
            <Icon className="h-3.5 w-3.5 text-purple-700" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-medium text-zinc-900">{node.title}</p>
            <p className="truncate text-[11px] text-zinc-500">{node.subtitle}</p>
          </div>
          {isRunning ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running
            </span>
          ) : null}
          {node.data.status === "done" ? (
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-700">Done</span>
          ) : null}
          {node.data.status === "failed" ? (
            <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-600">Failed</span>
          ) : null}
          <button
            type="button"
            data-studio-no-drag
            disabled={isRunningFlow || isRunning}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRunNode();
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-purple-700 disabled:opacity-40"
            aria-label={`Run ${node.title}`}
          >
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="overflow-hidden p-3">
          {renderNodePreview(node, onMediaDimensions)}
          {node.data.error ? (
            <p className="mt-2 line-clamp-3 rounded-lg bg-red-50 px-2 py-1.5 text-[11px] leading-4 text-red-600">
              {node.data.error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function renderNodePreview(
  node: StudioNode,
  onMediaDimensions?: (width: number, height: number) => void,
) {
  if (node.type === "image" || node.type === "video") {
    return <StudioMediaPreview node={node} onDimensions={onMediaDimensions} />;
  }

  if (node.type === "prompt") {
    const text = node.data.output || node.data.scriptText || node.data.prompt;
    return (
      <PreviewPanel empty={!text} emptyLabel="Click to edit prompt">
        {text ? <p className="line-clamp-4 text-xs leading-5 text-zinc-700">{text}</p> : null}
      </PreviewPanel>
    );
  }

  if (node.type === "character") {
    const name = node.data.characterName?.trim() || "Unnamed character";
    const output = node.data.output;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-50 text-sm font-semibold text-purple-700">
            {name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-900">{name}</p>
            <p className="truncate text-[11px] text-zinc-500">{node.data.prompt?.trim() || "Click to edit"}</p>
          </div>
        </div>
        {output ? (
          <p className="line-clamp-4 rounded-lg bg-emerald-50/80 px-2.5 py-2 text-[11px] leading-4 text-zinc-700">
            {output}
          </p>
        ) : null}
      </div>
    );
  }

  if (node.type === "audio") {
    const title = node.data.audioTitle?.trim() || "Untitled track";
    const voice = node.data.voiceStyle?.trim() || "Default voice";

    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white">
            <Play className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-zinc-900">{title}</p>
            <p className="truncate text-[11px] text-zinc-500">{voice}</p>
          </div>
        </div>
        {node.data.audioUrl ? (
          <audio src={node.data.audioUrl} controls className="w-full" onPointerDown={(event) => event.stopPropagation()} />
        ) : (
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
            <div
              className={cn(
                "h-full rounded-full bg-purple-500 transition-all duration-700",
                node.data.status === "running" ? "studio-audio-wave w-full" : "w-2/5",
              )}
            />
          </div>
        )}
      </div>
    );
  }

  return null;
}

function PreviewPanel({
  children,
  empty,
  emptyLabel,
}: {
  children: React.ReactNode;
  empty: boolean;
  emptyLabel: string;
}) {
  return (
    <div className="min-h-[56px] rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
      {empty ? <p className="text-xs italic text-zinc-400">{emptyLabel}</p> : children}
    </div>
  );
}

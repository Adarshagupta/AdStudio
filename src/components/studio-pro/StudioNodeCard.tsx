"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  FileText,
  Image as ImageIcon,
  Loader2,
  Music2,
  Play,
  Share2,
  UserRound,
  Video,
} from "lucide-react";

import { StudioMediaPreview } from "@/components/studio-pro/StudioMediaPreview";
import { StudioNodePromptBar } from "@/components/studio-pro/StudioNodePromptBar";
import { studioNodeDisplayText } from "@/lib/studio-pro/display-text";
import { getNodeHeight, type StudioNode, type StudioNodeData, type StudioNodeType } from "@/lib/studio-pro/types";
import { cn } from "@/lib/utils";

const editableNodeTypes = new Set<StudioNodeType>(["prompt", "character", "image", "audio", "video", "schedule", "social"]);

const icons: Record<StudioNodeType, typeof FileText> = {
  prompt: FileText,
  character: UserRound,
  image: ImageIcon,
  audio: Music2,
  video: Video,
  schedule: CalendarClock,
  social: Share2,
};

const typeAccent: Record<StudioNodeType, string> = {
  prompt: "text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-300",
  character: "text-pink-600 bg-pink-50 dark:bg-pink-950/40 dark:text-pink-300",
  image: "text-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300",
  audio: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300",
  video: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300",
  schedule: "text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300",
  social: "text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300",
};

function nodeModelLabel(node: StudioNode) {
  return node.subtitle?.trim() || node.data.model?.split("/").pop() || node.title;
}

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
  onChange,
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
  onChange?: (data: Partial<StudioNodeData>) => void;
}) {
  const Icon = icons[node.type];
  const isRunning = node.data.status === "running";
  const isSnapTarget = snapTargetId === node.id;
  const canReceiveConnection = Boolean(connectingFrom && connectingFrom !== node.id);
  const showPromptBar = Boolean(onChange) && editableNodeTypes.has(node.type);
  const cardHeight = getNodeHeight(node);
  const [showEnter] = useState(animateEnter);
  const modelLabel = nodeModelLabel(node);

  useEffect(() => {
    if (!showEnter) return;
    onEnterAnimated?.(node.id);
  }, [node.id, onEnterAnimated, showEnter]);

  const stackZIndex = dragging ? node.zIndex + 1000 : node.zIndex;

  function handleDragPointerDown(event: React.PointerEvent) {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("[data-studio-no-drag]")) return;
    event.stopPropagation();
    onSelect();
    onDragStart(event);
  }

  return (
    <div
      data-studio-node
      className={cn(
        "absolute overflow-visible",
        showEnter && "studio-node-enter",
        dragging && "studio-node-dragging scale-[1.02]",
        !dragging && "transition-[transform,height] duration-200",
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
      onWheel={(event) => event.stopPropagation()}
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
          "h-4 w-4 border-2 bg-white dark:bg-zinc-900",
          hasIncomingConnection && !canReceiveConnection && !isSnapTarget
            ? "border-purple-400 bg-purple-50 dark:bg-purple-950/50"
            : null,
          canReceiveConnection || isSnapTarget
            ? "scale-125 border-purple-500 bg-purple-50 shadow-[0_0_0_6px_rgba(124,58,237,0.12)] dark:bg-purple-950/50"
            : "border-zinc-300 hover:scale-110 hover:border-purple-400 dark:border-zinc-600",
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
          "h-4 w-4 border-2 bg-white dark:bg-zinc-900",
          connectingFrom === node.id
            ? "scale-125 border-purple-500 bg-purple-500 shadow-[0_0_0_6px_rgba(124,58,237,0.15)]"
            : "border-zinc-300 hover:scale-110 hover:border-purple-400 dark:border-zinc-600",
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
          "absolute inset-x-0 -top-7 z-20 flex items-center gap-1.5",
          dragging ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing",
        )}
        onPointerDown={handleDragPointerDown}
      >
        <div
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900",
            typeAccent[node.type],
          )}
          title={node.title}
        >
          <Icon className="h-3 w-3" />
        </div>
        <span className="min-w-0 truncate text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
          {modelLabel}
        </span>
        {isRunning ? (
          <Loader2 className="h-3 w-3 shrink-0 animate-spin text-zinc-500" aria-label="Running" />
        ) : node.data.status === "done" ? (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-label="Done" />
        ) : node.data.status === "failed" ? (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" aria-label="Failed" />
        ) : (
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" aria-hidden />
        )}
      </div>

      <div
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_10px_36px_rgba(15,23,42,0.1)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_10px_36px_rgba(0,0,0,0.35)]",
          selected && "border-zinc-400 ring-2 ring-zinc-200 dark:border-zinc-500 dark:ring-zinc-800",
          !selected && "border-zinc-200/90 hover:border-zinc-300 dark:hover:border-zinc-600",
          isRunning && "studio-node-running",
          node.data.status === "done" && "studio-node-done",
          node.data.status === "failed" && "border-red-300",
          dragging && "cursor-grabbing shadow-[0_16px_48px_rgba(124,58,237,0.15)]",
          isSnapTarget && "ring-2 ring-purple-200",
          !dragging && "transition-[box-shadow,border-color] duration-200",
        )}
        onPointerDown={handleDragPointerDown}
      >
        <div className="studio-node-body min-h-0 flex-1 overflow-y-auto overscroll-contain p-2.5">
          {renderNodePreview(node, onMediaDimensions)}
          {node.data.error ? (
            <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-[11px] leading-4 text-red-600">
              {node.data.error}
            </p>
          ) : null}
        </div>

        {showPromptBar && onChange ? (
          <StudioNodePromptBar
            node={node}
            onChange={onChange}
            onRun={onRunNode}
            isRunning={isRunning}
            runDisabled={isRunningFlow}
          />
        ) : null}
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
    const prompt = node.data.prompt?.trim() ?? "";
    const generated = (node.data.output || node.data.scriptText || "").trim();
    const generatedText = generated ? studioNodeDisplayText({ type: "prompt", data: { output: generated } }) : "";
    const hasGenerated = Boolean(generatedText && generatedText !== prompt);

    return (
      <PreviewPanel empty={!hasGenerated && !generatedText} emptyLabel="Output appears here after you run">
        {hasGenerated ? (
          <div className="space-y-2">
            {prompt ? (
              <div>
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">Brief</p>
                <p className="max-h-28 overflow-y-auto whitespace-pre-wrap text-[11px] leading-[1.45] text-zinc-500 dark:text-zinc-400">
                  {prompt}
                </p>
              </div>
            ) : null}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Generated
              </p>
              <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-[1.45] text-zinc-700 dark:text-zinc-300">
                {generatedText}
              </p>
            </div>
          </div>
        ) : prompt || generatedText ? (
          <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-[1.45] text-zinc-700 dark:text-zinc-300">
            {generatedText || prompt}
          </p>
        ) : null}
      </PreviewPanel>
    );
  }

  if (node.type === "character") {
    const name = node.data.characterName?.trim() || "Unnamed character";
    const brief = node.data.prompt?.trim();
    const output = studioNodeDisplayText(node);

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 p-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-50 text-sm font-semibold text-purple-700">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-tight text-zinc-900">{name}</p>
            {brief ? (
              <p className="mt-0.5 max-h-24 overflow-y-auto whitespace-pre-wrap text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                {brief}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] italic text-zinc-400">Add a brief below</p>
            )}
          </div>
        </div>
        {output ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2">
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Profile</p>
            <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-[11px] leading-[1.45] text-zinc-700 dark:text-zinc-300">
              {output}
            </p>
          </div>
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

  if (node.type === "schedule") {
    const interval = node.data.scheduleInterval ?? 60;
    const enabled = node.data.scheduleEnabled ?? false;
    const nextRun = node.data.scheduleNextRun ? new Date(node.data.scheduleNextRun).toLocaleString() : "Not set";

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-2.5">
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", enabled ? "bg-rose-100 text-rose-600" : "bg-zinc-100 text-zinc-500")}>
            <CalendarClock className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900">{enabled ? "Active" : "Paused"}</p>
            <p className="text-[11px] text-zinc-500">Every {interval} min</p>
          </div>
        </div>
        <p className="text-[10px] text-zinc-400">Next run: {nextRun}</p>
      </div>
    );
  }

  if (node.type === "social") {
    const provider = node.data.socialProvider ?? "instagram";
    const caption = node.data.socialCaption?.trim();
    const postUrl = node.data.socialPostUrl;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600">
            <Share2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900 capitalize">{provider}</p>
            <p className="text-[11px] text-zinc-500">{postUrl ? "Posted" : "Ready to post"}</p>
          </div>
        </div>
        {caption ? (
          <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-[11px] leading-4 text-zinc-600 dark:text-zinc-300">{caption}</p>
        ) : null}
        {postUrl ? (
          <a href={postUrl} target="_blank" rel="noreferrer" className="text-[11px] text-violet-600 underline" onPointerDown={(event) => event.stopPropagation()}>
            View post
          </a>
        ) : null}
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

"use client";

import { Loader2, Zap } from "lucide-react";

import type { StudioNode, StudioNodeData, StudioNodeType } from "@/lib/studio-pro/types";
import { cn } from "@/lib/utils";

const promptPlaceholders: Record<StudioNodeType, string> = {
  prompt: "What should this text node generate?",
  character: "Character brief…",
  image: "Describe the image…",
  video: "Shot notes for this clip…",
  audio: "Speech script…",
  schedule: "Schedule note…",
  social: "Post brief…",
};

export function StudioNodePromptBar({
  node,
  onChange,
  onRun,
  isRunning,
  runDisabled,
}: {
  node: StudioNode;
  onChange: (data: Partial<StudioNodeData>) => void;
  onRun: () => void;
  isRunning: boolean;
  runDisabled: boolean;
}) {
  const prompt = node.data.prompt ?? "";

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (!runDisabled && !isRunning) onRun();
    }
  }

  return (
    <div
      className="flex shrink-0 items-end gap-1.5 border-t border-zinc-100 bg-zinc-50/60 p-2 dark:border-zinc-800 dark:bg-zinc-900/60"
      data-studio-no-drag
      onPointerDown={(event) => event.stopPropagation()}
    >
      <textarea
        value={prompt}
        onChange={(event) => onChange({ prompt: event.target.value })}
        onKeyDown={handleKeyDown}
        rows={2}
        placeholder={promptPlaceholders[node.type]}
        className="min-h-[2.5rem] flex-1 resize-none rounded-lg border border-zinc-200/90 bg-white px-2 py-1.5 text-[11px] leading-4 text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500"
      />
      <button
        type="button"
        disabled={runDisabled || isRunning}
        onClick={(event) => {
          event.stopPropagation();
          onRun();
        }}
        className={cn(
          "flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg bg-zinc-900 px-2.5 text-[11px] font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
        )}
        aria-label={`Run ${node.title}`}
        title="Run (⌘↵)"
      >
        {isRunning ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <Zap className="h-3.5 w-3.5" />
            <span>Run</span>
          </>
        )}
      </button>
    </div>
  );
}

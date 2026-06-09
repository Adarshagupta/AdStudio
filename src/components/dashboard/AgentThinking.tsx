"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function AgentThinking({ text, steps }: { text?: string; steps?: string[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1.5 text-left"
      >
        <Sparkles className="h-3 w-3 text-zinc-400" />
        <span className="text-xs text-zinc-400">{text ?? "Thinking…"}</span>
        <span className="inline-flex gap-0.5">
          <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
          <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
        </span>
        {steps && steps.length > 0 && (
          <ChevronDown className={cn("h-3 w-3 text-zinc-400 transition-transform", expanded && "rotate-180")} />
        )}
      </button>

      {expanded && steps && steps.length > 0 && (
        <div className="mt-1 space-y-0.5 border-l border-zinc-200 pl-2">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-zinc-400">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-zinc-300" />
              {step}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

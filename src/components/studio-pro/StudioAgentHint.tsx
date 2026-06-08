"use client";

import { X } from "lucide-react";

export function StudioAgentHint({
  onDismiss,
  onTry,
}: {
  onDismiss: () => void;
  onTry: () => void;
}) {
  return (
    <div className="studio-agent-hint-enter">
      <div className="relative max-w-[200px] rounded-xl border border-zinc-200 bg-white px-3 py-2.5 shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:border-zinc-700 dark:bg-zinc-900 dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-1.5 top-1.5 rounded-md p-0.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Dismiss agent hint"
        >
          <X className="h-3 w-3" />
        </button>
        <button type="button" onClick={onTry} className="pr-5 text-left">
          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Try agent mode</p>
          <p className="mt-0.5 text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
            Describe what you want — AI builds the flow for you.
          </p>
        </button>
        <span
          className="absolute -bottom-1.5 left-7 h-3 w-3 rotate-45 border-b border-r border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
          aria-hidden
        />
      </div>
    </div>
  );
}

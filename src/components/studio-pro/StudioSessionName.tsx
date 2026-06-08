"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import { saveStudioFlow } from "@/lib/studio-pro/flow-client";
import {
  displayStudioFlowName,
  isPlaceholderStudioFlowName,
} from "@/lib/studio-pro/session-name";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";

type StudioSessionNameProps = {
  flowId: string;
  initialName: string;
  variant?: "header" | "list";
  className?: string;
};

export function StudioSessionName({
  flowId,
  initialName,
  variant = "header",
  className,
}: StudioSessionNameProps) {
  const [savedName, setSavedName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedName(initialName);
    if (!isEditing) {
      setDraft(initialName);
    }
  }, [initialName, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const commit = useCallback(async () => {
    setIsEditing(false);
    const trimmed = draft.trim();
    const nextName = trimmed || "Untitled flow";

    if (nextName === savedName.trim() || (!trimmed && isPlaceholderStudioFlowName(savedName))) {
      setDraft(savedName);
      return;
    }

    setIsSaving(true);
    try {
      await saveStudioFlow(flowId, { name: nextName });
      setSavedName(nextName);
      setDraft(nextName);
    } catch (error) {
      setDraft(savedName);
      notify.error(error instanceof Error ? error.message : "Could not rename session.");
    } finally {
      setIsSaving(false);
    }
  }, [draft, flowId, savedName]);

  const startEditing = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDraft(savedName);
    setIsEditing(true);
  };

  const displayName = displayStudioFlowName(savedName);
  const looksUntitled = isPlaceholderStudioFlowName(savedName);

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void commit();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(savedName);
            setIsEditing(false);
          }
        }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        maxLength={120}
        disabled={isSaving}
        placeholder="Session name"
        className={cn(
          "rounded-lg border border-purple-200 bg-white px-2 py-1 text-zinc-900 outline-none ring-2 ring-purple-100 focus:border-purple-300 dark:border-purple-800 dark:bg-zinc-950 dark:text-zinc-100 dark:ring-purple-950",
          variant === "header" ? "font-display text-sm font-semibold" : "text-sm font-medium",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      onPointerDown={(event) => event.stopPropagation()}
      title="Click to rename"
      className={cn(
        "group/name inline-flex max-w-full items-center gap-1.5 rounded-lg px-1 py-0.5 text-left transition hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80",
        className,
      )}
    >
      <span
        className={cn(
          "truncate",
          variant === "header"
            ? "font-display text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            : "font-medium text-zinc-900 dark:text-zinc-100",
          looksUntitled && "text-zinc-500 dark:text-zinc-400",
        )}
      >
        {displayName}
      </span>
      <Pencil
        className={cn(
          "shrink-0 text-zinc-400 transition-opacity",
          variant === "header" ? "h-3.5 w-3.5" : "h-3 w-3",
          "opacity-0 group-hover/name:opacity-100",
        )}
      />
    </button>
  );
}

"use client";

import Link from "next/link";
import {
  ChevronDown,
  ChevronLeft,
  Cloud,
  Film,
  FolderOpen,
  HelpCircle,
  LayoutTemplate,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  Share2,
  Upload,
  Undo2,
  Workflow,
} from "lucide-react";

import { StudioCollaboratorBar } from "@/components/studio-pro/StudioCollaboratorBar";
import { StudioSessionName } from "@/components/studio-pro/StudioSessionName";
import { Button } from "@/components/ui/button";
import type { StudioCollaborator } from "@/hooks/useStudioCollaboration";
import { cn } from "@/lib/utils";

const islandClass =
  "flex h-11 items-center gap-2 rounded-2xl border border-zinc-200/90 bg-white/95 px-3 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/95 md:px-3.5";

function SaveIndicator({ state }: { state: "saved" | "saving" | "error" }) {
  if (state === "saved") {
    return (
      <span className="hidden items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 sm:inline-flex">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Saved
      </span>
    );
  }

  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500">
        <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
        Saving
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-red-600">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      Save failed
    </span>
  );
}

export function StudioProHeader({
  sessionId,
  flowName,
  saveState,
  copiedLink,
  zoom,
  collaborators,
  connection,
  agentOpen,
  onZoomIn,
  onZoomOut,
  onToggleAgent,
  onCopyLink,
  onPublishTemplate,
  onExportLongForm,
  longFormExportState = "idle",
  longFormExportUrl,
  canExportLongForm = false,
}: {
  sessionId: string;
  flowName: string;
  saveState: "saved" | "saving" | "error";
  copiedLink: boolean;
  zoom: number;
  collaborators: StudioCollaborator[];
  connection: "connecting" | "live" | "polling" | "offline";
  agentOpen: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleAgent: () => void;
  onCopyLink: () => void;
  onPublishTemplate?: () => void;
  onExportLongForm?: () => void;
  longFormExportState?: "idle" | "exporting";
  longFormExportUrl?: string | null;
  canExportLongForm?: boolean;
}) {
  const exportingLongForm = longFormExportState === "exporting";
  const exportTitle = longFormExportUrl
    ? "Open long-form export"
    : canExportLongForm
      ? "Export long-form video"
      : "Generate at least two completed video nodes to export long-form";

  return (
    <div className="studio-pro-header flex w-full items-start justify-between gap-3">
      <header className={cn(islandClass, "min-w-0 max-w-[min(100%,28rem)]")}>
        <Link
          href="/studio-pro"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          aria-label="Back to sessions"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>

        <div className="hidden h-4 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700 sm:block" aria-hidden />

        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
            <Workflow className="h-4 w-4 text-zinc-500" />
            <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Flows</span>
          </div>
          <div className="hidden h-4 w-px shrink-0 bg-zinc-200 dark:bg-zinc-700 sm:block" aria-hidden />
          <StudioSessionName flowId={sessionId} initialName={flowName} variant="header" />
          <SaveIndicator state={saveState} />
        </div>
      </header>

      <header className={cn(islandClass, "shrink-0 gap-1 md:gap-1.5")}>
        <div className="hidden items-center rounded-lg border border-zinc-200 bg-zinc-50/80 p-0.5 sm:flex dark:border-zinc-700 dark:bg-zinc-900">
          <Button variant="ghost" size="icon" onClick={onZoomOut} className="h-7 w-7 rounded-md">
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-10 px-1 text-center text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={onZoomIn} className="h-7 w-7 rounded-md">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <ChevronDown className="mr-1 h-3.5 w-3.5 text-zinc-400" />
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 text-zinc-500 sm:inline-flex"
          aria-label="Undo"
          disabled
        >
          <Undo2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 text-zinc-500 lg:inline-flex"
          aria-label="Help"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" className="hidden h-8 w-8 text-zinc-500 md:inline-flex" aria-label="Cloud sync">
          <Cloud className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" className="hidden h-8 w-8 text-zinc-500 md:inline-flex" aria-label="Assets">
          <FolderOpen className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleAgent}
          className={cn(
            "h-8 w-8 rounded-lg text-zinc-500",
            agentOpen && "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100",
          )}
          aria-label={agentOpen ? "Close agent" : "Open agent"}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>

        <StudioCollaboratorBar collaborators={collaborators} connection={connection} />

        <div className="hidden h-4 w-px bg-zinc-200 dark:bg-zinc-700 md:block" aria-hidden />

        <Button
          variant="ghost"
          size="icon"
          asChild
          className="h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          <Link href="/studio-pro/marketplace" aria-label="Template marketplace" title="Template marketplace">
            <LayoutTemplate className="h-4 w-4" />
          </Link>
        </Button>

        {onPublishTemplate ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onPublishTemplate}
            className="hidden h-8 w-8 rounded-lg text-zinc-500 md:inline-flex dark:text-zinc-400"
            aria-label="Publish as template"
            title="Publish as template"
          >
            <Upload className="h-4 w-4" />
          </Button>
        ) : null}

        {onExportLongForm ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onExportLongForm}
            disabled={exportingLongForm || (!canExportLongForm && !longFormExportUrl)}
            className="hidden h-8 w-8 rounded-lg text-zinc-500 md:inline-flex dark:text-zinc-400"
            aria-label={exportTitle}
            title={exportTitle}
          >
            {exportingLongForm ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
          </Button>
        ) : null}

        <Button
          variant="ghost"
          size="icon"
          onClick={onCopyLink}
          className="h-8 w-8 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          title={copiedLink ? "Link copied" : "Copy share link"}
          aria-label={copiedLink ? "Link copied" : "Copy share link"}
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </header>
    </div>
  );
}

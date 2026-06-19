"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { FolderOpen, HardDrive, X } from "lucide-react";

import { cn } from "@/lib/utils";

export function AssetSourceDialog({
  open,
  onClose,
  title,
  subtitle,
  onChooseLibrary,
  onChooseComputer,
  showLibrary = true,
  presentation = "modal",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onChooseLibrary: () => void;
  onChooseComputer: () => void;
  showLibrary?: boolean;
  presentation?: "modal" | "fullscreen";
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open || !mounted) return null;

  const fullscreen = presentation === "fullscreen";

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[200] flex bg-black/50 backdrop-blur-sm",
        fullscreen ? "flex-col" : "items-center justify-center p-4",
      )}
      onPointerDown={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="asset-source-title"
        className={cn(
          "flex flex-col bg-background shadow-2xl",
          fullscreen
            ? "h-full w-full"
            : "w-full max-w-sm overflow-hidden rounded-2xl border border-border",
        )}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p id="asset-source-title" className="text-base font-semibold text-foreground">
              {title}
            </p>
            {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={cn("flex flex-1 flex-col gap-3 p-5", fullscreen && "justify-center")}>
          {showLibrary ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onChooseLibrary();
              }}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left transition hover:border-primary/30 hover:bg-muted/40"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FolderOpen className="h-6 w-6" />
              </span>
              <div>
                <span className="block text-base font-medium text-foreground">Your assets</span>
                <span className="text-sm text-muted-foreground">Pick from library</span>
              </div>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onClose();
              onChooseComputer();
            }}
            className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 text-left transition hover:border-primary/30 hover:bg-muted/40"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HardDrive className="h-6 w-6" />
            </span>
            <div>
              <span className="block text-base font-medium text-foreground">This device</span>
              <span className="text-sm text-muted-foreground">Browse files</span>
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

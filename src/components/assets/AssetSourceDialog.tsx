"use client";

import { FolderOpen, HardDrive, X } from "lucide-react";

export function AssetSourceDialog({
  open,
  onClose,
  title,
  subtitle,
  onChooseLibrary,
  onChooseComputer,
  showLibrary = true,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onChooseLibrary: () => void;
  onChooseComputer: () => void;
  showLibrary?: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/30 p-4"
      onPointerDown={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="asset-source-title"
        className="w-full max-w-xs overflow-hidden rounded-xl bg-white shadow-lg"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p id="asset-source-title" className="text-sm font-medium text-zinc-900">
              {title}
            </p>
            {subtitle ? <p className="text-xs text-zinc-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 transition hover:text-zinc-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-t border-zinc-100">
          {showLibrary ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onChooseLibrary();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
            >
              <FolderOpen className="h-4 w-4 text-zinc-500" />
              <div>
                <span className="block text-sm text-zinc-900">Your assets</span>
                <span className="text-xs text-zinc-500">Pick from library</span>
              </div>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              onClose();
              onChooseComputer();
            }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-50"
          >
            <HardDrive className="h-4 w-4 text-zinc-500" />
            <div>
              <span className="block text-sm text-zinc-900">This device</span>
              <span className="text-xs text-zinc-500">Browse files</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

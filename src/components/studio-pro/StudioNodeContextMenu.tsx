"use client";

import { useEffect } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";

export function StudioNodeContextMenu({
  x,
  y,
  canBringForward,
  canSendBackward,
  onDelete,
  onBringForward,
  onSendBackward,
  onClose,
}: {
  x: number;
  y: number;
  canBringForward: boolean;
  canSendBackward: boolean;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[3000]"
      onPointerDown={onClose}
      onContextMenu={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div
        className="absolute min-w-[180px] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-[0_12px_40px_rgba(15,23,42,0.12)]"
        style={{ left: x, top: y }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <ContextMenuItem
          icon={Trash2}
          label="Delete"
          destructive
          onClick={() => {
            onDelete();
            onClose();
          }}
        />
        <div className="my-1 h-px bg-zinc-100" />
        <ContextMenuItem
          icon={ArrowUp}
          label="Bring forward"
          disabled={!canBringForward}
          onClick={() => {
            onBringForward();
            onClose();
          }}
        />
        <ContextMenuItem
          icon={ArrowDown}
          label="Send backward"
          disabled={!canSendBackward}
          onClick={() => {
            onSendBackward();
            onClose();
          }}
        />
      </div>
    </div>,
    document.body,
  );
}

function ContextMenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: typeof Trash2;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 data-[destructive=true]:text-red-600 data-[destructive=true]:hover:bg-red-50"
      data-destructive={destructive || undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

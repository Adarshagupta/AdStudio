"use client";

import { useEffect } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";

export function StudioNodeContextMenu({
  x,
  y,
  isDark = false,
  canBringForward,
  canSendBackward,
  onDelete,
  onBringForward,
  onSendBackward,
  onClose,
}: {
  x: number;
  y: number;
  isDark?: boolean;
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
        className={`absolute min-w-[180px] overflow-hidden rounded-xl border py-1 shadow-[0_12px_40px_rgba(15,23,42,0.12)] ${
          isDark
            ? "border-zinc-700 bg-zinc-900 shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
            : "border-zinc-200 bg-white"
        }`}
        style={{ left: x, top: y }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <ContextMenuItem
          icon={Trash2}
          label="Delete"
          isDark={isDark}
          destructive
          onClick={() => {
            onDelete();
            onClose();
          }}
        />
        <div className={`my-1 h-px ${isDark ? "bg-zinc-700" : "bg-zinc-100"}`} />
        <ContextMenuItem
          icon={ArrowUp}
          label="Bring forward"
          isDark={isDark}
          disabled={!canBringForward}
          onClick={() => {
            onBringForward();
            onClose();
          }}
        />
        <ContextMenuItem
          icon={ArrowDown}
          label="Send backward"
          isDark={isDark}
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
  isDark = false,
}: {
  icon: typeof Trash2;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  isDark?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 data-[destructive=true]:text-red-600 ${
        isDark
          ? "text-zinc-200 hover:bg-zinc-800 data-[destructive=true]:hover:bg-red-950/50"
          : "text-zinc-700 hover:bg-zinc-50 data-[destructive=true]:hover:bg-red-50"
      }`}
      data-destructive={destructive || undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </button>
  );
}

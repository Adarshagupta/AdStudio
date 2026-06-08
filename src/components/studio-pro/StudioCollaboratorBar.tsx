"use client";

import type { StudioCollaborator } from "@/hooks/useStudioCollaboration";
import { cn } from "@/lib/utils";

export function StudioCollaboratorBar({
  collaborators,
  connection,
}: {
  collaborators: StudioCollaborator[];
  connection: "connecting" | "live" | "polling" | "offline";
}) {
  if (collaborators.length === 0 && connection !== "connecting") {
    return (
      <div
        className="hidden items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 lg:flex"
        title={
          connection === "live"
            ? "Live — open in another tab to collaborate"
            : connection === "polling"
              ? "Syncing"
              : "Offline"
        }
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            connection === "live"
              ? "bg-zinc-800 dark:bg-zinc-300"
              : connection === "polling"
                ? "bg-zinc-400"
                : "bg-zinc-300 dark:bg-zinc-600",
          )}
        />
        {connection === "live" ? "Live" : connection === "polling" ? "Syncing" : null}
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-1.5 lg:flex">
      <div className="flex -space-x-2">
        {collaborators.slice(0, 5).map((collaborator) => (
          <span
            key={collaborator.userId}
            title={collaborator.name}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white"
            style={{ backgroundColor: collaborator.color }}
          >
            {initials(collaborator.name)}
          </span>
        ))}
        {collaborators.length > 5 ? (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-zinc-200 text-[10px] font-medium text-zinc-700 dark:border-zinc-900 dark:bg-zinc-700 dark:text-zinc-200">
            +{collaborators.length - 5}
          </span>
        ) : null}
      </div>
      <span
        className={cn(
          "text-[11px] text-zinc-400 dark:text-zinc-500",
          connection === "live" && "text-zinc-700 dark:text-zinc-300",
          connection === "polling" && "text-zinc-500 dark:text-zinc-400",
        )}
      >
        {connection === "live"
          ? `${collaborators.length} online`
          : connection === "polling"
            ? "Syncing"
            : "…"}
      </span>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

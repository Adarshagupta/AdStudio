"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function AvatarPicker({
  avatars,
  selectedAvatarId,
  onSelect,
}: {
  avatars: Array<{
    id: string;
    name: string;
    previewUrl: string;
    isSystem: boolean;
  }>;
  selectedAvatarId: string | null;
  onSelect: (avatarId: string) => void;
}) {
  if (avatars.length === 0) {
    return (
      <div className="rounded-lg border bg-zinc-50 p-4">
        <h3 className="text-sm font-medium">No avatars yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This generation will use text-to-video. Add avatars later from your media workflow.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {avatars.map((avatar) => {
        const isSelected = selectedAvatarId === avatar.id;

        return (
          <button
            key={avatar.id}
            type="button"
            onClick={() => onSelect(avatar.id)}
            className={cn(
              "flex min-h-24 items-center gap-3 rounded-lg border bg-white p-3 text-left transition-all duration-200 hover:border-zinc-300 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              isSelected && "border-purple-600 bg-purple-50/50 ring-1 ring-purple-100",
            )}
          >
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                avatar.isSystem ? "bg-purple-100 text-purple-950" : "bg-zinc-200 text-zinc-900",
              )}
            >
              {getInitials(avatar.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{avatar.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {avatar.isSystem ? "System avatar" : avatar.previewUrl}
              </p>
            </div>
            <div className={cn("flex h-6 w-6 items-center justify-center rounded-full border", isSelected ? "border-purple-200 bg-purple-100" : "border-zinc-200")}>
              {isSelected ? <Check className="h-3.5 w-3.5 text-purple-700" /> : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
